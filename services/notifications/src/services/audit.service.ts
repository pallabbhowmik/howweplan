/**
 * Audit Service
 * 
 * Emits audit events for all notification activities.
 * Every state change MUST emit an audit event (per architecture rules).
 */

import type { Channel } from 'amqplib';
import amqp from 'amqplib';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface AuditLogEntry {
  eventType: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  timestamp?: Date;
}

export interface AuditEvent {
  eventId: string;
  eventType: string;
  version: number;
  timestamp: Date;
  source: string;
  correlationId: string;
  payload: AuditLogEntry;
}

export class AuditService {
  private connection: Awaited<ReturnType<typeof amqp.connect>> | null = null;
  private channel: Channel | null = null;
  private readonly buffer: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize connection to audit event bus
   */
  async initialize(): Promise<void> {
    if (!env.AUDIT_LOG_ENABLED) {
      logger.info('Audit logging disabled');
      return;
    }

    // Skip if EVENT_BUS_URL is not configured
    if (!env.EVENT_BUS_URL || env.EVENT_BUS_URL.trim() === '') {
      logger.warn('EVENT_BUS_URL not configured, audit events will be logged locally only');
      return;
    }

    try {
      const conn = await amqp.connect(env.EVENT_BUS_URL);
      this.connection = conn;
      this.channel = await conn.createChannel();

      await this.channel.assertExchange(env.AUDIT_EVENT_EXCHANGE, 'topic', {
        durable: true,
      });

      // Flush buffer periodically
      this.flushInterval = setInterval(() => this.flush(), 5000);

      logger.info('Audit service initialized');
    } catch (error) {
      logger.error('Failed to initialize audit service', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    if (!env.AUDIT_LOG_ENABLED) {
      return;
    }

    const event: AuditEvent = {
      eventId: this.generateEventId(),
      eventType: `audit.${entry.eventType}`,
      version: 1,
      timestamp: entry.timestamp ?? new Date(),
      source: env.SERVICE_NAME,
      correlationId: entry.correlationId,
      payload: entry,
    };

    // Add to buffer for batch publishing
    this.buffer.push(event);

    // Flush immediately for critical events
    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }

  /**
   * Flush buffered events to the event bus
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.channel) {
      return;
    }

    const eventsToFlush = [...this.buffer];
    this.buffer.length = 0;

    try {
      for (const event of eventsToFlush) {
        this.channel.publish(
          env.AUDIT_EVENT_EXCHANGE,
          event.eventType,
          Buffer.from(JSON.stringify(event)),
          {
            persistent: true,
            contentType: 'application/json',
            messageId: event.eventId,
            correlationId: event.correlationId,
            timestamp: event.timestamp.getTime(),
          }
        );
      }

      logger.debug('Flushed audit events', { count: eventsToFlush.length });
    } catch (error) {
      // Re-add events to buffer on failure
      this.buffer.unshift(...eventsToFlush);
      logger.error('Failed to flush audit events', {
        error: error instanceof Error ? error.message : String(error),
        bufferedCount: this.buffer.length,
      });
    }
  }

  /**
   * Stop the audit service
   */
  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining events
    await this.flush();

    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }

    logger.info('Audit service stopped');
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 11);
    return `audit-${timestamp}-${random}`;
  }
}
