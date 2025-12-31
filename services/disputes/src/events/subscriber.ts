/**
 * Event Subscriber
 * 
 * This module handles subscribing to events from other services.
 * Events are the ONLY way modules communicate per architecture rules.
 */

import { config } from '../env.js';
import { logger } from '../audit/logger.js';
import {
  DisputeServiceIncomingEvent,
  RefundIssuedEvent,
  BookingDetailsEvent,
} from '../types/events.js';

/**
 * Event handler function type.
 */
type EventHandler<T extends DisputeServiceIncomingEvent> = (event: T) => Promise<void>;

/**
 * Event handlers registry.
 */
interface EventHandlers {
  'payment.refund_issued': EventHandler<RefundIssuedEvent>;
  'booking.details_requested': EventHandler<BookingDetailsEvent>;
}

/**
 * Event subscriber class that handles incoming events from the event bus.
 */
class EventSubscriber {
  private handlers: Partial<EventHandlers> = {};
  private isRunning = false;

  /**
   * Register a handler for a specific event type.
   */
  on<K extends keyof EventHandlers>(
    eventType: K,
    handler: EventHandlers[K]
  ): void {
    this.handlers[eventType] = handler as EventHandlers[K];
    logger.info({ msg: 'Registered event handler', eventType });
  }

  /**
   * Process an incoming event.
   */
  async processEvent(event: DisputeServiceIncomingEvent): Promise<void> {
    const handler = this.handlers[event.eventType as keyof EventHandlers];

    if (!handler) {
      logger.warn({
        msg: 'No handler registered for event type',
        eventType: event.eventType,
        eventId: event.eventId,
      });
      return;
    }

    const startTime = Date.now();

    try {
      await (handler as EventHandler<typeof event>)(event);

      logger.info({
        msg: 'Event processed successfully',
        eventType: event.eventType,
        eventId: event.eventId,
        correlationId: event.correlationId,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      logger.error({
        msg: 'Failed to process event',
        eventType: event.eventType,
        eventId: event.eventId,
        correlationId: event.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Start polling the event bus for events.
   * In production, this would be replaced with a proper message queue consumer.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn({ msg: 'Event subscriber is already running' });
      return;
    }

    this.isRunning = true;
    logger.info({ msg: 'Event subscriber started' });

    while (this.isRunning) {
      try {
        const response = await fetch(
          `${config.services.eventBus}/subscribe/${config.service.name}`,
          {
            method: 'GET',
            headers: {
              'X-Service-Name': config.service.name,
            },
          }
        );

        if (response.ok) {
          const events = (await response.json()) as DisputeServiceIncomingEvent[];

          for (const event of events) {
            await this.processEvent(event);
          }
        }
      } catch (error) {
        logger.error({
          msg: 'Error polling event bus',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Poll every 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  /**
   * Stop the event subscriber.
   */
  stop(): void {
    this.isRunning = false;
    logger.info({ msg: 'Event subscriber stopped' });
  }
}

/**
 * Singleton event subscriber instance.
 */
export const eventSubscriber = new EventSubscriber();

/**
 * Register default event handlers.
 */
export function registerDefaultHandlers(): void {
  // Handler for when a refund is issued by the payments service
  eventSubscriber.on('payment.refund_issued', async (event) => {
    logger.info({
      msg: 'Refund issued event received',
      disputeId: event.payload.disputeId,
      refundId: event.payload.refundId,
      amount: event.payload.amount,
      currency: event.payload.currency,
    });

    // Update dispute with refund confirmation
    // This would call the dispute service to mark the refund as processed
  });

  // Handler for booking details response
  eventSubscriber.on('booking.details_requested', async (event) => {
    logger.info({
      msg: 'Booking details received',
      bookingId: event.payload.bookingId,
    });

    // Process booking details for dispute creation
  });
}
