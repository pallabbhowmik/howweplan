/**
 * Event Consumer
 * 
 * Connects to the event bus and processes incoming domain events.
 * Implements reliable message handling with acknowledgments.
 */

import type { Channel, ConsumeMessage } from 'amqplib';
import amqp from 'amqplib';
import { env } from '../config/env';
import { DomainEvent } from './types';
import { getHandler, getRegisteredEventTypes } from './handlers';
import { NotificationService } from '../services/notification.service';
import { AuditService } from '../services/audit.service';
import { logger } from '../utils/logger';

export class EventConsumer {
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: Channel | null = null;
  private readonly notificationService: NotificationService;
  private readonly auditService: AuditService;

  constructor(
    notificationService: NotificationService,
    auditService: AuditService
  ) {
    this.notificationService = notificationService;
    this.auditService = auditService;
  }

  /**
   * Start consuming events from the event bus
   */
  async start(): Promise<void> {
    try {
      logger.info('Connecting to event bus...', { url: this.redactUrl(env.EVENT_BUS_URL) });

      const conn = await amqp.connect(env.EVENT_BUS_URL);
      this.connection = conn;
      this.channel = await conn.createChannel();

      // Set up exchange
      await this.channel.assertExchange(env.EVENT_BUS_EXCHANGE, 'topic', {
        durable: true,
      });

      // Set up queue
      const queue = await this.channel.assertQueue(env.EVENT_BUS_QUEUE, {
        durable: true,
        deadLetterExchange: `${env.EVENT_BUS_EXCHANGE}.dlx`,
      });

      // Bind queue to relevant event types
      const eventTypes = getRegisteredEventTypes();
      for (const eventType of eventTypes) {
        await this.channel.bindQueue(
          queue.queue,
          env.EVENT_BUS_EXCHANGE,
          eventType
        );
        logger.debug('Bound queue to event type', { eventType });
      }

      // Set prefetch for controlled processing
      await this.channel.prefetch(10);

      // Start consuming
      await this.channel.consume(queue.queue, this.handleMessage.bind(this), {
        noAck: false,
      });

      logger.info('Event consumer started', {
        queue: queue.queue,
        boundEvents: eventTypes.length,
      });

      // Handle connection errors
      conn.on('error', (err: Error) => {
        logger.error('Event bus connection error', { error: err.message });
      });

      conn.on('close', () => {
        logger.warn('Event bus connection closed');
      });
    } catch (error) {
      logger.error('Failed to start event consumer', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop consuming events
   */
  async stop(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info('Event consumer stopped');
    } catch (error) {
      logger.error('Error stopping event consumer', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) {
      return;
    }

    const startTime = Date.now();
    let event: DomainEvent | null = null;

    try {
      // Parse message
      event = JSON.parse(msg.content.toString()) as DomainEvent;
      event.timestamp = new Date(event.timestamp);

      logger.debug('Received event', {
        eventId: event.eventId,
        eventType: event.eventType,
        correlationId: event.correlationId,
      });

      // Get handler for event type
      const handler = getHandler(event.eventType);

      if (!handler) {
        logger.warn('No handler registered for event type', {
          eventType: event.eventType,
          eventId: event.eventId,
        });
        // Acknowledge to prevent redelivery of unhandled events
        this.channel.ack(msg);
        return;
      }

      // Execute handler
      await handler(event, this.notificationService, this.auditService);

      // Acknowledge successful processing
      this.channel.ack(msg);

      const duration = Date.now() - startTime;
      logger.info('Event processed successfully', {
        eventId: event.eventId,
        eventType: event.eventType,
        durationMs: duration,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Error processing event', {
        eventId: event?.eventId,
        eventType: event?.eventType,
        error: errorMessage,
      });

      // Reject and requeue for retry (up to a limit)
      const redelivered = msg.fields.redelivered;

      if (redelivered) {
        // Already retried once, send to dead letter queue
        this.channel.reject(msg, false);
        logger.warn('Event sent to dead letter queue', {
          eventId: event?.eventId,
          eventType: event?.eventType,
        });
      } else {
        // First failure, requeue for retry
        this.channel.reject(msg, true);
        logger.warn('Event requeued for retry', {
          eventId: event?.eventId,
          eventType: event?.eventType,
        });
      }
    }
  }

  /**
   * Redact sensitive parts of URL for logging
   */
  private redactUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '***';
      }
      return parsed.toString();
    } catch {
      return '[invalid-url]';
    }
  }
}
