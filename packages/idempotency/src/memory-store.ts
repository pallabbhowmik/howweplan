/**
 * In-Memory Idempotency Store
 * 
 * For development and testing only.
 * Does not persist across restarts.
 */

import { IdempotencyStore, IdempotencyRecord, IdempotencyStatus } from './store';

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs: number = 60000) {
    // Periodic cleanup of expired records
    this.cleanupInterval = setInterval(() => {
      void this.cleanup();
    }, cleanupIntervalMs);
  }

  async acquire(
    key: string,
    fingerprint: string,
    ttlSeconds: number
  ): Promise<{ acquired: boolean; record?: IdempotencyRecord }> {
    const existing = this.records.get(key);

    if (existing) {
      // Check if expired
      if (existing.expiresAt < new Date()) {
        this.records.delete(key);
      } else {
        return { acquired: false, record: existing };
      }
    }

    const now = new Date();
    const record: IdempotencyRecord = {
      key,
      status: IdempotencyStatus.PROCESSING,
      fingerprint,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    };

    this.records.set(key, record);
    return { acquired: true, record };
  }

  async complete(
    key: string,
    statusCode: number,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<void> {
    const record = this.records.get(key);
    if (record) {
      record.status = IdempotencyStatus.COMPLETED;
      record.statusCode = statusCode;
      record.body = body;
      record.headers = headers;
    }
  }

  async fail(key: string): Promise<void> {
    const record = this.records.get(key);
    if (record) {
      record.status = IdempotencyStatus.FAILED;
    }
  }

  async get(key: string): Promise<IdempotencyRecord | null> {
    const record = this.records.get(key);
    if (!record) return null;

    // Check expiration
    if (record.expiresAt < new Date()) {
      this.records.delete(key);
      return null;
    }

    return record;
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }

  async cleanup(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [key, record] of this.records) {
      if (record.expiresAt < now) {
        this.records.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.records.clear();
  }
}
