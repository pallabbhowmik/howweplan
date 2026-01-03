/**
 * Idempotency Errors
 */

/**
 * Base error for idempotency issues.
 */
export class IdempotencyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly idempotencyKey?: string
  ) {
    super(message);
    this.name = 'IdempotencyError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when a duplicate request is detected and the original is still processing.
 */
export class DuplicateRequestError extends IdempotencyError {
  constructor(idempotencyKey: string) {
    super(
      `Request with idempotency key "${idempotencyKey}" is already being processed`,
      'DUPLICATE_REQUEST_IN_PROGRESS',
      idempotencyKey
    );
    this.name = 'DuplicateRequestError';
  }
}

/**
 * Thrown when a request with the same key but different payload is detected.
 */
export class IdempotencyConflictError extends IdempotencyError {
  constructor(idempotencyKey: string) {
    super(
      `Request with idempotency key "${idempotencyKey}" was already used with a different payload`,
      'IDEMPOTENCY_KEY_CONFLICT',
      idempotencyKey
    );
    this.name = 'IdempotencyConflictError';
  }
}

/**
 * Thrown when idempotency key is required but missing.
 */
export class MissingIdempotencyKeyError extends IdempotencyError {
  constructor() {
    super(
      'Idempotency-Key header is required for this request',
      'MISSING_IDEMPOTENCY_KEY'
    );
    this.name = 'MissingIdempotencyKeyError';
  }
}
