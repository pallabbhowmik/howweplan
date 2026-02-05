/**
 * Rate Limiting Middleware
 * 
 * Protects the API from abuse with configurable rate limits.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../env';
import { Logger } from '../services/logger.service';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production for distributed deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Track cleanup interval for graceful shutdown
let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * Stop the rate limit cleanup interval.
 * Call this during graceful shutdown.
 */
export function stopRateLimitCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

export function createRateLimitMiddleware(logger: Logger) {
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  // Cleanup old entries periodically (only start once)
  if (!cleanupIntervalId) {
    cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
          rateLimitStore.delete(key);
        }
      }
    }, windowMs);
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use user ID if authenticated, otherwise IP
    const identifier = req.user?.id ?? req.ip ?? 'unknown';
    const now = Date.now();

    let entry = rateLimitStore.get(identifier);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(identifier, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        identifier,
        count: entry.count,
        maxRequests,
      });

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
      });
      return;
    }

    next();
  };
}
