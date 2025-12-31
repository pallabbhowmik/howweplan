/**
 * @tripcomposer/event-bus
 * 
 * Typed event bus abstraction for the HowWePlan platform.
 * 
 * This module provides:
 * - Type-safe publish/subscribe using shared contracts
 * - Support for sync and async handlers
 * - In-memory implementation (replaceable with queue-based)
 * - Audit-compliant event metadata
 * 
 * Architecture compliance:
 * - Modules communicate ONLY via shared contracts and event bus
 * - Every state change MUST emit an audit event
 * - Validate all inputs, even from internal services
 */

// Types
export type {
  EventEnvelope,
  EventMetadata,
  SyncEventHandler,
  AsyncEventHandler,
  EventHandler,
  HandlerOptions,
  Subscription,
  PublishOptions,
  PublishResult,
  HandlerError,
  EventRegistry,
  EventPayload,
} from './types';

export { isEventEnvelope, isValidMetadata } from './types';

// Interface
export type { IEventBus, EventBusFactory } from './event-bus.interface';

// Implementation
export { InMemoryEventBus } from './in-memory-event-bus';

// Errors
export {
  EventBusError,
  EventValidationError,
  EventPublishError,
  HandlerTimeoutError,
} from './errors';

// Factory function for creating the default event bus
import { InMemoryEventBus } from './in-memory-event-bus';
import type { IEventBus } from './event-bus.interface';

/**
 * Create a new event bus instance.
 * 
 * In development/testing: uses InMemoryEventBus
 * In production: can be swapped for queue-based implementation
 */
export function createEventBus(): IEventBus {
  return new InMemoryEventBus();
}
