/**
 * Cache Factory
 * 
 * Creates the appropriate cache implementation based on configuration.
 */

import { RedisCache, type RedisCacheConfig } from './redis-cache.js';
import { MemoryCache, type MemoryCacheConfig } from './memory-cache.js';
import { CacheManager, type CacheConfig } from './cache-manager.js';
import type { Cache } from './types.js';

export type CacheType = 'redis' | 'memory';

export interface CreateCacheOptions {
  type?: CacheType;
  redis?: RedisCacheConfig;
  memory?: MemoryCacheConfig;
  defaultTtlSeconds?: number;
}

/**
 * Create a cache instance based on environment
 * 
 * Automatically selects Redis if REDIS_URL is set,
 * otherwise falls back to in-memory cache.
 */
export function createCache(options: CreateCacheOptions = {}): CacheManager {
  let cache: Cache;
  let type = options.type;

  // Auto-detect type if not specified
  if (!type) {
    type = process.env.REDIS_URL ? 'redis' : 'memory';
  }

  if (type === 'redis') {
    cache = new RedisCache({
      url: process.env.REDIS_URL,
      ...options.redis,
      defaultTtlSeconds: options.defaultTtlSeconds,
    });
    console.log('[Cache] Using Redis cache');
  } else {
    cache = new MemoryCache({
      ...options.memory,
      defaultTtlSeconds: options.defaultTtlSeconds,
    });
    console.log('[Cache] Using in-memory LRU cache');
  }

  return new CacheManager({
    cache,
    defaultTtlSeconds: options.defaultTtlSeconds,
  });
}

/**
 * Create commonly used cache key
 */
export const cacheKey = {
  /**
   * Agent profile cache key
   */
  agentProfile: (agentId: string) => `agent:${agentId}:profile`,
  
  /**
   * Agent list by filter
   */
  agentList: (filter: string) => `agents:list:${filter}`,
  
  /**
   * User settings cache key
   */
  userSettings: (userId: string) => `user:${userId}:settings`,
  
  /**
   * Itinerary cache key
   */
  itinerary: (itineraryId: string) => `itinerary:${itineraryId}`,
  
  /**
   * Proposals for a request
   */
  requestProposals: (requestId: string) => `request:${requestId}:proposals`,
  
  /**
   * Destination templates
   */
  destinationTemplate: (destination: string) => 
    `template:destination:${destination.toLowerCase()}`,
  
  /**
   * Available agents for matching
   */
  availableAgents: () => 'matching:agents:available',
};
