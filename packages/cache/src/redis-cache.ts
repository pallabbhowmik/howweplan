/**
 * Redis Cache Implementation
 * 
 * Production-ready caching with Redis backend.
 * Supports clustering, high availability, and horizontal scaling.
 * 
 * Time Complexity (Redis operations):
 * - get: O(1)
 * - set: O(1)
 * - delete: O(1)
 * - getMany (MGET): O(n)
 * - setMany (pipeline): O(n)
 */

import Redis from 'ioredis';
import type { Cache, CacheStats, BatchResult } from './types.js';

export interface RedisCacheConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTtlSeconds?: number;
  connectTimeout?: number;
  maxRetriesPerRequest?: number;
}

export class RedisCache implements Cache {
  private readonly client: Redis;
  private readonly keyPrefix: string;
  private readonly defaultTtlSeconds: number;
  
  // Local statistics (not distributed)
  private hits = 0;
  private misses = 0;

  constructor(config: RedisCacheConfig = {}) {
    this.keyPrefix = config.keyPrefix ?? 'tc:';
    this.defaultTtlSeconds = config.defaultTtlSeconds ?? 300;

    // Initialize Redis client
    if (config.url) {
      this.client = new Redis(config.url, {
        keyPrefix: this.keyPrefix,
        connectTimeout: config.connectTimeout ?? 5000,
        maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
        lazyConnect: true,
      });
    } else {
      this.client = new Redis({
        host: config.host ?? 'localhost',
        port: config.port ?? 6379,
        password: config.password,
        db: config.db ?? 0,
        keyPrefix: this.keyPrefix,
        connectTimeout: config.connectTimeout ?? 5000,
        maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
        lazyConnect: true,
      });
    }

    // Handle errors
    this.client.on('error', (err: Error) => {
      console.error('[RedisCache] Connection error:', err.message);
    });
  }

  /**
   * Ensure connection is established
   */
  private async ensureConnected(): Promise<void> {
    if (this.client.status === 'ready') return;
    if (this.client.status === 'connecting') {
      await new Promise<void>((resolve, reject) => {
        this.client.once('ready', resolve);
        this.client.once('error', reject);
      });
      return;
    }
    await this.client.connect();
  }

  private prefixKey(key: string): string {
    // ioredis handles prefix automatically, but we return full key for logging
    return key;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureConnected();
    
    const data = await this.client.get(key);
    
    if (data === null) {
      this.misses++;
      return null;
    }

    this.hits++;
    
    try {
      return JSON.parse(data) as T;
    } catch {
      // Return raw string if not JSON
      return data as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.ensureConnected();
    
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const serialized = JSON.stringify(value);

    if (ttl > 0) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.del(key);
    return result > 0;
  }

  async has(key: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.exists(key);
    return result > 0;
  }

  /**
   * Batch get using MGET - O(n) single round trip
   */
  async getMany<T>(keys: string[]): Promise<BatchResult<T>> {
    if (keys.length === 0) {
      return { hits: new Map(), misses: [] };
    }

    await this.ensureConnected();
    
    const results = await this.client.mget(...keys);
    const hits = new Map<string, T>();
    const misses: string[] = [];

    for (let i = 0; i < keys.length; i++) {
      const data = results[i];
      if (data !== null) {
        try {
          hits.set(keys[i], JSON.parse(data) as T);
          this.hits++;
        } catch {
          hits.set(keys[i], data as unknown as T);
          this.hits++;
        }
      } else {
        misses.push(keys[i]);
        this.misses++;
      }
    }

    return { hits, misses };
  }

  /**
   * Batch set using pipeline - O(n) single round trip
   */
  async setMany<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
    if (entries.size === 0) return;

    await this.ensureConnected();
    
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const pipeline = this.client.pipeline();

    for (const [key, value] of entries) {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        pipeline.setex(key, ttl, serialized);
      } else {
        pipeline.set(key, serialized);
      }
    }

    await pipeline.exec();
  }

  async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    
    await this.ensureConnected();
    return this.client.del(...keys);
  }

  /**
   * Delete keys matching pattern using SCAN (non-blocking)
   */
  async deletePattern(pattern: string): Promise<number> {
    await this.ensureConnected();
    
    let deleted = 0;
    let cursor = '0';

    do {
      // SCAN is non-blocking unlike KEYS
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      
      cursor = nextCursor;
      
      if (keys.length > 0) {
        // Remove prefix from keys since ioredis adds it back
        const unprefixedKeys = keys.map((k: string) => 
          k.startsWith(this.keyPrefix) ? k.slice(this.keyPrefix.length) : k
        );
        deleted += await this.client.del(...unprefixedKeys);
      }
    } while (cursor !== '0');

    return deleted;
  }

  async clear(): Promise<void> {
    await this.deletePattern('*');
    this.hits = 0;
    this.misses = 0;
  }

  async stats(): Promise<CacheStats> {
    await this.ensureConnected();
    
    // Get key count using DBSIZE (fast O(1) operation)
    const size = await this.client.dbsize();
    const total = this.hits + this.misses;
    
    return {
      hits: this.hits,
      misses: this.misses,
      size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}
