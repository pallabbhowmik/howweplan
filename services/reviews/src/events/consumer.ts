/**
 * Event Consumer
 * 
 * Subscribes to events from the message bus and routes them to handlers.
 */

import { eventBusConfig } from '../config/env';
import { ConsumedEvent } from './contracts';
import { 
  handleBookingCompleted, 
  isBookingCompletedEvent 
} from './handlers/booking-completed.handler';
import {
  handleDisputeResolved,
  isDisputeResolvedEvent,
} from './handlers/dispute-resolved.handler';

// =============================================================================
// EVENT BUS CONSUMER (ABSTRACTION)
// =============================================================================

interface EventBusConsumer {
  subscribe(
    queue: string,
    handler: (event: unknown) => Promise<void>
  ): Promise<void>;
  close(): Promise<void>;
}

let eventBusConsumer: EventBusConsumer | null = null;

/**
 * Initialize the event consumer
 */
export async function initializeEventConsumer(): Promise<void> {
  // In a real implementation, this would connect to RabbitMQ/Kafka
  eventBusConsumer = {
    async subscribe(queue: string, _handler: (event: unknown) => Promise<void>): Promise<void> {
      console.log(`[EventConsumer] Subscribed to queue: ${queue}`);
      // Actual implementation would set up message consumption
    },
    async close(): Promise<void> {
      console.log('[EventConsumer] Connection closed');
    },
  };

  // Subscribe to events
  await eventBusConsumer.subscribe(
    eventBusConfig.queue,
    routeEvent
  );
}

/**
 * Close the event consumer connection
 */
export async function closeEventConsumer(): Promise<void> {
  if (eventBusConsumer) {
    await eventBusConsumer.close();
    eventBusConsumer = null;
  }
}

/**
 * Route incoming events to appropriate handlers
 */
async function routeEvent(event: unknown): Promise<void> {
  try {
    if (isBookingCompletedEvent(event)) {
      await handleBookingCompleted(event);
      return;
    }

    if (isDisputeResolvedEvent(event)) {
      await handleDisputeResolved(event);
      return;
    }

    // Unknown event type - log and ignore
    const eventType = (event as Record<string, unknown>)?.type;
    console.log(`[EventConsumer] Ignoring unknown event type: ${eventType}`);
  } catch (error) {
    console.error('[EventConsumer] Error processing event:', error);
    // In production, would send to dead-letter queue
    throw error;
  }
}

/**
 * Manually process an event (for testing or replay)
 */
export async function processEvent(event: ConsumedEvent): Promise<void> {
  await routeEvent(event);
}
