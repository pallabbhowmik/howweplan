/**
 * Event Publisher
 *
 * Publishes events to the event bus.
 * All events are typed and validated before publishing.
 */

import { config } from '../env.js';
import { logger } from '../services/logger.service.js';
import type { BookingPaymentEvent } from '../types/events.types.js';

/** Event publisher for emitting events to the event bus */
class EventPublisher {
  private readonly eventBusUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.eventBusUrl = config.api.eventBusUrl;
    this.apiKey = config.api.eventBusApiKey;
  }

  /**
   * Publish an event to the event bus.
   * Events are fire-and-forget but logged on failure.
   */
  async publish(event: BookingPaymentEvent): Promise<void> {
    try {
      const response = await fetch(this.eventBusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Event-Type': event.eventType,
          'X-Correlation-ID': event.correlationId,
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Event bus returned ${response.status}: ${response.statusText}`);
      }

      logger.debug(
        {
          eventId: event.eventId,
          eventType: event.eventType,
          correlationId: event.correlationId,
        },
        'Event published'
      );
    } catch (error) {
      // Log but don't throw - events are best-effort
      logger.error(
        {
          eventId: event.eventId,
          eventType: event.eventType,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to publish event'
      );

      // In production, this would go to a dead letter queue
    }
  }

  /**
   * Publish multiple events in batch.
   */
  async publishBatch(events: BookingPaymentEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }
}

export const eventPublisher = new EventPublisher();
