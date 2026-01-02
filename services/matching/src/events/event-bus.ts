/**
 * Event Bus Implementation
 * 
 * HTTP-based event bus for inter-service communication.
 * All modules communicate ONLY via shared contracts and event bus.
 * 
 * ARCHITECTURE: Event-driven workflows with strong typing.
 */

import { v4 as uuidv4 } from 'uuid';
import { env, eventBusConfig } from '../config/index.js';
import { logger } from '../lib/logger.js';
import type { 
  BaseEvent, 
  EventMetadata,
  OutboundEvent,
} from '../types/events.js';
import { createEventId, type EventId } from '../types/index.js';

/**
 * Event handler function type
 */
export type EventHandler<T extends BaseEvent> = (event: T) => Promise<void>;

/**
 * Event Bus class for HTTP-based messaging
 */
export class EventBus {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private isConnected: boolean = false;

  constructor() {
    this.baseUrl = eventBusConfig.url;
    this.apiKey = eventBusConfig.apiKey;
  }

  /**
   * Connect to Event Bus (validates connectivity)
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Event Bus health check failed: ${response.status}`);
      }

      this.isConnected = true;
      logger.info({ url: this.baseUrl }, 'Event bus connected');
    } catch (error) {
      logger.error({ error, url: this.baseUrl }, 'Failed to connect to Event Bus');
      throw error;
    }
  }

  /**
   * Disconnect from Event Bus
   */
  async disconnect(): Promise<void> {
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

    try {
      const response = await fetch(`${this.baseUrl}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          channel,
          event: fullEvent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to publish event: ${response.status} - ${errorText}`);
      }

      logger.debug({ 
        channel, 
        eventId, 
        eventType: event.eventType 
      }, 'Event published');

      return eventId;
    } catch (error) {
      logger.error({ 
        error, 
        channel, 
        eventId,
        eventType: event.eventType 
      }, 'Failed to publish event');
      throw error;
    }
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