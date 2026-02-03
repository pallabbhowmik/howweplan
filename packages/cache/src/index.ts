/**
 * TripComposer Caching Package
 * 
 * Provides a unified caching interface with multiple backends:
 * - Redis (recommended for production)
 * - In-Memory LRU (for local development/testing)
 * 
 * Features:
 * - TTL support
 * - LRU eviction (memory cache)
 * - Automatic serialization
 * - Cache-aside pattern helpers
 * - Batch operations
 */

export { CacheManager, type CacheConfig } from './cache-manager.js';
export { RedisCache, type RedisCacheConfig } from './redis-cache.js';
export { MemoryCache, type MemoryCacheConfig } from './memory-cache.js';
export { createCache } from './factory.js';
export type { Cache, CacheEntry, BatchResult } from './types.js';
