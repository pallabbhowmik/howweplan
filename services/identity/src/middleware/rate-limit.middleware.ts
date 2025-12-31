/**
 * Rate limiting middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../env.js';
import { AuthenticatedRequest } from './auth.middleware.js';

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY RATE LIMIT STORE
// ─────────────────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the rate limit key from the request.
 * Uses authenticated user ID if available, otherwise IP address.
 */
function getRateLimitKey(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.identity?.sub) {
    return `user:${authReq.identity.sub}`;
  }
  return `ip:${authReq.clientIp ?? req.socket.remoteAddress ?? 'unknown'}`;
}

/**
 * Rate limiting middleware.
 */
export function rateLimit(
  maxRequests: number = env.RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = env.RATE_LIMIT_WINDOW_MS
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getRateLimitKey(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: {
            retryAfterSeconds: resetSeconds,
          },
        },
        requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Stricter rate limit for sensitive endpoints (e.g., login, registration).
 */
export function strictRateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return rateLimit(maxRequests, windowMs);
}
