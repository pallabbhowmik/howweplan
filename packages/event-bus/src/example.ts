/**
 * Example usage of the event bus.
 * 
 * This file demonstrates:
 * - Type-safe event registration
 * - Publishing events with required metadata
 * - Subscribing to events with handlers
 * - Wildcard subscriptions for auditing
 */

import { createEventBus, type EventMetadata } from './index';

// Step 1: Extend EventRegistry to register your event types
// In real usage, this would be in a shared contracts package

declare module './index' {
  interface EventRegistry {
    // Booking domain events
    'booking.created': BookingCreatedPayload;
    'booking.confirmed': BookingConfirmedPayload;
    'booking.cancelled': BookingCancelledPayload;

    // Payment domain events
    'payment.initiated': PaymentInitiatedPayload;
    'payment.completed': PaymentCompletedPayload;
    'payment.failed': PaymentFailedPayload;

    // Agent domain events
    'agent.itinerary.submitted': ItinerarySubmittedPayload;
    'agent.confirmed': AgentConfirmedPayload;
  }
}

// Event payload types
interface BookingCreatedPayload {
  bookingId: string;
  userId: string;
  tripId: string;
  createdAt: string;
}

interface BookingConfirmedPayload {
  bookingId: string;
  agentId: string;
  confirmedAt: string;
}

interface BookingCancelledPayload {
  bookingId: string;
  reason: string;
  cancelledAt: string;
}

interface PaymentInitiatedPayload {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
}

interface PaymentCompletedPayload {
  paymentId: string;
  bookingId: string;
  transactionId: string;
  completedAt: string;
}

interface PaymentFailedPayload {
  paymentId: string;
  bookingId: string;
  errorCode: string;
  errorMessage: string;
}

interface ItinerarySubmittedPayload {
  itineraryId: string;
  agentId: string;
  tripId: string;
  format: 'pdf' | 'link' | 'text';
  isObfuscated: boolean; // Must be true pre-payment
}

interface AgentConfirmedPayload {
  agentId: string;
  bookingId: string;
  confirmedAt: string;
}

// Step 2: Create the event bus and use it
async function main(): Promise<void> {
  const eventBus = createEventBus();

  // Subscribe to specific events
  const bookingSubscription = eventBus.subscribe(
    'booking.created',
    async (event) => {
      console.log(`[BookingHandler] New booking created: ${event.payload.bookingId}`);
      console.log(`  User: ${event.payload.userId}`);
      console.log(`  Trip: ${event.payload.tripId}`);
      console.log(`  Actor: ${event.metadata.actorId} (${event.metadata.actorType})`);
    },
    { priority: 10 } // High priority
  );

  // Subscribe to payment events
  eventBus.subscribe(
    'payment.completed',
    async (event) => {
      console.log(`[PaymentHandler] Payment completed: ${event.payload.paymentId}`);
      // After payment, reveal full details (per business rules)
      console.log(`  Transaction: ${event.payload.transactionId}`);
    }
  );

  // Wildcard subscription for audit logging
  // Required by: "Every state change MUST emit an audit event"
  eventBus.subscribeAll(
    async (event) => {
      console.log(`[AuditLog] ${event.eventType}`);
      console.log(`  EventId: ${event.eventId}`);
      console.log(`  Timestamp: ${event.timestamp}`);
      console.log(`  CorrelationId: ${event.correlationId}`);
      console.log(`  Actor: ${event.metadata.actorId} (${event.metadata.actorType})`);
      console.log(`  Source: ${event.metadata.source}`);
      if (event.metadata.reason) {
        console.log(`  Reason: ${event.metadata.reason}`);
      }
      console.log('---');
    },
    { priority: 1000 } // Low priority - runs after business handlers
  );

  // Step 3: Publish events with required metadata
  const userMetadata: EventMetadata = {
    actorId: 'user-123',
    actorType: 'user',
    source: 'booking-service',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
  };

  // Publish a booking created event
  const result = await eventBus.publish(
    'booking.created',
    {
      bookingId: 'booking-456',
      userId: 'user-123',
      tripId: 'trip-789',
      createdAt: new Date().toISOString(),
    },
    userMetadata
  );

  console.log(`\nPublish result:`);
  console.log(`  Event ID: ${result.eventId}`);
  console.log(`  Handlers invoked: ${result.handlersInvoked}`);
  console.log(`  Handlers succeeded: ${result.handlersSucceeded}`);

  // Admin action example - requires reason
  const adminMetadata: EventMetadata = {
    actorId: 'admin-001',
    actorType: 'admin',
    source: 'admin-panel',
    reason: 'Customer requested cancellation via support ticket #12345',
  };

  await eventBus.publish(
    'booking.cancelled',
    {
      bookingId: 'booking-456',
      reason: 'Customer request',
      cancelledAt: new Date().toISOString(),
    },
    adminMetadata
  );

  // Unsubscribe example
  console.log('\nUnsubscribing booking handler...');
  bookingSubscription.unsubscribe();
  console.log(`Has booking.created subscribers: ${eventBus.hasSubscribers('booking.created')}`);
  console.log(`Subscriber count: ${eventBus.subscriberCount('booking.created')}`);

  // Cleanup
  await eventBus.dispose();
}

// Run example
main().catch(console.error);
