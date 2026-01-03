/**
 * Dead Letter Queue
 * 
 * Stores failed events for later processing or manual intervention.
 * Critical for ensuring no events are lost.
 */

import { createClient, RedisClientType } from 'redis';

export interface DeadLetterQueueConfig {
  /** Redis connection URL */
  redisUrl?: string;
  
  /** Queue name prefix */
  queuePrefix?: string;
  
  /** Maximum age of items in days before auto-purge */
  maxAgeDays?: number;
  
  /** Existing Redis client */
  client?: RedisClientType;
}

export interface DeadLetterRecord {
  /** Unique ID */
  id: string;
  
  /** Original event type */
  eventType: string;
  
  /** Original event payload */
  payload: unknown;
  
  /** Error that caused the failure */
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  
  /** Number of processing attempts */
  attempts: number;
  
  /** First failure timestamp */
  firstFailedAt: string;
  
  /** Last failure timestamp */
  lastFailedAt: string;
  
  /** Original correlation ID */
  correlationId?: string;
  
  /** Service that produced the failure */
  sourceService: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

const DEFAULT_CONFIG = {
  queuePrefix: 'dlq:',
  maxAgeDays: 30,
};

export class DeadLetterQueue {
  private client: RedisClientType;
  private readonly config: Required<Omit<DeadLetterQueueConfig, 'client' | 'redisUrl'>> & 
    Pick<DeadLetterQueueConfig, 'redisUrl'>;
  private readonly ownsClient: boolean;

  constructor(config: DeadLetterQueueConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    if (config.client) {
      this.client = config.client;
      this.ownsClient = false;
    } else {
      this.client = createClient({ url: config.redisUrl || 'redis://localhost:6379' });
      this.ownsClient = true;
    }
  }

  private getQueueKey(eventType: string): string {
    return `${this.config.queuePrefix}${eventType}`;
  }

  private getIndexKey(): string {
    return `${this.config.queuePrefix}index`;
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * Add a failed event to the dead letter queue.
   */
  async enqueue(
    eventType: string,
    payload: unknown,
    error: Error,
    metadata: {
      sourceService: string;
      correlationId?: string;
      attempts?: number;
      existingId?: string;
    }
  ): Promise<string> {
    await this.connect();

    const now = new Date().toISOString();
    const id = metadata.existingId || `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const record: DeadLetterRecord = {
      id,
      eventType,
      payload,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      attempts: metadata.attempts || 1,
      firstFailedAt: now,
      lastFailedAt: now,
      correlationId: metadata.correlationId,
      sourceService: metadata.sourceService,
    };

    const queueKey = this.getQueueKey(eventType);

    // Store the record
    await this.client.hSet(queueKey, id, JSON.stringify(record));

    // Add to index for listing all event types
    await this.client.sAdd(this.getIndexKey(), eventType);

    return id;
  }

  /**
   * Get a specific dead letter record.
   */
  async get(eventType: string, id: string): Promise<DeadLetterRecord | null> {
    await this.connect();

    const data = await this.client.hGet(this.getQueueKey(eventType), id);
    if (!data) return null;

    return JSON.parse(data);
  }

  /**
   * List all dead letter records for an event type.
   */
  async list(
    eventType: string,
    options?: { limit?: number; offset?: number }
  ): Promise<DeadLetterRecord[]> {
    await this.connect();

    const queueKey = this.getQueueKey(eventType);
    const all = await this.client.hGetAll(queueKey);

    const records = Object.values(all)
      .map(data => JSON.parse(data as string) as DeadLetterRecord)
      .sort((a, b) => 
        new Date(b.lastFailedAt).getTime() - new Date(a.lastFailedAt).getTime()
      );

    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      return records.slice(start, end);
    }

    return records;
  }

  /**
   * Get all event types with dead letters.
   */
  async getEventTypes(): Promise<string[]> {
    await this.connect();
    return this.client.sMembers(this.getIndexKey());
  }

  /**
   * Get counts per event type.
   */
  async getCounts(): Promise<Record<string, number>> {
    await this.connect();

    const eventTypes = await this.getEventTypes();
    const counts: Record<string, number> = {};

    for (const eventType of eventTypes) {
      const count = await this.client.hLen(this.getQueueKey(eventType));
      counts[eventType] = count;
    }

    return counts;
  }

  /**
   * Remove a record (after successful reprocessing or manual dismissal).
   */
  async remove(eventType: string, id: string): Promise<boolean> {
    await this.connect();

    const queueKey = this.getQueueKey(eventType);
    const deleted = await this.client.hDel(queueKey, id);

    // Check if queue is now empty and clean up index
    const remaining = await this.client.hLen(queueKey);
    if (remaining === 0) {
      await this.client.sRem(this.getIndexKey(), eventType);
    }

    return deleted > 0;
  }

  /**
   * Retry a dead letter record.
   * Returns the record so it can be reprocessed.
   */
  async dequeue(eventType: string, id: string): Promise<DeadLetterRecord | null> {
    await this.connect();

    const record = await this.get(eventType, id);
    if (!record) return null;

    // Update attempt count
    record.attempts++;
    record.lastFailedAt = new Date().toISOString();

    // Keep in queue but update
    await this.client.hSet(
      this.getQueueKey(eventType),
      id,
      JSON.stringify(record)
    );

    return record;
  }

  /**
   * Purge old records.
   */
  async purgeOld(): Promise<number> {
    await this.connect();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.maxAgeDays);
    const cutoffTime = cutoff.getTime();

    let purged = 0;
    const eventTypes = await this.getEventTypes();

    for (const eventType of eventTypes) {
      const records = await this.list(eventType);
      
      for (const record of records) {
        if (new Date(record.firstFailedAt).getTime() < cutoffTime) {
          await this.remove(eventType, record.id);
          purged++;
        }
      }
    }

    return purged;
  }

  /**
   * Get total count of all dead letters.
   */
  async getTotalCount(): Promise<number> {
    const counts = await this.getCounts();
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }

  async close(): Promise<void> {
    if (this.ownsClient && this.client.isOpen) {
      await this.client.quit();
    }
  }
}
