import type {
  EventEnvelope,
  EventHandler,
  EventRegistry,
  EventPayload,
  HandlerOptions,
  Subscription,
  PublishOptions,
  PublishResult,
  EventMetadata,
} from './types';

/**
 * Event bus interface for typed publish/subscribe.
 * 
 * This abstraction supports:
 * - Type-safe event publishing and subscription
 * - Both sync and async handlers
 * - Replaceable implementations (in-memory, queue-based)
 * 
 * Architecture compliance:
 * - Modules communicate ONLY via shared contracts and event bus
 * - Every state change MUST emit an audit event
 * - Validate all inputs, even from internal services
 */
export interface IEventBus {
  /**
   * Publish a typed event to all registered handlers.
   * 
   * @param eventType - The event type identifier
   * @param payload - The event payload (type-checked against EventRegistry)
   * @param metadata - Audit metadata (required for compliance)
   * @param options - Optional publish configuration
   * @returns Promise resolving to publish result
   * 
   * @throws {EventValidationError} If metadata validation fails
   * @throws {EventPublishError} If publishing fails critically
   */
  publish<T extends keyof EventRegistry>(
    eventType: T,
    payload: EventPayload<T>,
    metadata: EventMetadata,
    options?: PublishOptions
  ): Promise<PublishResult>;

  /**
   * Publish a raw event envelope (for advanced use cases).
   * 
   * @param event - Complete event envelope
   * @param options - Optional publish configuration
   * @returns Promise resolving to publish result
   */
  publishRaw<TPayload = unknown>(
    event: EventEnvelope<TPayload>,
    options?: PublishOptions
  ): Promise<PublishResult>;

  /**
   * Subscribe to a typed event.
   * 
   * @param eventType - The event type to subscribe to
   * @param handler - Handler function to invoke
   * @param options - Optional handler configuration
   * @returns Subscription receipt for unsubscribing
   */
  subscribe<T extends keyof EventRegistry>(
    eventType: T,
    handler: EventHandler<EventPayload<T>>,
    options?: HandlerOptions
  ): Subscription;

  /**
   * Subscribe to all events (for logging, auditing, etc.).
   * 
   * @param handler - Handler function to invoke for all events
   * @param options - Optional handler configuration
   * @returns Subscription receipt for unsubscribing
   */
  subscribeAll(
    handler: EventHandler<unknown>,
    options?: HandlerOptions
  ): Subscription;

  /**
   * Unsubscribe a handler by subscription ID.
   * 
   * @param subscriptionId - The subscription ID to remove
   * @returns True if unsubscribed, false if not found
   */
  unsubscribe(subscriptionId: string): boolean;

  /**
   * Check if there are any subscribers for an event type.
   * 
   * @param eventType - The event type to check
   * @returns True if there are subscribers
   */
  hasSubscribers(eventType: string): boolean;

  /**
   * Get the count of subscribers for an event type.
   * 
   * @param eventType - The event type to check
   * @returns Number of subscribers
   */
  subscriberCount(eventType: string): number;

  /**
   * Clear all subscriptions (useful for testing).
   */
  clear(): void;

  /**
   * Dispose of the event bus and clean up resources.
   */
  dispose(): Promise<void>;
}

/**
 * Factory function type for creating event bus instances.
 * Enables dependency injection and implementation swapping.
 */
export type EventBusFactory = () => IEventBus;
