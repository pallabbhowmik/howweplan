/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by tracking error rates and
 * "opening" the circuit when failures exceed a threshold.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: All requests fail immediately (fast fail)
 * - HALF_OPEN: Allow limited requests to test recovery
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Name for logging and metrics */
  name: string;
  
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  
  /** Success threshold in half-open state to close circuit */
  successThreshold?: number;
  
  /** Time in ms to wait before attempting reset */
  resetTimeout?: number;
  
  /** Time window in ms for counting failures */
  rollingWindowMs?: number;
  
  /** Maximum number of requests allowed in half-open state */
  halfOpenRequests?: number;
  
  /** Optional callback when state changes */
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void;
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  consecutiveSuccesses: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

interface FailureRecord {
  timestamp: number;
}

const DEFAULT_CONFIG: Required<Omit<CircuitBreakerConfig, 'name' | 'onStateChange'>> = {
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  rollingWindowMs: 60000, // 1 minute
  halfOpenRequests: 3,
};

export class CircuitBreaker {
  private readonly config: Required<Omit<CircuitBreakerConfig, 'onStateChange'>> & 
    Pick<CircuitBreakerConfig, 'onStateChange'>;
  
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: FailureRecord[] = [];
  private successes = 0;
  private consecutiveSuccesses = 0;
  private halfOpenRequestCount = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private openedAt: number | null = null;
  
  // Lifetime stats
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Execute a function with circuit breaker protection.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if we should try half-open
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
      } else {
        throw new CircuitOpenError(this.config.name, this.getRemainingResetTime());
      }
    }

    // Check if we've exceeded half-open request limit
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenRequestCount >= this.config.halfOpenRequests) {
        throw new CircuitOpenError(this.config.name, this.getRemainingResetTime());
      }
      this.halfOpenRequestCount++;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Check if a request is allowed without executing.
   */
  isAllowed(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN);
        return true;
      }
      return false;
    }

    // HALF_OPEN
    return this.halfOpenRequestCount < this.config.halfOpenRequests;
  }

  /**
   * Manually record a success.
   */
  recordSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo(CircuitBreakerState.CLOSED);
      }
    }
  }

  /**
   * Manually record a failure.
   */
  recordFailure(): void {
    const now = Date.now();
    this.failures.push({ timestamp: now });
    this.consecutiveSuccesses = 0;
    this.totalFailures++;
    this.lastFailureTime = new Date();

    // Clean old failures outside rolling window
    this.cleanOldFailures();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open immediately opens the circuit
      this.transitionTo(CircuitBreakerState.OPEN);
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we've exceeded threshold
      if (this.failures.length >= this.config.failureThreshold) {
        this.transitionTo(CircuitBreakerState.OPEN);
      }
    }
  }

  /**
   * Force the circuit to a specific state.
   */
  forceState(state: CircuitBreakerState): void {
    this.transitionTo(state);
  }

  /**
   * Get current stats.
   */
  getStats(): CircuitBreakerStats {
    this.cleanOldFailures();
    
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Get current state.
   */
  getState(): CircuitBreakerState {
    // Check for automatic state transitions
    if (this.state === CircuitBreakerState.OPEN && this.shouldAttemptReset()) {
      this.transitionTo(CircuitBreakerState.HALF_OPEN);
    }
    return this.state;
  }

  /**
   * Reset the circuit breaker.
   */
  reset(): void {
    this.failures = [];
    this.successes = 0;
    this.consecutiveSuccesses = 0;
    this.halfOpenRequestCount = 0;
    this.openedAt = null;
    this.transitionTo(CircuitBreakerState.CLOSED);
  }

  private shouldAttemptReset(): boolean {
    if (this.openedAt === null) return false;
    return Date.now() - this.openedAt >= this.config.resetTimeout;
  }

  private getRemainingResetTime(): number {
    if (this.openedAt === null) return 0;
    const elapsed = Date.now() - this.openedAt;
    return Math.max(0, this.config.resetTimeout - elapsed);
  }

  private transitionTo(newState: CircuitBreakerState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    if (newState === CircuitBreakerState.OPEN) {
      this.openedAt = Date.now();
      this.halfOpenRequestCount = 0;
    } else if (newState === CircuitBreakerState.CLOSED) {
      this.failures = [];
      this.openedAt = null;
      this.halfOpenRequestCount = 0;
    } else if (newState === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenRequestCount = 0;
      this.consecutiveSuccesses = 0;
    }

    if (this.config.onStateChange) {
      this.config.onStateChange(oldState, newState);
    }
  }

  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.rollingWindowMs;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
  }
}

/**
 * Error thrown when circuit is open.
 */
export class CircuitOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly retryAfterMs: number
  ) {
    super(`Circuit "${circuitName}" is open. Retry after ${retryAfterMs}ms`);
    this.name = 'CircuitOpenError';
  }
}
