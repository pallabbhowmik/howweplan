import amqp, { type Channel, type ConsumeMessage } from 'amqplib';
import type { Connection as AmqpConnection } from 'amqplib';
import { env } from '../config/env';
import { auditRepository } from '../database/index';
import { CreateAuditEventSchema, type CreateAuditEvent } from '../schema/index';
import { logger } from '../utils/logger';

/**
 * Domain event structure from other services
 */
interface DomainEvent {
  id: string;
  type: string;
  version: string;
  timestamp: string;
  correlationId: string;
  causationId?: string;
  source: {
    service: string;
    version?: string;
  };
  actor: {
    type: string;
    id: string;
    email?: string;
    displayName?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  resource: {
    type: string;
    id: string;
    parentType?: string;
    parentId?: string;
  };
  action: string;
  reason: string;
  payload: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  compliance?: {
    gdprRelevant?: boolean;
    piiContained?: boolean;
    retentionCategory?: string;
  };
}

/**
 * Event Bus Consumer
 * Consumes domain events from all services and stores them in the audit log
 */
export class EventBusConsumer {
  private connection: AmqpConnection | null = null;
  private channel: Channel | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000;

  /**
   * Connect to the event bus
   */
  async connect(): Promise<void> {
    // Skip connection if EVENT_BUS_URL is not configured (development mode)
    if (!env.EVENT_BUS_URL) {
      logger.info('EVENT_BUS_URL not configured - running in HTTP-only mode');
      return;
    }

    try {
      logger.info('Connecting to event bus...');

      const conn = await amqp.connect(env.EVENT_BUS_URL);
      this.connection = conn as unknown as AmqpConnection;
      this.channel = await conn.createChannel();

      // Set prefetch for controlled consumption
      await this.channel.prefetch(env.EVENT_BUS_PREFETCH_COUNT);

      // Assert exchange exists
      await this.channel.assertExchange(env.EVENT_BUS_EXCHANGE, 'topic', {
        durable: true,
      });

      // Assert our queue
      await this.channel.assertQueue(env.EVENT_BUS_QUEUE, {
        durable: true,
        arguments: {
          'x-message-ttl': 7 * 24 * 60 * 60 * 1000, // 7 days TTL for unprocessed messages
        },
      });

      // Bind to all events (wildcard pattern)
      // Each service publishes to: tripcomposer.events with routing key: service.event.type
      await this.channel.bindQueue(
        env.EVENT_BUS_QUEUE,
        env.EVENT_BUS_EXCHANGE,
        '#' // Consume all events
      );

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Handle connection errors
      conn.on('error', this.handleConnectionError.bind(this));
      conn.on('close', this.handleConnectionClose.bind(this));

      logger.info('Connected to event bus successfully');
    } catch (error) {
      logger.error('Failed to connect to event bus:', error instanceof Error ? error : undefined);
      await this.handleReconnect();
    }
  }

  /**
   * Start consuming events
   */
  async startConsuming(): Promise<void> {
    // Skip if not connected (HTTP-only mode)
    if (!this.channel) {
      if (!env.EVENT_BUS_URL) {
        logger.info('Event bus not configured - HTTP-only mode active');
        return;
      }
      throw new Error('Not connected to event bus');
    }

    logger.info(`Starting to consume events from queue: ${env.EVENT_BUS_QUEUE}`);

    await this.channel.consume(
      env.EVENT_BUS_QUEUE,
      this.handleMessage.bind(this),
      { noAck: false }
    );
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) {
      return;
    }

    const messageId = msg.properties.messageId || 'unknown';

    try {
      const content = JSON.parse(msg.content.toString()) as DomainEvent;

      logger.debug(`Processing event: ${content.type} (${messageId})`);

      // Transform domain event to audit event
      const auditEvent = this.transformToAuditEvent(content);

      // Validate the audit event
      const validationResult = CreateAuditEventSchema.safeParse(auditEvent);

      if (!validationResult.success) {
        logger.error(`Event validation failed for ${messageId}`);
        // Reject invalid messages (dead letter)
        this.channel.nack(msg, false, false);
        return;
      }

      // Store the audit event
      const storedEvent = await auditRepository.store(validationResult.data);

      logger.info(`Event stored: ${storedEvent.id} (seq: ${storedEvent.sequenceNumber})`);

      // Acknowledge the message
      this.channel.ack(msg);
    } catch (error) {
      logger.error(`Error processing event ${messageId}`, error instanceof Error ? error : undefined);

      // Requeue on transient errors, reject on permanent errors
      const isTransientError = this.isTransientError(error);
      this.channel.nack(msg, false, isTransientError);
    }
  }

