/**
 * Messaging Service - Rate Limiting Service
 *
 * Prevents spam and abuse by limiting message frequency.
 */

import { config } from '../env';
import { Errors } from '../api/errors';

// =============================================================================
// RATE LIMIT STORE (In-memory for development, Redis for production)
// =============================================================================

interface RateLimitWindow {
  count: number;
  windowStart: number;
  expiresAt: number;
}

const rateLimitStore = new Map<string, RateLimitWindow>();

// =============================================================================
// RATE LIMITING SERVICE
// =============================================================================

export class RateLimitService {
  /**
   * Checks and increments the message rate limit for a user.
   * @throws {ApiError} If rate limit is exceeded
   */
  async checkMessageRateLimit(userId: string): Promise<void> {
    const key = `messages:${userId}`;
    const limit = config.rateLimits.messagesPerMinute;
    const windowMs = 60 * 1000; // 1 minute

    await this.checkRateLimit(key, limit, windowMs, () =>
      Errors.MESSAGE_RATE_LIMITED(limit)
    );
  }

  /**
   * Checks and increments the conversation creation rate limit for a user.
   * @throws {ApiError} If rate limit is exceeded
   */
  async checkConversationRateLimit(userId: string): Promise<void> {
    const key = `conversations:${userId}`;
    const limit = config.rateLimits.conversationsPerHour;
    const windowMs = 60 * 60 * 1000; // 1 hour

    await this.checkRateLimit(key, limit, windowMs, () =>
      Errors.CONVERSATION_RATE_LIMITED(limit)
    );
  }

  /**
   * Gets the current rate limit status for a user.
   */
  async getRateLimitStatus(
    userId: string,
    type: 'messages' | 'conversations'
  ): Promise<{
    remaining: number;
    limit: number;
    resetAt: Date;
  }> {
    const key = `${type}:${userId}`;
    const limit =
      type === 'messages'
        ? config.rateLimits.messagesPerMinute
        : config.rateLimits.conversationsPerHour;
    const windowMs =
      type === 'messages' ? 60 * 1000 : 60 * 60 * 1000;

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.expiresAt < now) {
      return {
        remaining: limit,
        limit,
        resetAt: new Date(now + windowMs),
      };
    }

    return {
      remaining: Math.max(0, limit - entry.count),
      limit,
      resetAt: new Date(entry.expiresAt),
    };
  }

  /**
   * Resets the rate limit for a user (admin action).
   */
  async resetRateLimit(
    userId: string,
    type: 'messages' | 'conversations'
  ): Promise<void> {
    const key = `${type}:${userId}`;
    rateLimitStore.delete(key);
  }

  /**
   * Generic rate limit check implementation.
   */
  private async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    _errorFactory: () => Error
  ): Promise<void> {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    // If no entry or window expired, create new window
    if (!entry || entry.expiresAt < now) {
      rateLimitStore.set(key, {
        count: 1,
        windowStart: now,
        expiresAt: now + windowMs,
      });
      return;
    }

    // Check if limit exceeded
    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.expiresAt - now) / 1000);
      throw Errors.RATE_LIMITED(retryAfter);
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);
  }

  /**
   * Cleanup expired entries (should be called periodically).
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.expiresAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService();

// Track cleanup interval for graceful shutdown
let rateLimitCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Stop the rate limit cleanup interval.
 * Call this during graceful shutdown.
 */
export function stopRateLimitCleanup(): void {
  if (rateLimitCleanupInterval) {
    clearInterval(rateLimitCleanupInterval);
    rateLimitCleanupInterval = null;
  }
}

// Cleanup expired entries every minute
rateLimitCleanupInterval = setInterval(() => {
  rateLimitService.cleanup();
}, 60 * 1000);
