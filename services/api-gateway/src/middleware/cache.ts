import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Response Caching Middleware
 * Implements in-memory caching for safe, cacheable endpoints
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  etag: string;
  headers: Record<string, string>;
}

/**
 * Cache configuration per route pattern
 */
interface CacheConfig {
  path: string | RegExp;
  ttl: number; // Time to live in seconds
  methods: string[];
  varyBy?: string[]; // Headers to vary cache by
  userSpecific?: boolean; // If true, cache per user
}

/**
 * Default cache configurations
 */
const CACHE_CONFIGS: CacheConfig[] = [
  // Static/reference data - long cache
  { path: /^\/api\/destinations/, ttl: 3600, methods: ['GET'], userSpecific: false },
  { path: /^\/api\/categories/, ttl: 3600, methods: ['GET'], userSpecific: false },
  
  // Reviews - moderate cache
  { path: /^\/api\/reviews\/[^/]+$/, ttl: 300, methods: ['GET'], userSpecific: false },
  { path: /^\/api\/reviews\/?$/, ttl: 60, methods: ['GET'], userSpecific: false },
  
  // User-specific data - short cache
  { path: /^\/api\/notifications/, ttl: 30, methods: ['GET'], userSpecific: true },
  { path: /^\/api\/requests/, ttl: 60, methods: ['GET'], userSpecific: true },
  { path: /^\/api\/itineraries/, ttl: 60, methods: ['GET'], userSpecific: true },
  
  // Agent availability - very short cache
  { path: /^\/api\/agents\/available/, ttl: 10, methods: ['GET'], userSpecific: false },
];

/**
 * Simple in-memory cache store
 */
class CacheStore {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Generate cache key
   */
  generateKey(req: Request, userSpecific: boolean): string {
    const parts = [req.method, req.path];

    // Add query string
    const queryString = new URLSearchParams(req.query as any).toString();
    if (queryString) {
      parts.push(queryString);
    }

    // Add user ID if user-specific
    if (userSpecific && req.user?.userId) {
      parts.push(`user:${req.user.userId}`);
    }

    return parts.join('|');
  }

  /**
   * Generate ETag for response
   */
  generateETag(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }

  /**
   * Get cached response
   */
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Set cached response
   */
  set(key: string, data: any, ttl: number, headers: Record<string, string> = {}): CacheEntry {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      etag: this.generateETag(data),
      headers,
    };

    this.cache.set(key, entry);
    return entry;
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string | RegExp): number {
    let count = 0;
    this.cache.forEach((_, key) => {
      if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    });
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl * 1000) {
        this.cache.delete(key);
        removed++;
      }
    });

    if (removed > 0) {
      logger.debug({
        timestamp: new Date().toISOString(),
        event: 'cache_cleanup',
        removed,
        remaining: this.cache.size,
      });
    }
  }

  /**
   * Destroy the cache store
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Singleton cache store
export const cacheStore = new CacheStore();

/**
 * Find matching cache config for request
 */
function findCacheConfig(req: Request): CacheConfig | null {
  for (const config of CACHE_CONFIGS) {
    if (!config.methods.includes(req.method)) {
      continue;
    }

    if (typeof config.path === 'string') {
      if (req.path === config.path || req.path.startsWith(config.path + '/')) {
        return config;
      }
    } else if (config.path instanceof RegExp) {
      if (config.path.test(req.path)) {
        return config;
      }
    }
  }
  return null;
}

/**
 * Cache middleware - check for cached responses
 */
export function cacheMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only cache safe methods
  if (!['GET', 'HEAD'].includes(req.method)) {
    // Invalidate cache on mutations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const invalidated = cacheStore.invalidate(req.path);
      if (invalidated > 0) {
        logger.debug({
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          event: 'cache_invalidated',
          path: req.path,
          method: req.method,
          count: invalidated,
        });
      }
    }
    return next();
  }

  const cacheConfig = findCacheConfig(req);

  // No caching for this route
  if (!cacheConfig) {
    return next();
  }

  const cacheKey = cacheStore.generateKey(req, cacheConfig.userSpecific || false);
  const cached = cacheStore.get(cacheKey);

  if (cached) {
    // Check If-None-Match header (ETag)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === cached.etag) {
      logger.debug({
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        event: 'cache_not_modified',
        path: req.path,
      });
      res.status(304).end();
      return;
    }

    // Return cached response
    logger.debug({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      event: 'cache_hit',
      path: req.path,
      age: Math.round((Date.now() - cached.timestamp) / 1000),
    });

    res.set('X-Cache', 'HIT');
    res.set('ETag', cached.etag);
    res.set('Cache-Control', `max-age=${cacheConfig.ttl}`);
    res.set('Age', String(Math.round((Date.now() - cached.timestamp) / 1000)));

    // Restore original headers
    Object.entries(cached.headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    res.json(cached.data);
    return;
  }

  // Cache miss - intercept response to cache it
  const originalJson = res.json.bind(res);

  res.json = function (data: any): Response {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const entry = cacheStore.set(cacheKey, data, cacheConfig.ttl, {
        'Content-Type': 'application/json',
      });

      res.set('X-Cache', 'MISS');
      res.set('ETag', entry.etag);
      res.set('Cache-Control', `max-age=${cacheConfig.ttl}`);

      logger.debug({
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        event: 'cache_set',
        path: req.path,
        ttl: cacheConfig.ttl,
      });
    } else {
      res.set('X-Cache', 'SKIP');
    }

    return originalJson(data);
  };

  next();
}

/**
 * Cache control endpoint handlers
 */
export function getCacheStats(req: Request, res: Response): void {
  const stats = cacheStore.stats();
  res.json({
    size: stats.size,
    keys: stats.keys,
  });
}

export function clearCache(req: Request, res: Response): void {
  cacheStore.clear();
  logger.info({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    event: 'cache_cleared',
    userId: req.user?.userId,
  });
  res.json({ message: 'Cache cleared', success: true });
}

export function invalidateCachePattern(req: Request, res: Response): void {
  const { pattern } = req.body;
  if (!pattern) {
    res.status(400).json({ error: 'Pattern is required' });
    return;
  }

  const count = cacheStore.invalidate(pattern);
  logger.info({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    event: 'cache_pattern_invalidated',
    pattern,
    count,
    userId: req.user?.userId,
  });
  res.json({ message: `Invalidated ${count} cache entries`, count });
}
