/**
 * Resilient Event Bus Wrapper
 * 
 * Wraps the base event bus with:
 * - Circuit breaker for publish operations
 * - Dead letter queue for failed events
 * - Retry with backoff
 */

import type { IEventBus } from './event-bus.interface';
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

// Note: In production, import from @tripcomposer/resilience
// For now, we'll implement a simple circuit breaker inline

interface ResilientEventBusConfig {
  /** Base event bus to wrap */
  eventBus: IEventBus;
  
  /** Service name for DLQ identification */
  serviceName: string;
  
  /** Circuit breaker failure threshold */
  failureThreshold?: number;
  
  /** Circuit breaker reset timeout in ms */
  resetTimeoutMs?: number;
  
  /** Maximum retry attempts */
  maxRetries?: number;
  
  /** Dead letter queue handler */
  onDeadLetter?: (event: EventEnvelope<unknown>, error: Error) => Promise<void>;
  
  /** State change callback */
  onCircuitStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') => void;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface FailureRecord {
  timestamp: number;
}

export class ResilientEventBus implements IEventBus {
  private readonly config: Required<Omit<ResilientEventBusConfig, 'onDeadLetter' | 'onCircuitStateChange'>> &
    Pick<ResilientEventBusConfig, 'onDeadLetter' | 'onCircuitStateChange'>;
  
  private circuitState: CircuitState = 'CLOSED';
  private failures: FailureRecord[] = [];
  private successCount = 0;
  private openedAt: number | null = null;
  
  // Stats
  private totalPublished = 0;
  private totalFailed = 0;
  private totalDeadLettered = 0;

  constructor(config: ResilientEventBusConfig) {
    this.config = {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      maxRetries: 3,
      ...config,
    };
  }

