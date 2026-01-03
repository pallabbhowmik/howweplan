/**
 * Idempotency Store Interface
 */

export enum IdempotencyStatus {
  /** Request is currently being processed */
  PROCESSING = 'processing',
  /** Request completed successfully */
  COMPLETED = 'completed',
  /** Request failed */
  FAILED = 'failed',
}

export interface IdempotencyRecord {
  /** The idempotency key */
  key: string;
  
  /** Current status */
  status: IdempotencyStatus;
  
  /** Request fingerprint (hash of body) */
  fingerprint?: string;
  
  /** Stored response status code */
  statusCode?: number;
  
  /** Stored response body */
  body?: unknown;
  
  /** Stored response headers */
  headers?: Record<string, string>;
  
  /** When the record was created */
  createdAt: Date;
  
  /** When the record expires */
  expiresAt: Date;
}

/**
 * Abstract interface for idempotency storage.
 */
export interface IdempotencyStore {
  /**
   * Try to acquire a lock for the given key.
   * Returns the existing record if the key already exists.
   */
  acquire(
    key: string,
    fingerprint: string,
    ttlSeconds: number
  ): Promise<{ acquired: boolean; record?: IdempotencyRecord }>;

  /**
   * Mark a request as completed with its response.
   */
  complete(
    key: string,
    statusCode: number,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<void>;

  /**
   * Mark a request as failed.
   */
  fail(key: string): Promise<void>;

  /**
   * Get a record by key.
   */
  get(key: string): Promise<IdempotencyRecord | null>;

  /**
   * Delete a record.
   */
  delete(key: string): Promise<void>;

  /**
   * Clean up expired records.
   */
  cleanup(): Promise<number>;

  /**
   * Close the store connection.
   */
  close(): Promise<void>;
}
