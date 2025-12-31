# @tripcomposer/event-bus

Typed event bus abstraction for the HowWePlan travel orchestration platform.

> Note: Package scope and identifier strings may still use `tripcomposer` for compatibility.

## Features

- ✅ **Type-safe publish/subscribe** using TypeScript module augmentation
- ✅ **Sync and async handlers** with configurable timeouts
- ✅ **In-memory implementation** (no external dependencies)
- ✅ **Replaceable architecture** (swap for RabbitMQ, Kafka, etc.)
- ✅ **Audit-compliant metadata** enforced at runtime
- ✅ **Priority-based execution** for handler ordering
- ✅ **Wildcard subscriptions** for cross-cutting concerns

## Architecture Compliance

This module enforces the platform constitution:

- **"Modules communicate ONLY via shared contracts and event bus"** - This is the event bus
- **"Every state change MUST emit an audit event"** - Metadata validation enforces this
- **"All admin actions require a reason and are audit-logged"** - Admin events without `reason` are rejected
- **"Validate all inputs, even from internal services"** - All event metadata is validated

## Installation

```bash
npm install @tripcomposer/event-bus
```

## Usage

### 1. Register Event Types (in shared contracts)

```typescript
// In @tripcomposer/contracts or similar
declare module '@tripcomposer/event-bus' {
  interface EventRegistry {
    'booking.created': { bookingId: string; userId: string };
    'booking.confirmed': { bookingId: string; agentId: string };
    'payment.completed': { paymentId: string; amount: number };
  }
}
```

### 2. Create Event Bus

```typescript
import { createEventBus } from '@tripcomposer/event-bus';

const eventBus = createEventBus();
```

### 3. Subscribe to Events

```typescript
// Type-safe subscription
const subscription = eventBus.subscribe(
  'booking.created',
  async (event) => {
    // event.payload is typed as { bookingId: string; userId: string }
    console.log(`Booking created: ${event.payload.bookingId}`);
  },
  { priority: 10 } // Lower = earlier execution
);

// Unsubscribe when done
subscription.unsubscribe();
```

### 4. Publish Events

```typescript
import type { EventMetadata } from '@tripcomposer/event-bus';

// User action
const result = await eventBus.publish(
  'booking.created',
  { bookingId: 'booking-123', userId: 'user-456' },
  {
    actorId: 'user-456',
    actorType: 'user',
    source: 'booking-service',
  }
);

console.log(`Handlers invoked: ${result.handlersInvoked}`);
```

### 5. Admin Actions (require reason)

```typescript
// Admin actions MUST include a reason
await eventBus.publish(
  'booking.cancelled',
  { bookingId: 'booking-123', reason: 'Fraud detected' },
  {
    actorId: 'admin-001',
    actorType: 'admin',
    source: 'admin-panel',
    reason: 'Fraud investigation - ticket #12345', // REQUIRED
  }
);
```

### 6. Audit Logging (wildcard subscription)

```typescript
// Subscribe to ALL events for audit logging
eventBus.subscribeAll(
  async (event) => {
    await auditLogger.log({
      eventId: event.eventId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      actor: event.metadata.actorId,
      source: event.metadata.source,
    });
  },
  { priority: 1000 } // Run after business handlers
);
```

## API Reference

### `IEventBus`

```typescript
interface IEventBus {
  // Typed publish
  publish<T extends keyof EventRegistry>(
    eventType: T,
    payload: EventPayload<T>,
    metadata: EventMetadata,
    options?: PublishOptions
  ): Promise<PublishResult>;

  // Raw publish (for advanced use)
  publishRaw<TPayload>(
    event: EventEnvelope<TPayload>,
    options?: PublishOptions
  ): Promise<PublishResult>;

  // Typed subscribe
  subscribe<T extends keyof EventRegistry>(
    eventType: T,
    handler: EventHandler<EventPayload<T>>,
    options?: HandlerOptions
  ): Subscription;

  // Wildcard subscribe
  subscribeAll(
    handler: EventHandler<unknown>,
    options?: HandlerOptions
  ): Subscription;

  // Unsubscribe by ID
  unsubscribe(subscriptionId: string): boolean;

  // Query subscribers
  hasSubscribers(eventType: string): boolean;
  subscriberCount(eventType: string): number;

  // Cleanup
  clear(): void;
  dispose(): Promise<void>;
}
```

### `EventMetadata`

```typescript
interface EventMetadata {
  actorId: string;           // Who triggered the event
  actorType: 'user' | 'agent' | 'admin' | 'system';
  source: string;            // Which module emitted the event
  reason?: string;           // REQUIRED for admin actions
  ipAddress?: string;        // Optional security context
  userAgent?: string;        // Optional security context
}
```

### `HandlerOptions`

```typescript
interface HandlerOptions {
  handlerId?: string;        // Custom subscription ID
  priority?: number;         // Execution order (default: 100)
  continueOnError?: boolean; // Continue if handler throws (default: true)
}
```

### `PublishOptions`

```typescript
interface PublishOptions {
  awaitHandlers?: boolean;   // Wait for handlers (default: true)
  timeoutMs?: number;        // Handler timeout (default: 30000)
}
```

## Replacing with Queue-Based Implementation

The `IEventBus` interface allows swapping implementations:

```typescript
// Development
import { InMemoryEventBus } from '@tripcomposer/event-bus';
const eventBus = new InMemoryEventBus();

// Production (example)
import { RabbitMQEventBus } from '@tripcomposer/event-bus-rabbitmq';
const eventBus = new RabbitMQEventBus(connectionConfig);
```

Both implementations satisfy `IEventBus`, ensuring seamless swapping.

## Testing

```bash
npm test
```

## License

UNLICENSED - Private package