  async publish<T extends keyof EventRegistry>(
    eventType: T,
    payload: EventPayload<T>,
    metadata: EventMetadata,
    options?: PublishOptions
  ): Promise<PublishResult> {
    this.totalPublished++;

    // Check circuit state
    if (!this.isCircuitAllowing()) {
      const event = this.createEnvelope(eventType as string, payload, metadata);
      await this.handleDeadLetter(event, new Error('Circuit breaker open'));
      return {
        eventId: event.eventId,
        handlersInvoked: 0,
        handlersSucceeded: 0,
        errors: [{ subscriptionId: 'circuit-breaker', message: 'Circuit breaker open', originalError: new Error('Circuit breaker open') }],
      };
    }

    // Attempt publish with retries
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.config.eventBus.publish(eventType, payload, metadata, options);
        this.recordSuccess();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on validation errors
        if (lastError.name === 'EventValidationError') {
          break;
        }
        
        // Exponential backoff between retries
        if (attempt < this.config.maxRetries) {
          await this.sleep(100 * Math.pow(2, attempt - 1));
        }
      }
    }

    // All retries failed
    this.recordFailure();
    
    const event = this.createEnvelope(eventType as string, payload, metadata);
    await this.handleDeadLetter(event, lastError!);

    return {
      eventId: event.eventId,
      handlersInvoked: 0,
      handlersSucceeded: 0,
      errors: [{ subscriptionId: 'publish-error', message: lastError!.message, originalError: lastError! }],
    };
  }

  async publishRaw<TPayload = unknown>(
    event: EventEnvelope<TPayload>,
    options?: PublishOptions
  ): Promise<PublishResult> {
    this.totalPublished++;

    if (!this.isCircuitAllowing()) {
      await this.handleDeadLetter(event as EventEnvelope<unknown>, new Error('Circuit breaker open'));
      return {
        eventId: event.eventId,
        handlersInvoked: 0,
        handlersSucceeded: 0,
        errors: [{ subscriptionId: 'circuit-breaker', message: 'Circuit breaker open', originalError: new Error('Circuit breaker open') }],
      };
    }

    try {
      const result = await this.config.eventBus.publishRaw(event, options);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      const err = error instanceof Error ? error : new Error(String(error));
      await this.handleDeadLetter(event as EventEnvelope<unknown>, err);
      
      return {
        eventId: event.eventId,
        handlersInvoked: 0,
        handlersSucceeded: 0,
        errors: [{ subscriptionId: 'publish-error', message: err.message, originalError: err }],
      };
    }
  }

  subscribe<T extends keyof EventRegistry>(
    eventType: T,
    handler: EventHandler<EventPayload<T>>,
    options?: HandlerOptions
  ): Subscription {
    return this.config.eventBus.subscribe(eventType, handler, options);
  }

  subscribeAll(handler: EventHandler<unknown>, options?: HandlerOptions): Subscription {
    return this.config.eventBus.subscribeAll(handler, options);
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.config.eventBus.unsubscribe(subscriptionId);
  }

  hasSubscribers(eventType: string): boolean {
    return this.config.eventBus.hasSubscribers(eventType);
  }

  subscriberCount(eventType: string): number {
    return this.config.eventBus.subscriberCount(eventType);
  }

  clear(): void {
    this.config.eventBus.clear();
  }

  async dispose(): Promise<void> {
    return this.config.eventBus.dispose();
  }

  // Stats
  getStats(): {
    circuitState: CircuitState;
    totalPublished: number;
    totalFailed: number;
    totalDeadLettered: number;
    failureCount: number;
  } {
    return {
      circuitState: this.circuitState,
      totalPublished: this.totalPublished,
      totalFailed: this.totalFailed,
      totalDeadLettered: this.totalDeadLettered,
      failureCount: this.failures.length,
    };
  }

  // Force circuit state (for testing/admin)
  forceCircuitState(state: CircuitState): void {
    this.circuitState = state;
    if (state === 'OPEN') {
      this.openedAt = Date.now();
    }
    this.config.onCircuitStateChange?.(state);
  }

  private isCircuitAllowing(): boolean {
    this.cleanOldFailures();

    if (this.circuitState === 'CLOSED') {
      return true;
    }

    if (this.circuitState === 'OPEN') {
      // Check if we should try half-open
      if (this.openedAt && Date.now() - this.openedAt >= this.config.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow limited requests
    return true;
  }

  private recordSuccess(): void {
    this.successCount++;
    
    if (this.circuitState === 'HALF_OPEN') {
      if (this.successCount >= 3) {
        this.transitionTo('CLOSED');
      }
    }
  }

  private recordFailure(): void {
    this.totalFailed++;
    this.failures.push({ timestamp: Date.now() });
    this.cleanOldFailures();

    if (this.circuitState === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.circuitState === 'CLOSED') {
      if (this.failures.length >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  private transitionTo(state: CircuitState): void {
    if (this.circuitState === state) return;
    
    this.circuitState = state;
    
    if (state === 'OPEN') {
      this.openedAt = Date.now();
    } else if (state === 'CLOSED') {
      this.failures = [];
      this.openedAt = null;
    }
    
    this.successCount = 0;
    this.config.onCircuitStateChange?.(state);
  }

  private cleanOldFailures(): void {
    const cutoff = Date.now() - 60000; // 1 minute window
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }

  private async handleDeadLetter(event: EventEnvelope<unknown>, error: Error): Promise<void> {
    this.totalDeadLettered++;
    
    if (this.config.onDeadLetter) {
      try {
        await this.config.onDeadLetter(event, error);
      } catch (dlqError) {
        console.error('Failed to write to dead letter queue:', dlqError);
      }
    }
  }

  private createEnvelope<T>(
    eventType: string,
    payload: T,
    metadata: EventMetadata
  ): EventEnvelope<T> {
    return {
      eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      payload,
      metadata,
      timestamp: new Date().toISOString(),
      correlationId: metadata.actorId,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a resilient event bus wrapper.
 */
export function createResilientEventBus(config: ResilientEventBusConfig): ResilientEventBus {
  return new ResilientEventBus(config);
}
