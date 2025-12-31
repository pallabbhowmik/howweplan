import { randomUUID } from 'crypto';
import type { IEventBus } from './event-bus.interface';
import type {
  EventEnvelope,
  EventHandler,
  EventRegistry,
  EventPayload,
  EventMetadata,
  HandlerOptions,
  Subscription,
  PublishOptions,
  PublishResult,
  HandlerError,
} from './types';
import { isValidMetadata } from './types';
import { EventValidationError, HandlerTimeoutError } from './errors';

/**
 * Internal representation of a registered handler.
 */
interface RegisteredHandler {
  readonly subscriptionId: string;
  readonly eventType: string | '*';
  readonly handler: EventHandler<unknown>;
  readonly priority: number;
  readonly continueOnError: boolean;
}

/**
 * Default handler execution timeout in milliseconds.
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Default handler priority.
 */
const DEFAULT_PRIORITY = 100;

/**
 * In-memory implementation of the event bus.
 * 
 * Features:
 * - Type-safe publish/subscribe
 * - Support for sync and async handlers
 * - Priority-based handler execution
 * - Configurable error handling
 * - Wildcard subscriptions for all events
 * 
 * Limitations (by design):
 * - No persistence (events are fire-and-forget)
 * - No replay capability
 * - Single-process only
 * 
 * This implementation can be replaced with a queue-based
 * implementation (RabbitMQ, Kafka, etc.) for production
 * distributed systems.
 */
export class InMemoryEventBus implements IEventBus {
  private readonly handlers: Map<string, RegisteredHandler[]> = new Map();
  private readonly wildcardHandlers: RegisteredHandler[] = [];
  private readonly subscriptionIndex: Map<string, string> = new Map();
  private isDisposed = false;

  /**
   * Publish a typed event to all registered handlers.
   */
  async publish<T extends keyof EventRegistry>(
    eventType: T,
    payload: EventPayload<T>,
    metadata: EventMetadata,
    options?: PublishOptions
  ): Promise<PublishResult> {
    this.ensureNotDisposed();
    this.validateMetadata(metadata);

    const event = this.createEventEnvelope(
      eventType as string,
      payload,
      metadata
    );

    return this.publishRaw(event, options);
  }

  /**
   * Publish a raw event envelope.
   */
  async publishRaw<TPayload = unknown>(
    event: EventEnvelope<TPayload>,
    options?: PublishOptions
  ): Promise<PublishResult> {
    this.ensureNotDisposed();
    this.validateMetadata(event.metadata);

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const awaitHandlers = options?.awaitHandlers ?? true;

    const handlers = this.getHandlersForEvent(event.eventType);
    const errors: HandlerError[] = [];
    let handlersSucceeded = 0;

    if (!awaitHandlers) {
      // Fire and forget - schedule handlers but don't wait
      setImmediate(() => {
        void this.executeHandlers(handlers, event, timeoutMs);
      });

      return {
        eventId: event.eventId,
        handlersInvoked: handlers.length,
        handlersSucceeded: handlers.length, // Optimistic
        errors: [],
      };
    }

    // Execute handlers and wait for results
    for (const registeredHandler of handlers) {
      try {
        await this.executeHandler(registeredHandler, event, timeoutMs);
        handlersSucceeded++;
      } catch (error) {
        const handlerError = this.createHandlerError(
          registeredHandler.subscriptionId,
          error
        );
        errors.push(handlerError);

        if (!registeredHandler.continueOnError) {
          // Stop execution on first error if not configured to continue
          break;
        }
      }
    }

    return {
      eventId: event.eventId,
      handlersInvoked: handlers.length,
      handlersSucceeded,
      errors,
    };
  }

  /**
   * Subscribe to a typed event.
   */
  subscribe<T extends keyof EventRegistry>(
    eventType: T,
    handler: EventHandler<EventPayload<T>>,
    options?: HandlerOptions
  ): Subscription {
    this.ensureNotDisposed();

    const subscriptionId = options?.handlerId ?? randomUUID();
    const eventTypeStr = eventType as string;

    const registeredHandler: RegisteredHandler = {
      subscriptionId,
      eventType: eventTypeStr,
      handler: handler as EventHandler<unknown>,
      priority: options?.priority ?? DEFAULT_PRIORITY,
      continueOnError: options?.continueOnError ?? true,
    };

    this.addHandler(eventTypeStr, registeredHandler);
    this.subscriptionIndex.set(subscriptionId, eventTypeStr);

    return {
      subscriptionId,
      eventType: eventTypeStr,
      unsubscribe: () => this.unsubscribe(subscriptionId),
    };
  }

  /**
   * Subscribe to all events.
   */
  subscribeAll(
    handler: EventHandler<unknown>,
    options?: HandlerOptions
  ): Subscription {
    this.ensureNotDisposed();

    const subscriptionId = options?.handlerId ?? randomUUID();

    const registeredHandler: RegisteredHandler = {
      subscriptionId,
      eventType: '*',
      handler,
      priority: options?.priority ?? DEFAULT_PRIORITY,
      continueOnError: options?.continueOnError ?? true,
    };

    this.wildcardHandlers.push(registeredHandler);
    this.sortHandlersByPriority(this.wildcardHandlers);
    this.subscriptionIndex.set(subscriptionId, '*');

    return {
      subscriptionId,
      eventType: '*',
      unsubscribe: () => this.unsubscribe(subscriptionId),
    };
  }

