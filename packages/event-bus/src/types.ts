/**
 * Base event envelope that wraps all domain events.
 * Every event MUST contain metadata for audit trail compliance.
 */
export interface EventEnvelope<TPayload = unknown> {
  /** Unique identifier for this event instance */
  readonly eventId: string;

  /** Event type identifier (e.g., 'booking.created', 'payment.completed') */
  readonly eventType: string;

  /** ISO 8601 timestamp when the event was emitted */
  readonly timestamp: string;

  /** Correlation ID for tracing related events across workflows */
  readonly correlationId: string;

  /** Optional causation ID linking to the event that triggered this one */
  readonly causationId?: string;

  /** The actual event payload */
  readonly payload: TPayload;

  /** Metadata for audit compliance */
  readonly metadata: EventMetadata;
}

/**
 * Metadata attached to every event for audit logging.
 * Required by: "Every state change MUST emit an audit event"
 */
export interface EventMetadata {
  /** Actor who triggered this event (user ID, system, admin) */
  readonly actorId: string;

  /** Type of actor */
  readonly actorType: 'user' | 'agent' | 'admin' | 'system';

  /** Source module that emitted the event */
  readonly source: string;

  /** Optional reason for admin actions (required for admin actorType) */
  readonly reason?: string;

  /** Optional IP address for security auditing */
  readonly ipAddress?: string;

  /** Optional user agent for security auditing */
  readonly userAgent?: string;
}

/**
 * Synchronous event handler function signature.
 */
export type SyncEventHandler<TPayload = unknown> = (
  event: EventEnvelope<TPayload>
) => void;

/**
 * Asynchronous event handler function signature.
 */
export type AsyncEventHandler<TPayload = unknown> = (
  event: EventEnvelope<TPayload>
) => Promise<void>;

/**
 * Union type for both sync and async handlers.
 */
export type EventHandler<TPayload = unknown> =
  | SyncEventHandler<TPayload>
  | AsyncEventHandler<TPayload>;

/**
 * Handler registration options.
 */
export interface HandlerOptions {
  /** Unique identifier for this handler (for unsubscription) */
  readonly handlerId?: string;

  /** Priority for handler execution order (lower = earlier, default: 100) */
  readonly priority?: number;

  /** Whether to continue executing other handlers if this one throws */
  readonly continueOnError?: boolean;
}

/**
 * Subscription receipt returned when registering a handler.
 */
export interface Subscription {
  /** Unique identifier for this subscription */
  readonly subscriptionId: string;

  /** Event type this subscription is for */
  readonly eventType: string;

  /** Unsubscribe this handler */
  readonly unsubscribe: () => void;
}

/**
 * Options for publishing events.
 */
export interface PublishOptions {
  /** Whether to wait for all handlers to complete (default: true for async) */
  readonly awaitHandlers?: boolean;

  /** Timeout in milliseconds for handler execution (default: 30000) */
  readonly timeoutMs?: number;
}

/**
 * Result of publishing an event.
 */
export interface PublishResult {
  /** The event ID that was published */
  readonly eventId: string;

  /** Number of handlers that were invoked */
  readonly handlersInvoked: number;

  /** Number of handlers that completed successfully */
  readonly handlersSucceeded: number;

  /** Errors from handlers that failed (if any) */
  readonly errors: HandlerError[];
}

/**
 * Error details from a failed handler.
 */
export interface HandlerError {
  /** Subscription ID of the handler that failed */
  readonly subscriptionId: string;

  /** Error message */
  readonly message: string;

  /** Original error (if available) */
  readonly originalError?: Error;
}

/**
 * Type-safe event registry for compile-time checking.
 * Modules should extend this interface with their event types.
 * 
 * @example
 * declare module '@tripcomposer/event-bus' {
 *   interface EventRegistry {
 *     'booking.created': { bookingId: string; userId: string };
 *     'payment.completed': { paymentId: string; amount: number };
 *   }
 * }
 */
export interface EventRegistry {
  // Placeholder for module augmentation
  [eventType: string]: unknown;
}

/**
 * Extract payload type from registry for a given event type.
 */
export type EventPayload<T extends keyof EventRegistry> = EventRegistry[T];

/**
 * Type guard to validate event envelope structure.
 */
export function isEventEnvelope(value: unknown): value is EventEnvelope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const envelope = value as Record<string, unknown>;

  return (
    typeof envelope['eventId'] === 'string' &&
    typeof envelope['eventType'] === 'string' &&
    typeof envelope['timestamp'] === 'string' &&
    typeof envelope['correlationId'] === 'string' &&
    typeof envelope['payload'] !== 'undefined' &&
    typeof envelope['metadata'] === 'object' &&
    envelope['metadata'] !== null
  );
}

/**
 * Type guard to validate event metadata structure.
 * Enforces: "All admin actions require a reason and are audit-logged"
 */
export function isValidMetadata(metadata: EventMetadata): boolean {
  const validActorTypes = ['user', 'agent', 'admin', 'system'];

  if (!validActorTypes.includes(metadata.actorType)) {
    return false;
  }

  // Admin actions MUST have a reason
  if (metadata.actorType === 'admin' && !metadata.reason) {
    return false;
  }

  return (
    typeof metadata.actorId === 'string' &&
    metadata.actorId.length > 0 &&
    typeof metadata.source === 'string' &&
    metadata.source.length > 0
  );
}
