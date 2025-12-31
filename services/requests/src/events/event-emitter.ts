/**
 * Event Emitter
 * 
 * Handles publishing events to the event bus (Redis).
 * All state changes MUST emit events through this module.
 */

import { createClient, RedisClientType } from 'redis';
import { randomUUID } from 'crypto';
import { config } from '../env';
import { DomainEvent, EventMetadata, RequestEvent } from './request.events';
import { Logger } from '../services/logger.service';

export interface EventEmitter {
  emit(event: Omit<RequestEvent, 'eventId' | 'occurredAt' | 'version' | 'metadata'>, context: EventContext): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface EventContext {
  correlationId: string;
  causationId?: string;
  userId?: string;
}

export function createEventEmitter(logger: Logger): EventEmitter {
  let client: RedisClientType | null = null;
  let eventVersion = 0;

  const getChannel = (eventType: string): string => {
    return `${config.eventBus.channelPrefix}:requests:${eventType.toLowerCase()}`;
  };

  return {
    async connect(): Promise<void> {
      if (client) {
        return;
      }

      if (!config.eventBus.url) {
        logger.warn('EVENT_BUS_URL not configured, event emitter will be disabled');
        return;
      }

      client = createClient({
        url: config.eventBus.url,
      });

      client.on('error', (err: Error) => {
        logger.error('Redis client error', { error: err.message });
      });

      await client.connect();
      logger.info('Event emitter connected to Redis');
    },

    async disconnect(): Promise<void> {
      if (client) {
        await client.quit();
        client = null;
        logger.info('Event emitter disconnected from Redis');
      }
    },

    async emit(
      event: Omit<RequestEvent, 'eventId' | 'occurredAt' | 'version' | 'metadata'>,
      context: EventContext
    ): Promise<void> {
      if (!client) {
        logger.warn('Event emitter not connected, skipping event emission');
        return;
      }

      eventVersion++;

      const metadata: EventMetadata = {
        correlationId: context.correlationId,
        causationId: context.causationId ?? null,
        userId: context.userId ?? null,
        source: config.app.serviceName,
      };

      const fullEvent: DomainEvent = {
        ...event,
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        version: eventVersion,
        metadata,
      };

      const channel = getChannel(event.eventType);
      const message = JSON.stringify(fullEvent);

      await client.publish(channel, message);

      logger.debug('Event emitted', {
        eventType: event.eventType,
        eventId: fullEvent.eventId,
        aggregateId: event.aggregateId,
        channel,
      });

      // Also publish to a general requests channel for listeners interested in all events
      const generalChannel = `${config.eventBus.channelPrefix}:requests:all`;
      await client.publish(generalChannel, message);
    },
  };
}

/**
 * Create a correlation ID for request tracing
 */
export function createCorrelationId(): string {
  return randomUUID();
}

/**
 * Event type constants for type safety
 */
export const EventTypes = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  REQUEST_STATE_CHANGED: 'REQUEST_STATE_CHANGED',
  REQUEST_SUBMITTED: 'REQUEST_SUBMITTED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  REQUEST_EXPIRED: 'REQUEST_EXPIRED',
} as const;
