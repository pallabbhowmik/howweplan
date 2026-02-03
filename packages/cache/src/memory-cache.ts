/**
 * In-Memory LRU Cache
 * 
 * A fast, in-memory cache with LRU (Least Recently Used) eviction.
 * Suitable for development and single-instance deployments.
 * 
 * Time Complexity:
 * - get: O(1)
 * - set: O(1) amortized
 * - delete: O(1)
 * 
 * Space Complexity: O(n) where n is maxSize
 */

import type { Cache, CacheEntry, CacheStats, BatchResult } from './types.js';

export interface MemoryCacheConfig {
  maxSize?: number;
  defaultTtlSeconds?: number;
  onEvict?: (key: string, value: unknown) => void;
}

/**
 * LRU Cache node for doubly-linked list
 */
interface LRUNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

export class MemoryCache implements Cache {
  private readonly maxSize: number;
  private readonly defaultTtlSeconds: number;
  private readonly onEvict?: (key: string, value: unknown) => void;
  
  // Hash map for O(1) lookups
  private readonly cache: Map<string, LRUNode<unknown>>;
  
  // Doubly-linked list pointers for LRU ordering
  private head: LRUNode<unknown> | null = null;
  private tail: LRUNode<unknown> | null = null;
  
  // Statistics
  private hits = 0;
  private misses = 0;

  constructor(config: MemoryCacheConfig = {}) {
    this.maxSize = config.maxSize ?? 1000;
    this.defaultTtlSeconds = config.defaultTtlSeconds ?? 300;
    this.onEvict = config.onEvict;
    this.cache = new Map();
  }

  async get<T>(key: string): Promise<T | null> {
    const node = this.cache.get(key) as LRUNode<T> | undefined;
    
    if (!node) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (node.entry.expiresAt && Date.now() > node.entry.expiresAt) {
      await this.delete(key);
      this.misses++;
      return null;
    }

    // Move to front (most recently used)
    this.moveToFront(node);
    this.hits++;
    
    return node.entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: ttl > 0 ? now + (ttl * 1000) : undefined,
    };

    const existingNode = this.cache.get(key);
    
    if (existingNode) {
      // Update existing entry
      existingNode.entry = entry as CacheEntry<unknown>;
      this.moveToFront(existingNode);
    } else {
      // Create new node
      const node: LRUNode<T> = {
        key,
        entry,
        prev: null,
        next: null,
      };
      
      this.cache.set(key, node as LRUNode<unknown>);
      this.addToFront(node as LRUNode<unknown>);
      
      // Evict if over capacity
      if (this.cache.size > this.maxSize) {
        await this.evictLRU();
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    const node = this.cache.get(key);
    if (!node) return false;
    
    this.removeNode(node);
    this.cache.delete(key);
    
    return true;
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async getMany<T>(keys: string[]): Promise<BatchResult<T>> {
    const hits = new Map<string, T>();
    const misses: string[] = [];

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        hits.set(key, value);
      } else {
        misses.push(key);
      }
    }

    return { hits, misses };
  }

  async setMany<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttlSeconds);
    }
  }

  async deleteMany(keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    );
    
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    return this.deleteMany(keysToDelete);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
  }

  async stats(): Promise<CacheStats> {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  async close(): Promise<void> {
    await this.clear();
  }

  // ============================================================================
  // LRU Doubly-Linked List Operations - O(1) time complexity
  // ============================================================================

  private moveToFront(node: LRUNode<unknown>): void {
    if (node === this.head) return;
    
    this.removeNode(node);
    this.addToFront(node);
  }

  private addToFront(node: LRUNode<unknown>): void {
    node.prev = null;
    node.next = this.head;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<unknown>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private async evictLRU(): Promise<void> {
    if (!this.tail) return;
    
    const evictedKey = this.tail.key;
    const evictedValue = this.tail.entry.value;
    
    this.removeNode(this.tail);
    this.cache.delete(evictedKey);
    
    if (this.onEvict) {
      this.onEvict(evictedKey, evictedValue);
    }
  }
}
