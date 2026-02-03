/**
 * Cache Manager
 * 
 * High-level caching utilities with cache-aside pattern support.
 * Wraps the underlying cache implementation with convenience methods.
 */

import type { Cache, BatchResult } from './types.js';

export interface CacheConfig {
  cache: Cache;
  defaultTtlSeconds?: number;
}

/**
 * Options for cache-aside operations
 */
export interface CacheAsideOptions<T> {
  key: string;
  ttlSeconds?: number;
  fetch: () => Promise<T>;
  /**
   * If true, always fetch fresh data and update cache in background
   */
  staleWhileRevalidate?: boolean;
}

export class CacheManager {
  private readonly cache: Cache;
  private readonly defaultTtlSeconds: number;

  constructor(config: CacheConfig) {
    this.cache = config.cache;
    this.defaultTtlSeconds = config.defaultTtlSeconds ?? 300;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.cache.set(key, value, ttlSeconds ?? this.defaultTtlSeconds);
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Cache-aside pattern: get from cache, or fetch and cache if missing
   * 
   * This is the most common caching pattern:
   * 1. Check cache for value
   * 2. If found, return cached value
   * 3. If not found, fetch from source
   * 4. Cache the fetched value
   * 5. Return the value
   */
  async getOrFetch<T>(options: CacheAsideOptions<T>): Promise<T> {
    const { key, ttlSeconds, fetch, staleWhileRevalidate } = options;
    
    // Try cache first
    const cached = await this.cache.get<T>(key);
    
    if (cached !== null) {
      // Stale-while-revalidate: return cached but refresh in background
      if (staleWhileRevalidate) {
        this.refreshInBackground(key, fetch, ttlSeconds);
      }
      return cached;
    }

    // Cache miss - fetch from source
    const value = await fetch();
    
    // Cache the result
    await this.cache.set(key, value, ttlSeconds ?? this.defaultTtlSeconds);
    
    return value;
  }

  /**
   * Batch cache-aside: get multiple values, fetch missing ones
   * 
   * Optimized for batch operations:
   * 1. Get all keys from cache in single operation
   * 2. Identify missing keys
   * 3. Fetch only missing values
   * 4. Cache fetched values
   * 5. Return combined results
   */
  async getOrFetchMany<T>(
    keys: string[],
    fetchMissing: (missingKeys: string[]) => Promise<Map<string, T>>,
    ttlSeconds?: number
  ): Promise<Map<string, T>> {
    if (keys.length === 0) {
      return new Map();
    }

    // Batch get from cache
    const { hits, misses } = await this.cache.getMany<T>(keys);

    if (misses.length === 0) {
      // All keys found in cache
      return hits;
    }

    // Fetch missing values
    const fetched = await fetchMissing(misses);

    // Cache fetched values
    if (fetched.size > 0) {
      await this.cache.setMany(fetched, ttlSeconds ?? this.defaultTtlSeconds);
    }

    // Combine hits and fetched
    for (const [key, value] of fetched) {
      hits.set(key, value);
    }

    return hits;
  }

  /**
   * Invalidate cache entries by pattern
   * Useful for clearing related cache entries
   */
  async invalidatePattern(pattern: string): Promise<number> {
    return this.cache.deletePattern(pattern);
  }

  /**
   * Invalidate cache entries for a specific entity
   * Convention: entity:type:id:*
   */
  async invalidateEntity(entityType: string, entityId: string): Promise<number> {
    return this.cache.deletePattern(`${entityType}:${entityId}:*`);
  }

  /**
   * Get cache statistics
   */
  async stats() {
    return this.cache.stats();
  }

  /**
   * Close the cache connection
   */
  async close() {
    return this.cache.close();
  }

  /**
   * Refresh cache entry in background (non-blocking)
   */
  private refreshInBackground<T>(
    key: string,
    fetch: () => Promise<T>,
    ttlSeconds?: number
  ): void {
    // Fire and forget - don't await
    fetch()
      .then(value => this.cache.set(key, value, ttlSeconds ?? this.defaultTtlSeconds))
      .catch(err => console.error(`[CacheManager] Background refresh failed for ${key}:`, err));
  }
}
