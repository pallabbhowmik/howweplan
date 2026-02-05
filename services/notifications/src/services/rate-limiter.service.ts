/**
 * Rate Limiter Service
 * 
 * Implements per-recipient rate limiting to prevent notification spam.
 * Uses sliding window algorithm with in-memory tracking.
 */

import { env } from '../config/env';
import { NotificationChannel } from '../providers/types';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiterService {
  private readonly limits: Map<NotificationChannel, number>;
  private readonly windows: Map<string, RateLimitEntry>;
  private readonly windowDurationMs = 60 * 60 * 1000; // 1 hour
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.limits = new Map([
      [NotificationChannel.EMAIL, env.RATE_LIMIT_EMAIL_PER_HOUR],
      [NotificationChannel.SMS, env.RATE_LIMIT_SMS_PER_HOUR],
      [NotificationChannel.PUSH, env.RATE_LIMIT_PUSH_PER_HOUR],
    ]);

    this.windows = new Map();

    // Clean up expired entries periodically
    this.cleanupIntervalId = setInterval(() => this.cleanup(), this.windowDurationMs);
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
   * Check if sending to recipient would exceed rate limit
   */
  isRateLimited(channel: NotificationChannel, recipient: string): boolean {
    const key = this.getKey(channel, recipient);
    const limit = this.limits.get(channel);

    if (!limit) {
      return false;
    }

    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry) {
      return false;
    }

    // Check if window has expired
    if (now - entry.windowStart >= this.windowDurationMs) {
      this.windows.delete(key);
      return false;
    }

    return entry.count >= limit;
  }

  /**
   * Record a send to recipient
   */
  recordSend(channel: NotificationChannel, recipient: string): void {
    const key = this.getKey(channel, recipient);
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now - entry.windowStart >= this.windowDurationMs) {
      // Start new window
      this.windows.set(key, { count: 1, windowStart: now });
    } else {
      // Increment existing window
      entry.count++;
    }
  }

  /**
   * Get remaining quota for recipient
   */
  getRemainingQuota(channel: NotificationChannel, recipient: string): number {
    const key = this.getKey(channel, recipient);
    const limit = this.limits.get(channel) ?? 0;
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now - entry.windowStart >= this.windowDurationMs) {
      return limit;
    }

    return Math.max(0, limit - entry.count);
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  getResetTime(channel: NotificationChannel, recipient: string): number {
    const key = this.getKey(channel, recipient);
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry) {
      return 0;
    }

    const resetAt = entry.windowStart + this.windowDurationMs;
    return Math.max(0, Math.ceil((resetAt - now) / 1000));
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.windows) {
      if (now - entry.windowStart >= this.windowDurationMs) {
        this.windows.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { entriesRemoved: cleaned });
    }
  }

  /**
   * Generate cache key
   */
  private getKey(channel: NotificationChannel, recipient: string): string {
    return `${channel}:${recipient.toLowerCase()}`;
  }
}
