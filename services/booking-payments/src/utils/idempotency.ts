/**
 * Idempotency Utility
 *
 * Provides idempotency key storage to prevent duplicate operations.
 * Uses in-memory store for development, Redis in production.
 */

import { config } from '../env.js';
import { logger } from '../services/logger.service.js';

/** Stored idempotency entry */
interface IdempotencyEntry {
  readonly key: string;
  readonly value: unknown;
  readonly expiresAt: Date;
}

/** Idempotency store for preventing duplicate operations */
class IdempotencyStore {
  private readonly store: Map<string, IdempotencyEntry>;
  private readonly ttlSeconds: number;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.store = new Map();
    this.ttlSeconds = config.limits.idempotencyTtlSeconds;

    // Periodic cleanup of expired entries
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Stop the cleanup interval.
   * Call this during graceful shutdown.
   */
  stop(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Get a stored value by idempotency key.
   * Returns undefined if not found or expired.
   */
  get<T = unknown>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);

    if (!entry) {
      return Promise.resolve(undefined);
    }

    // Check expiration
    if (new Date() > entry.expiresAt) {
      this.store.delete(key);
      return Promise.resolve(undefined);
    }

    logger.debug({ key }, 'Idempotency cache hit');
    return Promise.resolve(entry.value as T);
  }

  /**
   * Store a value with an idempotency key.
   */
  set(key: string, value: unknown): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.ttlSeconds);

    this.store.set(key, {
      key,
      value,
      expiresAt,
    });

    logger.debug(
      {
        key,
        expiresAt: expiresAt.toISOString(),
      },
      'Idempotency key stored'
    );

    return Promise.resolve();
  }

  /**
   * Check if a key exists and is not expired.
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Delete an idempotency key.
   */
  delete(key: string): Promise<void> {
    this.store.delete(key);

    return Promise.resolve();
  }

  /**
   * Clean up expired entries.
   */
  private cleanup(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug({ cleaned }, 'Idempotency store cleanup');
    }
  }
}

export const idempotencyStore = new IdempotencyStore();
