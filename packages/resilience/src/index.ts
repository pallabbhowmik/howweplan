/**
 * @tripcomposer/resilience
 * 
 * Resilience patterns for TripComposer services:
 * - Circuit Breaker: Prevent cascading failures
 * - Retry: Automatic retry with exponential backoff
 * - Dead Letter Queue: Store failed events for later processing
 * - Bulkhead: Limit concurrent operations
 */

// Circuit Breaker
export {
  CircuitBreaker,
  CircuitBreakerState,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
} from './circuit-breaker';

// Retry
export {
  retry,
  retryWithBackoff,
  type RetryConfig,
  type RetryResult,
} from './retry';

// Dead Letter Queue
export {
  DeadLetterQueue,
  type DeadLetterQueueConfig,
  type DeadLetterRecord,
} from './dead-letter-queue';

// Bulkhead
export {
  Bulkhead,
  type BulkheadConfig,
} from './bulkhead';

// Utilities
export {
  withResilience,
  type ResilienceConfig,
} from './with-resilience';
