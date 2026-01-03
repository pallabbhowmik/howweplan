/**
 * Dead Letter Queue (DLQ)
 * 
 * Handles events that failed delivery:
 * - Store failed events
 * - Track failure count
 * - Support manual retry
 * - Support discarding poison messages
 * 
 * Failure Strategy:
 * - Temporary failure → Retry with backoff
 * - Schema invalid → Reject immediately
 * - Consumer crash → Retry
 * - Max retries exceeded → Move to DLQ
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEnvelope, DeadLetterEntry } from '../types/event.types';
import { logger } from '../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface DLQConfig {
  /** Maximum retries before moving to DLQ */
  maxRetries: number;
  /** Initial retry delay in ms */
  initialDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Maximum delay between retries */
  maxDelayMs: number;
  /** How long to keep resolved entries (ms) */
  retentionMs: number;
}

const DEFAULT_CONFIG: DLQConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 60000,
  retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ============================================================================
// DLQ STORAGE INTERFACE
// ============================================================================

export interface DLQStorageBackend {
  add(entry: DeadLetterEntry): Promise<void>;
  update(entry: DeadLetterEntry): Promise<void>;
  get(dlqId: string): Promise<DeadLetterEntry | null>;
  getByEventId(eventId: string, consumerId: string): Promise<DeadLetterEntry | null>;
  list(options: {
    status?: DeadLetterEntry['status'];
    consumerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<DeadLetterEntry[]>;
  remove(dlqId: string): Promise<void>;
  count(status?: DeadLetterEntry['status']): Promise<number>;
}

// ============================================================================
// IN-MEMORY DLQ STORAGE
// ============================================================================

export class InMemoryDLQStorage implements DLQStorageBackend {
  private entries: Map<string, DeadLetterEntry> = new Map();
  
  async add(entry: DeadLetterEntry): Promise<void> {
    this.entries.set(entry.dlq_id, entry);
  }
  
  async update(entry: DeadLetterEntry): Promise<void> {
    this.entries.set(entry.dlq_id, entry);
  }
  
  async get(dlqId: string): Promise<DeadLetterEntry | null> {
    return this.entries.get(dlqId) || null;
  }
  
  async getByEventId(eventId: string, consumerId: string): Promise<DeadLetterEntry | null> {
    for (const entry of this.entries.values()) {
      if (entry.event_id === eventId && entry.consumer_id === consumerId) {
        return entry;
      }
    }
    return null;
  }
  
  async list(options: {
    status?: DeadLetterEntry['status'];
    consumerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<DeadLetterEntry[]> {
    let results = Array.from(this.entries.values());
    
    if (options.status) {
      results = results.filter(e => e.status === options.status);
    }
    
    if (options.consumerId) {
      results = results.filter(e => e.consumer_id === options.consumerId);
    }
    
    // Sort by last failed time (newest first)
    results.sort((a, b) => 
      new Date(b.last_failed_at).getTime() - new Date(a.last_failed_at).getTime()
    );
    
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    
    return results.slice(offset, offset + limit);
  }
  
  async remove(dlqId: string): Promise<void> {
    this.entries.delete(dlqId);
  }
  
  async count(status?: DeadLetterEntry['status']): Promise<number> {
    if (!status) return this.entries.size;
    return Array.from(this.entries.values()).filter(e => e.status === status).length;
  }
  
  // For testing
  clear(): void {
    this.entries.clear();
  }
}

// ============================================================================
// DEAD LETTER QUEUE SERVICE
// ============================================================================

export class DeadLetterQueue {
  private storage: DLQStorageBackend;
  private config: DLQConfig;
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(storage: DLQStorageBackend, config: Partial<DLQConfig> = {}) {
    this.storage = storage;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a delivery failure
   */
  async recordFailure(
    event: EventEnvelope,
    consumerId: string,
    error: Error | string
  ): Promise<DeadLetterEntry> {
    const errorMessage = error instanceof Error ? error.message : error;
    const now = new Date().toISOString();
    
    // Check if entry already exists
    let entry = await this.storage.getByEventId(event.event_id, consumerId);
    
    if (entry) {
      // Update existing entry
      entry = {
        ...entry,
        failure_count: entry.failure_count + 1,
        last_failed_at: now,
        last_error: errorMessage,
        status: entry.failure_count + 1 >= this.config.maxRetries ? 'pending' : 'retrying',
      };
      await this.storage.update(entry);
    } else {
      // Create new entry
      entry = {
        dlq_id: uuidv4(),
        event_id: event.event_id,
        event,
        consumer_id: consumerId,
        failure_count: 1,
        first_failed_at: now,
        last_failed_at: now,
        last_error: errorMessage,
        status: 'retrying',
      };
      await this.storage.add(entry);
    }
    
    logger.warn('Event delivery failure recorded', {
      dlq_id: entry.dlq_id,
      event_id: event.event_id,
      event_type: event.event_type,
      consumer_id: consumerId,
      failure_count: entry.failure_count,
      status: entry.status,
    });
    
    return entry;
  }

  /**
   * Calculate next retry delay using exponential backoff
   */
  calculateRetryDelay(failureCount: number): number {
    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, failureCount - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Check if event should be retried
   */
  shouldRetry(entry: DeadLetterEntry): boolean {
    return entry.failure_count < this.config.maxRetries && entry.status === 'retrying';
  }

  /**
   * Schedule a retry for an entry
   */
  scheduleRetry(
    entry: DeadLetterEntry,
    retryFn: (event: EventEnvelope, consumerId: string) => Promise<void>
  ): void {
    if (!this.shouldRetry(entry)) {
      logger.info('Entry not eligible for retry', {
        dlq_id: entry.dlq_id,
        failure_count: entry.failure_count,
        status: entry.status,
      });
      return;
    }
    
    const delay = this.calculateRetryDelay(entry.failure_count);
    
    logger.info('Scheduling retry', {
      dlq_id: entry.dlq_id,
      event_id: entry.event_id,
      delay_ms: delay,
      attempt: entry.failure_count + 1,
    });
    
    const timeoutId = setTimeout(async () => {
      this.retryQueue.delete(entry.dlq_id);
      
      try {
        await retryFn(entry.event, entry.consumer_id);
        await this.markResolved(entry.dlq_id);
      } catch (error) {
        await this.recordFailure(
          entry.event,
          entry.consumer_id,
          error instanceof Error ? error : String(error)
        );
      }
    }, delay);
    
    this.retryQueue.set(entry.dlq_id, timeoutId);
  }

  /**
   * Mark an entry as resolved (successful retry)
   */
  async markResolved(dlqId: string): Promise<void> {
    const entry = await this.storage.get(dlqId);
    if (!entry) return;
    
    entry.status = 'resolved';
    await this.storage.update(entry);
    
    logger.info('DLQ entry resolved', {
      dlq_id: dlqId,
      event_id: entry.event_id,
      consumer_id: entry.consumer_id,
    });
  }

  /**
   * Manually discard a poison message
   */
  async discard(dlqId: string, reason: string): Promise<void> {
    const entry = await this.storage.get(dlqId);
    if (!entry) return;
    
    entry.status = 'discarded';
    entry.last_error = `Discarded: ${reason}`;
    await this.storage.update(entry);
    
    // Cancel any scheduled retry
    const timeout = this.retryQueue.get(dlqId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryQueue.delete(dlqId);
    }
    
    logger.warn('DLQ entry discarded', {
      dlq_id: dlqId,
      event_id: entry.event_id,
      reason,
    });
  }

  /**
   * Manually retry an entry
   */
  async manualRetry(
    dlqId: string,
    retryFn: (event: EventEnvelope, consumerId: string) => Promise<void>
  ): Promise<boolean> {
    const entry = await this.storage.get(dlqId);
    if (!entry || entry.status === 'discarded' || entry.status === 'resolved') {
      return false;
    }
    
    try {
      await retryFn(entry.event, entry.consumer_id);
      await this.markResolved(dlqId);
      return true;
    } catch (error) {
      await this.recordFailure(
        entry.event,
        entry.consumer_id,
        error instanceof Error ? error : String(error)
      );
      return false;
    }
  }

  /**
   * List DLQ entries
   */
  async list(options: {
    status?: DeadLetterEntry['status'];
    consumerId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<DeadLetterEntry[]> {
    return this.storage.list(options);
  }

  /**
   * Get DLQ entry by ID
   */
  async get(dlqId: string): Promise<DeadLetterEntry | null> {
    return this.storage.get(dlqId);
  }

  /**
   * Get DLQ size
   */
  async getSize(status?: DeadLetterEntry['status']): Promise<number> {
    return this.storage.count(status);
  }

  /**
   * Get pending (not yet processed) count
   */
  async getPendingCount(): Promise<number> {
    return this.storage.count('pending');
  }

  /**
   * Cleanup old resolved/discarded entries
   */
  async cleanup(): Promise<number> {
    const cutoff = new Date(Date.now() - this.config.retentionMs).toISOString();
    const entries = await this.storage.list({});
    
    let removed = 0;
    for (const entry of entries) {
      if (
        (entry.status === 'resolved' || entry.status === 'discarded') &&
        entry.last_failed_at < cutoff
      ) {
        await this.storage.remove(entry.dlq_id);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.info('DLQ cleanup completed', { removed });
    }
    
    return removed;
  }

  /**
   * Stop all pending retries (for graceful shutdown)
   */
  shutdown(): void {
    for (const timeout of this.retryQueue.values()) {
      clearTimeout(timeout);
    }
    this.retryQueue.clear();
    logger.info('DLQ shutdown complete');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let dlqInstance: DeadLetterQueue | null = null;

export function getDeadLetterQueue(): DeadLetterQueue {
  if (!dlqInstance) {
    const storage = new InMemoryDLQStorage();
    dlqInstance = new DeadLetterQueue(storage);
  }
  return dlqInstance;
}

export function createDeadLetterQueue(
  storage: DLQStorageBackend,
  config?: Partial<DLQConfig>
): DeadLetterQueue {
  dlqInstance = new DeadLetterQueue(storage, config);
  return dlqInstance;
}
