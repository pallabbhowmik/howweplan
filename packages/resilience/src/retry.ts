/**
 * Retry with Exponential Backoff
 * 
 * Automatically retries failed operations with configurable
 * backoff strategies.
 */

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  
  /** Initial delay in ms before first retry */
  initialDelayMs?: number;
  
  /** Maximum delay in ms between retries */
  maxDelayMs?: number;
  
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  
  /** Add random jitter to prevent thundering herd */
  jitter?: boolean;
  
  /** Function to determine if error should trigger retry */
  retryIf?: (error: unknown, attempt: number) => boolean;
  
  /** Callback called before each retry */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
  totalTimeMs: number;
}

const DEFAULT_CONFIG: Required<Omit<RetryConfig, 'retryIf' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Simple retry without backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts - 1) throw error;
    }
  }
  
  throw lastError;
}

/**
 * Retry with exponential backoff.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (config.retryIf && !config.retryIf(error, attempt)) {
        return {
          success: false,
          error,
          attempts: attempt,
          totalTimeMs: Date.now() - startTime,
        };
      }
      
      // Don't delay after last attempt
      if (attempt < cfg.maxAttempts) {
        const delay = calculateDelay(attempt, cfg);
        
        if (config.onRetry) {
          config.onRetry(error, attempt, delay);
        }
        
        await sleep(delay);
      }
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: cfg.maxAttempts,
    totalTimeMs: Date.now() - startTime,
  };
}

function calculateDelay(
  attempt: number,
  config: Required<Omit<RetryConfig, 'retryIf' | 'onRetry'>>
): number {
  // Exponential backoff
  let delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Cap at max delay
  delay = Math.min(delay, config.maxDelayMs);
  
  // Add jitter (0-50% of delay)
  if (config.jitter) {
    const jitter = delay * 0.5 * Math.random();
    delay = delay + jitter;
  }
  
  return Math.floor(delay);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retryable wrapper for a function.
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RetryConfig = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const result = await retryWithBackoff(() => fn(...args), config);
    
    if (!result.success) {
      throw result.error;
    }
    
    return result.result!;
  };
}

/**
 * Determine if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNREFUSED')) {
      return true;
    }
    
    // HTTP errors that might be transient
    if ('statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      return statusCode >= 500 || statusCode === 429 || statusCode === 408;
    }
  }
  
  return false;
}
