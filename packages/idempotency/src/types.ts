/**
 * Idempotency Types
 */

export interface IdempotencyConfig {
  /**
   * Header name to extract idempotency key from.
   * Default: 'Idempotency-Key'
   */
  headerName?: string;

  /**
   * TTL for stored results in seconds.
   * Default: 86400 (24 hours)
   */
  ttlSeconds?: number;

  /**
   * Whether to require idempotency key for all requests.
   * Default: false (only enforced on POST/PUT/PATCH)
   */
  required?: boolean;

  /**
   * Methods to enforce idempotency on.
   * Default: ['POST', 'PUT', 'PATCH']
   */
  methods?: string[];

  /**
   * Paths to exclude from idempotency checking.
   * Default: ['/health', '/ready', '/metrics']
   */
  excludePaths?: string[];

  /**
   * Function to generate a key fingerprint from request body.
   * Used to detect different requests with the same idempotency key.
   */
  fingerprintFn?: (body: unknown) => string;
}

export interface IdempotencyResult<T = unknown> {
  /**
   * The stored response body.
   */
  body: T;

  /**
   * The stored response status code.
   */
  statusCode: number;

  /**
   * The stored response headers.
   */
  headers?: Record<string, string>;
}

export const DEFAULT_CONFIG: Required<Omit<IdempotencyConfig, 'fingerprintFn'>> = {
  headerName: 'Idempotency-Key',
  ttlSeconds: 86400, // 24 hours
  required: false,
  methods: ['POST', 'PUT', 'PATCH'],
  excludePaths: ['/health', '/ready', '/metrics'],
};
