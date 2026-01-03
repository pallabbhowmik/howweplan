/**
 * @tripcomposer/idempotency
 * 
 * Idempotency support for all TripComposer services.
 * Ensures that duplicate requests (retries) don't cause duplicate side effects.
 * 
 * Features:
 * - Redis-backed idempotency key storage
 * - In-memory fallback for development
 * - Express middleware integration
 * - Configurable TTL
 */

export { IdempotencyMiddleware, idempotencyMiddleware } from './middleware';
export { IdempotencyStore, IdempotencyRecord, IdempotencyStatus } from './store';
export { RedisIdempotencyStore } from './redis-store';
export { InMemoryIdempotencyStore } from './memory-store';
export { IdempotencyError, DuplicateRequestError, IdempotencyConflictError } from './errors';
export type { IdempotencyConfig, IdempotencyResult } from './types';
