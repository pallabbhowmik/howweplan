/**
 * Messaging Service - Event Bus Client
 *
 * Handles publishing and subscribing to events.
 * Supports multiple backends: Redis, RabbitMQ, Kafka.
 */

import { randomUUID } from 'crypto';
import { config, env } from '../env';
import type {
  BaseEvent,
  MessagingEmittedEvent,
  MessagingConsumedEvent,
} from './contracts';
import { CONSUMED_EVENT_TYPES } from './contracts';

// =============================================================================
// EVENT BUS INTERFACE
// =============================================================================

export interface EventBusClient {
  publish<T extends MessagingEmittedEvent>(event: T): Promise<void>;
  subscribe<T extends MessagingConsumedEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): Promise<void>;
  unsubscribe(eventType: string): Promise<void>;
  disconnect(): Promise<void>;
}

// =============================================================================
// EVENT FACTORY
// =============================================================================

/**
 * Creates a base event with all required fields.
 * Ensures every event has proper audit trail.
 */
export function createBaseEvent(
  eventType: string,
  correlationId?: string,
  causationId?: string
): Omit<BaseEvent, 'payload'> {
  return {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    source: env.SERVICE_NAME,
    correlationId: correlationId ?? randomUUID(),
    causationId,
    version: 1,
  };
}

// =============================================================================
// REDIS EVENT BUS IMPLEMENTATION
// =============================================================================

interface RedisClient {
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, callback: (message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  quit(): Promise<void>;
}

class RedisEventBus implements EventBusClient {
  private publisher: RedisClient | null = null;
  private subscriber: RedisClient | null = null;
  private handlers: Map<string, (event: MessagingConsumedEvent) => Promise<void>> =
    new Map();

  constructor(
    private readonly url: string,
    private readonly prefix: string
  ) {}

  async connect(): Promise<void> {
    // Dynamic import to avoid bundling Redis if not used
    const { createClient } = await import('redis');

    this.publisher = createClient({ url: this.url }) as unknown as RedisClient;
    this.subscriber = createClient({ url: this.url }) as unknown as RedisClient;

    await Promise.all([
      (this.publisher as any).connect(),
      (this.subscriber as any).connect(),
    ]);

    console.info(`[EventBus] Connected to Redis at ${this.url}`);
  }

  private getChannel(eventType: string): string {
    return `${this.prefix}:${eventType}`;
  }

  async publish<T extends MessagingEmittedEvent>(event: T): Promise<void> {
    if (!this.publisher) {
      throw new Error('Event bus not connected');
    }

    const channel = this.getChannel(event.eventType);
    const message = JSON.stringify(event);

    await this.publisher.publish(channel, message);

    if (config.observability.auditEnabled) {
      console.info(`[EventBus] Published ${event.eventType}`, {
        eventId: event.eventId,
        correlationId: event.correlationId,
      });
    }
  }

  async subscribe<T extends MessagingConsumedEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Event bus not connected');
    }

    const channel = this.getChannel(eventType);

    this.handlers.set(eventType, handler as (event: MessagingConsumedEvent) => Promise<void>);

    await this.subscriber.subscribe(channel, async (message: string) => {
      try {
        const event = JSON.parse(message) as T;
        await handler(event);

        if (config.observability.auditEnabled) {
          console.info(`[EventBus] Processed ${eventType}`, {
            eventId: event.eventId,
            correlationId: event.correlationId,
          });
        }
      } catch (error) {
        console.error(`[EventBus] Error processing ${eventType}`, error);
      }
    });

    console.info(`[EventBus] Subscribed to ${eventType}`);
  }

  async unsubscribe(eventType: string): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    const channel = this.getChannel(eventType);
    await this.subscriber.unsubscribe(channel);
    this.handlers.delete(eventType);

    console.info(`[EventBus] Unsubscribed from ${eventType}`);
  }

  async disconnect(): Promise<void> {
    if (this.publisher) {
      await this.publisher.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    this.handlers.clear();

    console.info('[EventBus] Disconnected');
  }
}

// =============================================================================
// EVENT BUS FACTORY
// =============================================================================

let eventBusInstance: EventBusClient | null = null;

/**
 * Creates and returns the event bus client based on configuration.
 * Uses singleton pattern to ensure single connection.
 */
export async function getEventBus(): Promise<EventBusClient> {
  if (eventBusInstance) {
    return eventBusInstance;
  }

  switch (config.eventBus.type) {
    case 'redis': {
      const bus = new RedisEventBus(config.eventBus.url, config.eventBus.prefix);
      await bus.connect();
      eventBusInstance = bus;
      break;
    }
    case 'rabbitmq':
      throw new Error('RabbitMQ event bus not yet implemented');
    case 'kafka':
      throw new Error('Kafka event bus not yet implemented');
    default:
      throw new Error(`Unknown event bus type: ${config.eventBus.type}`);
  }

  return eventBusInstance;
}

/**
 * Subscribes to all events consumed by the messaging service.
 */
export async function subscribeToConsumedEvents(
  handlers: {
    onBookingStateChanged?: (event: MessagingConsumedEvent) => Promise<void>;
    onIdentityVerified?: (event: MessagingConsumedEvent) => Promise<void>;
    onDisputeCreated?: (event: MessagingConsumedEvent) => Promise<void>;
    onDisputeResolved?: (event: MessagingConsumedEvent) => Promise<void>;
  }
): Promise<void> {
  const eventBus = await getEventBus();

  if (handlers.onBookingStateChanged) {
    await eventBus.subscribe(
      CONSUMED_EVENT_TYPES.BOOKING_STATE_CHANGED,
      handlers.onBookingStateChanged
    );
  }

  if (handlers.onIdentityVerified) {
    await eventBus.subscribe(
      CONSUMED_EVENT_TYPES.IDENTITY_VERIFIED,
      handlers.onIdentityVerified
    );
  }

  if (handlers.onDisputeCreated) {
    await eventBus.subscribe(
      CONSUMED_EVENT_TYPES.DISPUTE_CREATED,
      handlers.onDisputeCreated
    );
  }

  if (handlers.onDisputeResolved) {
    await eventBus.subscribe(
      CONSUMED_EVENT_TYPES.DISPUTE_RESOLVED,
      handlers.onDisputeResolved
    );
  }
}

export { EMITTED_EVENT_TYPES, CONSUMED_EVENT_TYPES } from './contracts';
