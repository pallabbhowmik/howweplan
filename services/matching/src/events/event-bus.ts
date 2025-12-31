/**
 * Event Bus Implementation
 * 
 * Redis-based pub/sub event bus for inter-service communication.
 * All modules communicate ONLY via shared contracts and event bus.
 * 
 * ARCHITECTURE: Event-driven workflows with strong typing.
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { env, redisConfig } from '../config/index.js';
import { logger } from '../lib/logger.js';
import type { 
  BaseEvent, 
  EventMetadata,
  InboundEvent,
  OutboundEvent,
} from '../types/events.js';
import { createEventId, type EventId } from '../types/index.js';

/**
 * Event handler function type
 */
export type EventHandler<T extends BaseEvent> = (event: T) => Promise<void>;

/**
 * Event Bus class for pub/sub messaging
 */
export class EventBus {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly subscriptions: Map<string, EventHandler<BaseEvent>[]>;
  private isConnected: boolean = false;

  constructor() {
    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.subscriptions = new Map();

    this.setupErrorHandlers();
  }

  /**
   * Set up error handlers for Redis connections
   */
  private setupErrorHandlers(): void {
    this.publisher.on('error', (err) => {
      logger.error({ err }, 'Redis publisher error');
    });

    this.subscriber.on('error', (err) => {
      logger.error({ err }, 'Redis subscriber error');
    });

    this.publisher.on('connect', () => {
      logger.info('Redis publisher connected');
    });

    this.subscriber.on('connect', () => {
      logger.info('Redis subscriber connected');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    await Promise.all([
      this.publisher.connect(),
      this.subscriber.connect(),
    ]);

    this.isConnected = true;
    logger.info('Event bus connected');
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);

    this.isConnected = false;
    logger.info('Event bus disconnected');
  }

  /**
   * Publish an event to a channel
   */
  async publish<T extends OutboundEvent>(
    channel: string,
    event: Omit<T, 'eventId' | 'timestamp' | 'version' | 'source'>
  ): Promise<EventId> {
    const eventId = createEventId(uuidv4());
    
    const fullEvent: BaseEvent = {
      ...event,
      eventId,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: env.SERVICE_NAME,
    };

    const serialized = JSON.stringify(fullEvent);
    
    await this.publisher.publish(channel, serialized);
    
    logger.debug({ 
      channel, 
      eventId, 
      eventType: event.eventType 
    }, 'Event published');

    return eventId;
  }

  /**
   * Subscribe to a channel with a handler
   */
  async subscribe<T extends InboundEvent>(
    channel: string,
    handler: EventHandler<T>
  ): Promise<void> {
    const handlers = this.subscriptions.get(channel) ?? [];
    handlers.push(handler as EventHandler<BaseEvent>);
    this.subscriptions.set(channel, handlers);

    await this.subscriber.subscribe(channel);

    // Set up message handler if not already done
    if (handlers.length === 1) {
      this.subscriber.on('message', async (msgChannel, message) => {
        if (msgChannel !== channel) {
          return;
        }

        try {
          const event = JSON.parse(message) as T;
          const channelHandlers = this.subscriptions.get(channel) ?? [];
          
          await Promise.all(
            channelHandlers.map(async (h) => {
              try {
                await h(event);
              } catch (err) {
                logger.error({ 
                  err, 
                  channel, 
                  eventId: event.eventId,
                  eventType: event.eventType,
                }, 'Event handler error');
              }
            })
          );
        } catch (err) {
          logger.error({ err, channel, message }, 'Failed to parse event');
        }
      });
    }

    logger.info({ channel }, 'Subscribed to channel');
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    this.subscriptions.delete(channel);
    await this.subscriber.unsubscribe(channel);
    logger.info({ channel }, 'Unsubscribed from channel');
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

/**
 * Create event metadata for tracing
 */
export function createEventMetadata(
  traceId?: string,
  userId?: string,
  sessionId?: string
): EventMetadata {
  const metadata: EventMetadata = {
    traceId: traceId ?? uuidv4(),
    spanId: uuidv4(),
  };
  if (userId) {
    (metadata as { userId?: string }).userId = userId;
  }
  if (sessionId) {
    (metadata as { sessionId?: string }).sessionId = sessionId;
  }
  return metadata;
}

/**
 * Singleton event bus instance
 */
let eventBusInstance: EventBus | null = null;

/**
 * Get or create the event bus instance
 */
export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

/**
 * Reset the event bus instance (for testing)
 */
export function resetEventBus(): void {
  if (eventBusInstance) {
    eventBusInstance.disconnect().catch(() => {});
    eventBusInstance = null;
  }
}
