/**
 * Combined Resilience Wrapper
 * 
 * Combines circuit breaker, retry, and bulkhead patterns
 * into a single easy-to-use wrapper.
 */

import { CircuitBreaker, CircuitBreakerConfig, CircuitOpenError } from './circuit-breaker';
import { retryWithBackoff, RetryConfig, isRetryableError } from './retry';
import { Bulkhead, BulkheadConfig } from './bulkhead';

export interface ResilienceConfig {
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;
  
  /** Retry configuration */
  retry?: RetryConfig;
  
  /** Bulkhead configuration */
  bulkhead?: BulkheadConfig;
  
  /** Timeout in ms */
  timeoutMs?: number;
}

interface ResilienceComponents {
  circuitBreaker?: CircuitBreaker;
  bulkhead?: Bulkhead;
}

/**
 * Execute a function with combined resilience patterns.
 */
export async function withResilience<T>(
  fn: () => Promise<T>,
  config: ResilienceConfig
): Promise<T> {
  // Build the execution chain
  let execution: () => Promise<T> = fn;

  // Add timeout if configured
  if (config.timeoutMs) {
    const timeoutMs = config.timeoutMs;
    const original = execution;
    execution = () => withTimeout(original(), timeoutMs);
  }

  // Add retry if configured
  if (config.retry) {
    const retryConfig = config.retry;
    const original = execution;
    execution = async () => {
      const result = await retryWithBackoff(original, {
        ...retryConfig,
        retryIf: (error, attempt) => {
          // Don't retry circuit open errors
          if (error instanceof CircuitOpenError) return false;
          // Use custom retry logic or default
          if (retryConfig.retryIf) return retryConfig.retryIf(error, attempt);
          return isRetryableError(error);
        },
      });
      
      if (!result.success) {
        throw result.error;
      }
      return result.result!;
    };
  }

  // Add circuit breaker if configured
  if (config.circuitBreaker) {
    const cb = new CircuitBreaker(config.circuitBreaker);
    const original = execution;
    execution = () => cb.execute(original);
  }

  // Add bulkhead if configured
  if (config.bulkhead) {
    const bh = new Bulkhead(config.bulkhead);
    const original = execution;
    execution = () => bh.execute(original);
  }

  return execution();
}

/**
 * Create a resilient wrapper for repeated use.
 */
export function createResilientFunction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: ResilienceConfig
): {
  execute: (...args: TArgs) => Promise<TResult>;
  getStats: () => {
    circuitBreaker?: ReturnType<CircuitBreaker['getStats']>;
    bulkhead?: ReturnType<Bulkhead['getStats']>;
  };
  shutdown: () => void;
} {
  const components: ResilienceComponents = {};

  if (config.circuitBreaker) {
    components.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
  }

  if (config.bulkhead) {
    components.bulkhead = new Bulkhead(config.bulkhead);
  }

  const execute = async (...args: TArgs): Promise<TResult> => {
    let execution: () => Promise<TResult> = () => fn(...args);

    // Add timeout
    if (config.timeoutMs) {
      const timeoutMs = config.timeoutMs;
      const original = execution;
      execution = () => withTimeout(original(), timeoutMs);
    }

    // Add retry
    if (config.retry) {
      const retryConfig = config.retry;
      const original = execution;
      execution = async () => {
        const result = await retryWithBackoff(original, {
          ...retryConfig,
          retryIf: (error, attempt) => {
            if (error instanceof CircuitOpenError) return false;
            if (retryConfig.retryIf) return retryConfig.retryIf(error, attempt);
            return isRetryableError(error);
          },
        });
        
        if (!result.success) throw result.error;
        return result.result!;
      };
    }

    // Add circuit breaker
    if (components.circuitBreaker) {
      const cb = components.circuitBreaker;
      const original = execution;
      execution = () => cb.execute(original);
    }

    // Add bulkhead
    if (components.bulkhead) {
      const bh = components.bulkhead;
      const original = execution;
      execution = () => bh.execute(original);
    }

    return execution();
  };

  const getStats = () => ({
    circuitBreaker: components.circuitBreaker?.getStats(),
    bulkhead: components.bulkhead?.getStats(),
  });

  const shutdown = () => {
    components.bulkhead?.shutdown();
  };

  return { execute, getStats, shutdown };
}

/**
 * Add timeout to a promise.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export class TimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}
