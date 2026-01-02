import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';
import { logger } from './logger';

/**
 * Rate Limiting Configuration
 * Different limits for different operation types
 */

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Default key generator - combines IP and user ID if available
 */
const defaultKeyGenerator = (req: Request): string => {
  const userId = req.user?.userId || 'anonymous';
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  return `${ip}-${userId}`;
};

/**
 * Create a rate limiter with consistent configuration
 */
function createLimiter(cfg: RateLimitConfig) {
  return rateLimit({
    windowMs: cfg.windowMs,
    max: cfg.max,
    message: {
      error: 'Too Many Requests',
      message: cfg.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(cfg.windowMs / 1000),
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    keyGenerator: cfg.keyGenerator || defaultKeyGenerator,
    handler: (req: Request, res: Response) => {
      logger.warn({
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        ip: req.ip || 'unknown',
        userId: req.user?.userId,
        warning: 'Rate limit exceeded',
        limit: cfg.max,
        window: `${cfg.windowMs / 1000}s`,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: cfg.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(cfg.windowMs / 1000),
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ready';
    },
  });
}

/**
 * Global rate limiter - applies to all requests
 */
export const globalRateLimiter = createLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests, please try again later',
});

/**
 * Authentication rate limiter - stricter limits for auth endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 login attempts per minute
  message: 'Too many authentication attempts, please try again after 1 minute',
  keyGenerator: (req: Request) => {
    // For auth, use IP + email/username if provided
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const identifier = req.body?.email || req.body?.username || '';
    return `auth-${ip}-${identifier}`;
  },
});

/**
 * Write operations rate limiter - moderate limits
 * For POST, PUT, PATCH, DELETE operations
 */
export const writeRateLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 write operations per minute
  message: 'Too many write operations, please slow down',
});

/**
 * Read operations rate limiter - more generous limits
 * For GET operations
 */
export const readRateLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 read operations per minute
  message: 'Too many read requests, please slow down',
});

/**
 * Sensitive operations rate limiter - very strict
 * For password reset, email change, etc.
 */
export const sensitiveRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per 15 minutes
  message: 'Too many sensitive operation requests, please try again later',
});

/**
 * Middleware to apply appropriate rate limiter based on endpoint
 */
export function adaptiveRateLimiter(req: Request, res: Response, next: () => void): void {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();

  // Auth endpoints - strictest
  if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
    return authRateLimiter(req, res, next);
  }

  // Sensitive operations
  if (
    path.includes('/password') ||
    path.includes('/email/change') ||
    path.includes('/account/delete')
  ) {
    return sensitiveRateLimiter(req, res, next);
  }

  // Write operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return writeRateLimiter(req, res, next);
  }

  // Read operations
  if (method === 'GET') {
    return readRateLimiter(req, res, next);
  }

  // Default
  return globalRateLimiter(req, res, next);
}

/**
 * Per-user rate limiter for API key-based access
 */
export const apiKeyRateLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per API key
  message: 'API rate limit exceeded',
  keyGenerator: (req: Request) => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || defaultKeyGenerator(req);
  },
});