  /**
   * Unsubscribe a handler by subscription ID.
   */
  unsubscribe(subscriptionId: string): boolean {
    const eventType = this.subscriptionIndex.get(subscriptionId);

    if (!eventType) {
      return false;
    }

    this.subscriptionIndex.delete(subscriptionId);

    if (eventType === '*') {
      const index = this.wildcardHandlers.findIndex(
        (h) => h.subscriptionId === subscriptionId
      );
      if (index !== -1) {
        this.wildcardHandlers.splice(index, 1);
        return true;
      }
      return false;
    }

    const handlers = this.handlers.get(eventType);
    if (!handlers) {
      return false;
    }

    const index = handlers.findIndex(
      (h) => h.subscriptionId === subscriptionId
    );
    if (index !== -1) {
      handlers.splice(index, 1);
      if (handlers.length === 0) {
        this.handlers.delete(eventType);
      }
      return true;
    }

    return false;
  }

  /**
   * Check if there are any subscribers for an event type.
   */
  hasSubscribers(eventType: string): boolean {
    return this.subscriberCount(eventType) > 0;
  }

  /**
   * Get the count of subscribers for an event type.
   */
  subscriberCount(eventType: string): number {
    const specificHandlers = this.handlers.get(eventType);
    const specificCount = specificHandlers?.length ?? 0;
    return specificCount + this.wildcardHandlers.length;
  }

  /**
   * Clear all subscriptions.
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.length = 0;
    this.subscriptionIndex.clear();
  }

  /**
   * Dispose of the event bus.
   */
  async dispose(): Promise<void> {
    this.clear();
    this.isDisposed = true;
  }

  /**
   * Validate event metadata.
   * Enforces: "All admin actions require a reason and are audit-logged"
   */
  private validateMetadata(metadata: EventMetadata): void {
    if (!metadata) {
      throw new EventValidationError(
        'Event metadata is required for audit compliance',
        'metadata'
      );
    }

    if (!metadata.actorId || metadata.actorId.trim().length === 0) {
      throw new EventValidationError(
        'Actor ID is required for audit compliance',
        'metadata.actorId'
      );
    }

    if (!metadata.source || metadata.source.trim().length === 0) {
      throw new EventValidationError(
        'Source module is required for audit compliance',
        'metadata.source'
      );
    }

    if (!isValidMetadata(metadata)) {
      if (metadata.actorType === 'admin' && !metadata.reason) {
        throw new EventValidationError(
          'Admin actions require a reason for audit compliance',
          'metadata.reason'
        );
      }
      throw new EventValidationError(
        'Invalid event metadata structure',
        'metadata'
      );
    }
  }

  /**
   * Create an event envelope with all required fields.
   */
  private createEventEnvelope<TPayload>(
    eventType: string,
    payload: TPayload,
    metadata: EventMetadata,
    correlationId?: string,
    causationId?: string
  ): EventEnvelope<TPayload> {
    return {
      eventId: randomUUID(),
      eventType,
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? randomUUID(),
      causationId,
      payload,
      metadata,
    };
  }

  /**
   * Get all handlers for an event type (including wildcard handlers).
   */
  private getHandlersForEvent(eventType: string): RegisteredHandler[] {
    const specificHandlers = this.handlers.get(eventType) ?? [];
    const allHandlers = [...specificHandlers, ...this.wildcardHandlers];

    // Sort by priority (lower = earlier)
    return allHandlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add a handler to the registry.
   */
  private addHandler(eventType: string, handler: RegisteredHandler): void {
    let handlers = this.handlers.get(eventType);

    if (!handlers) {
      handlers = [];
      this.handlers.set(eventType, handlers);
    }

    handlers.push(handler);
    this.sortHandlersByPriority(handlers);
  }

  /**
   * Sort handlers by priority.
   */
  private sortHandlersByPriority(handlers: RegisteredHandler[]): void {
    handlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute a single handler with timeout.
   */
  private async executeHandler(
    handler: RegisteredHandler,
    event: EventEnvelope<unknown>,
    timeoutMs: number
  ): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new HandlerTimeoutError(handler.subscriptionId, timeoutMs));
      }, timeoutMs);
    });

    const handlerPromise = Promise.resolve(handler.handler(event));

    await Promise.race([handlerPromise, timeoutPromise]);
  }

  /**
   * Execute all handlers (for fire-and-forget mode).
   */
  private async executeHandlers(
    handlers: RegisteredHandler[],
    event: EventEnvelope<unknown>,
    timeoutMs: number
  ): Promise<void> {
    for (const handler of handlers) {
      try {
        await this.executeHandler(handler, event, timeoutMs);
      } catch {
        // In fire-and-forget mode, we silently continue
        if (!handler.continueOnError) {
          break;
        }
      }
    }
  }

  /**
   * Create a handler error object.
   */
  private createHandlerError(
    subscriptionId: string,
    error: unknown
  ): HandlerError {
    if (error instanceof Error) {
      return {
        subscriptionId,
        message: error.message,
        originalError: error,
      };
    }

    return {
      subscriptionId,
      message: String(error),
    };
  }

  /**
   * Ensure the event bus is not disposed.
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('EventBus has been disposed');
    }
  }
}
