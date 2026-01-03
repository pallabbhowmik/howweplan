/**
 * Redis-backed Idempotency Store
 * 
 * Production-ready implementation using Redis for:
 * - Distributed lock acquisition
 * - Persistent storage across restarts
 * - Automatic TTL-based expiration
 */

import { createClient, RedisClientType } from 'redis';
import { IdempotencyStore, IdempotencyRecord, IdempotencyStatus } from './store';

export interface RedisIdempotencyStoreConfig {
  /** Redis connection URL */
  url?: string;
  /** Key prefix for namespacing */
  keyPrefix?: string;
  /** Existing Redis client to reuse */
  client?: RedisClientType;
}

export class RedisIdempotencyStore implements IdempotencyStore {
  private client: RedisClientType;
  private readonly keyPrefix: string;
  private readonly ownsClient: boolean;

  constructor(config: RedisIdempotencyStoreConfig = {}) {
    this.keyPrefix = config.keyPrefix || 'idempotency:';
    
    if (config.client) {
      this.client = config.client;
      this.ownsClient = false;
    } else {
      this.client = createClient({ url: config.url || 'redis://localhost:6379' });
      this.ownsClient = true;
    }
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async acquire(
    key: string,
    fingerprint: string,
    ttlSeconds: number
  ): Promise<{ acquired: boolean; record?: IdempotencyRecord }> {
    await this.connect();

    const redisKey = this.getKey(key);
    const now = new Date();

    // Try to set with NX (only if not exists)
    const record: IdempotencyRecord = {
      key,
      status: IdempotencyStatus.PROCESSING,
      fingerprint,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    };

    const result = await this.client.set(
      redisKey,
      JSON.stringify(record),
      { NX: true, EX: ttlSeconds }
    );

    if (result === 'OK') {
      return { acquired: true, record };
    }

    // Key exists, get existing record
    const existing = await this.get(key);
    return { acquired: false, record: existing || undefined };
  }

  async complete(
    key: string,
    statusCode: number,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<void> {
    await this.connect();

    const redisKey = this.getKey(key);
    const existing = await this.client.get(redisKey);
    
    if (existing) {
      const record: IdempotencyRecord = JSON.parse(existing);
      record.status = IdempotencyStatus.COMPLETED;
      record.statusCode = statusCode;
      record.body = body;
      record.headers = headers;

      // Calculate remaining TTL
      const remainingTtl = Math.max(
        1,
        Math.floor((new Date(record.expiresAt).getTime() - Date.now()) / 1000)
      );

      await this.client.set(redisKey, JSON.stringify(record), { EX: remainingTtl });
    }
  }

  async fail(key: string): Promise<void> {
    await this.connect();

    const redisKey = this.getKey(key);
    // On failure, delete the key so the request can be retried
    await this.client.del(redisKey);
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    await this.connect();

    const redisKey = this.getKey(key);
    const data = await this.client.get(redisKey);

    if (!data) return null;

    const record: IdempotencyRecord = JSON.parse(data);
    record.createdAt = new Date(record.createdAt);
    record.expiresAt = new Date(record.expiresAt);

    return record;
  }

  async delete(key: string): Promise<void> {
    await this.connect();
    await this.client.del(this.getKey(key));
  }

  async cleanup(): Promise<number> {
    // Redis handles TTL expiration automatically
    return 0;
  }

  async close(): Promise<void> {
    if (this.ownsClient && this.client.isOpen) {
      await this.client.quit();
    }
  }
}
