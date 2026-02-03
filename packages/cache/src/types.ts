/**
 * Cache Types
 */

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  hits: Map<string, T>;
  misses: string[];
}

/**
 * Core cache interface
 */
export interface Cache {
  /**
   * Get a value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a value from cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if a key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Get multiple values at once (batch operation)
   */
  getMany<T>(keys: string[]): Promise<BatchResult<T>>;

  /**
   * Set multiple values at once (batch operation)
   */
  setMany<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void>;

  /**
   * Delete multiple keys at once
   */
  deleteMany(keys: string[]): Promise<number>;

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): Promise<number>;

  /**
   * Clear all entries
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   */
  stats(): Promise<CacheStats>;

  /**
   * Close the cache connection
   */
  close(): Promise<void>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}