  /**
   * Transform domain event to audit event format
   */
  private transformToAuditEvent(event: DomainEvent): CreateAuditEvent {
    // Extract category from event type (e.g., "booking.created" -> "booking")
    const category = this.extractCategory(event.type);

    // Determine severity based on event type
    const severity = this.determineSeverity(event.type);

    return {
      correlationId: event.correlationId,
      causationId: event.causationId,
      eventType: event.type,
      eventVersion: event.version || '1.0',
      category,
      severity,
      actor: {
        type: event.actor.type as 'user' | 'agent' | 'admin' | 'system' | 'service',
        id: event.actor.id,
        email: event.actor.email,
        displayName: event.actor.displayName,
        ipAddress: event.actor.ipAddress,
        userAgent: event.actor.userAgent,
      },
      resource: {
        type: event.resource.type,
        id: event.resource.id,
        parentType: event.resource.parentType,
        parentId: event.resource.parentId,
      },
      action: event.action,
      reason: event.reason,
      stateChange: event.payload.before || event.payload.after
        ? {
            before: event.payload.before ?? null,
            after: event.payload.after ?? null,
            changedFields: this.getChangedFields(event.payload.before, event.payload.after),
          }
        : undefined,
      metadata: event.payload.metadata,
      source: {
        service: event.source.service,
        version: event.source.version,
        environment: env.NODE_ENV,
      },
      gdprRelevant: event.compliance?.gdprRelevant ?? false,
      piiContained: event.compliance?.piiContained ?? false,
      retentionCategory: (event.compliance?.retentionCategory as 'standard' | 'legal' | 'financial' | 'extended') ?? 'standard',
    };
  }

  /**
   * Extract category from event type
   */
  private extractCategory(eventType: string): CreateAuditEvent['category'] {
    const categoryMap: Record<string, CreateAuditEvent['category']> = {
      booking: 'booking',
      itinerary: 'itinerary',
      payment: 'payment',
      refund: 'refund',
      dispute: 'dispute',
      user: 'user',
      agent: 'agent',
      chat: 'chat',
      admin: 'admin',
      auth: 'auth',
      system: 'system',
    };

    const prefix = eventType.split('.')[0] ?? 'system';
    return categoryMap[prefix] ?? 'system';
  }

  /**
   * Determine severity from event type
   */
  private determineSeverity(eventType: string): CreateAuditEvent['severity'] {
    if (eventType.includes('error') || eventType.includes('failed')) {
      return 'error';
    }
    if (eventType.includes('warning') || eventType.includes('alert')) {
      return 'warning';
    }
    if (eventType.includes('critical') || eventType.includes('security')) {
      return 'critical';
    }
    return 'info';
  }

  /**
   * Get list of changed fields between before and after states
   */
  private getChangedFields(
    before?: Record<string, unknown>,
    after?: Record<string, unknown>
  ): string[] {
    if (!before && !after) return [];
    if (!before) return Object.keys(after || {});
    if (!after) return Object.keys(before);

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changedFields: string[] = [];

    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Check if error is transient (should retry)
   */
  private isTransientError(error: unknown): boolean {
    if (error instanceof Error) {
      // Database connection errors are transient
      if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('connection')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    logger.error('Event bus connection error:', error);
    this.isConnected = false;
  }

  /**
   * Handle connection close
   */
  private async handleConnectionClose(): Promise<void> {
    logger.warn('Event bus connection closed');
    this.isConnected = false;
    await this.handleReconnect();
  }

  /**
   * Handle reconnection
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached. Giving up.');
      process.exit(1);
    }

    this.reconnectAttempts++;
    logger.info(`Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      await this.connect();
      await this.startConsuming();
    } catch (error) {
      logger.error('Reconnection failed:', error instanceof Error ? error : undefined);
      await this.handleReconnect();
    }
  }

  /**
   * Disconnect from event bus
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await (this.connection as unknown as { close(): Promise<void> }).close();
        this.connection = null;
      }
      this.isConnected = false;
      logger.info('Disconnected from event bus');
    } catch (error) {
      logger.error('Error disconnecting from event bus:', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Check if connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const eventBusConsumer = new EventBusConsumer();
