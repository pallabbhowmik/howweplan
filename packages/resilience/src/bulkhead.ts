/**
 * Bulkhead Pattern
 * 
 * Limits concurrent operations to prevent resource exhaustion.
 * Named after ship bulkheads that prevent flooding from spreading.
 */

export interface BulkheadConfig {
  /** Name for logging */
  name: string;
  
  /** Maximum concurrent executions */
  maxConcurrent?: number;
  
  /** Maximum queue size for waiting requests */
  maxQueue?: number;
  
  /** Timeout in ms for queued requests */
  queueTimeoutMs?: number;
}

interface QueuedRequest<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  fn: () => Promise<T>;
  enqueueTime: number;
}

const DEFAULT_CONFIG = {
  maxConcurrent: 10,
  maxQueue: 100,
  queueTimeoutMs: 30000,
};

export class Bulkhead {
  private readonly config: Required<BulkheadConfig>;
  private running = 0;
  private queue: QueuedRequest<unknown>[] = [];
  private timeoutCheckInterval: NodeJS.Timeout | null = null;

  // Stats
  private totalExecuted = 0;
  private totalRejected = 0;
  private totalQueued = 0;
  private totalTimedOut = 0;

  constructor(config: BulkheadConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Start timeout checker
    this.timeoutCheckInterval = setInterval(() => {
      this.checkTimeouts();
    }, 1000);
  }

  /**
   * Execute a function with bulkhead protection.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we can run immediately
    if (this.running < this.config.maxConcurrent) {
      return this.runTask(fn);
    }

    // Check if queue is full
    if (this.queue.length >= this.config.maxQueue) {
      this.totalRejected++;
      throw new BulkheadFullError(this.config.name, this.queue.length);
    }

    // Queue the request
    this.totalQueued++;
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        fn: fn as () => Promise<unknown>,
        enqueueTime: Date.now(),
      });
    });
  }

  /**
   * Check if execution is allowed without queuing.
   */
  isAvailable(): boolean {
    return this.running < this.config.maxConcurrent;
  }

  /**
   * Get current stats.
   */
  getStats(): {
    running: number;
    queued: number;
    maxConcurrent: number;
    maxQueue: number;
    totalExecuted: number;
    totalRejected: number;
    totalQueued: number;
    totalTimedOut: number;
  } {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.config.maxConcurrent,
      maxQueue: this.config.maxQueue,
      totalExecuted: this.totalExecuted,
      totalRejected: this.totalRejected,
      totalQueued: this.totalQueued,
      totalTimedOut: this.totalTimedOut,
    };
  }

  /**
   * Shutdown the bulkhead.
   */
  shutdown(): void {
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = null;
    }

    // Reject all queued requests
    for (const request of this.queue) {
      request.reject(new Error('Bulkhead shutdown'));
    }
    this.queue = [];
  }

  private async runTask<T>(fn: () => Promise<T>): Promise<T> {
    this.running++;
    
    try {
      const result = await fn();
      this.totalExecuted++;
      return result;
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;
    if (this.running >= this.config.maxConcurrent) return;

    const request = this.queue.shift();
    if (!request) return;

    // Check if request has timed out
    const waitTime = Date.now() - request.enqueueTime;
    if (waitTime > this.config.queueTimeoutMs) {
      this.totalTimedOut++;
      request.reject(new BulkheadTimeoutError(this.config.name, waitTime));
      // Process next in queue
      this.processQueue();
      return;
    }

    this.runTask(request.fn)
      .then(request.resolve)
      .catch(request.reject);
  }

  private checkTimeouts(): void {
    const now = Date.now();
    const timedOut: number[] = [];

    for (let i = 0; i < this.queue.length; i++) {
      const request = this.queue[i];
      const waitTime = now - request.enqueueTime;
      
      if (waitTime > this.config.queueTimeoutMs) {
        timedOut.push(i);
        this.totalTimedOut++;
        request.reject(new BulkheadTimeoutError(this.config.name, waitTime));
      }
    }

    // Remove timed out requests (in reverse order to maintain indices)
    for (let i = timedOut.length - 1; i >= 0; i--) {
      this.queue.splice(timedOut[i], 1);
    }
  }
}

export class BulkheadFullError extends Error {
  constructor(
    public readonly bulkheadName: string,
    public readonly queueSize: number
  ) {
    super(`Bulkhead "${bulkheadName}" is full. Queue size: ${queueSize}`);
    this.name = 'BulkheadFullError';
  }
}

export class BulkheadTimeoutError extends Error {
  constructor(
    public readonly bulkheadName: string,
    public readonly waitTimeMs: number
  ) {
    super(`Bulkhead "${bulkheadName}" queue timeout after ${waitTimeMs}ms`);
    this.name = 'BulkheadTimeoutError';
  }
}
