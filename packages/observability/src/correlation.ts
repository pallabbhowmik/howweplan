/**
 * Correlation ID Management
 * 
 * Provides request correlation across services.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

interface CorrelationContext {
  correlationId: string;
  causationId?: string;
}

const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Get the current correlation ID from context.
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

/**
 * Get the current causation ID from context.
 */
export function getCausationId(): string | undefined {
  return correlationStorage.getStore()?.causationId;
}

/**
 * Set correlation context for the current async context.
 */
export function setCorrelationId(correlationId: string, causationId?: string): void {
  const store = correlationStorage.getStore();
  if (store) {
    store.correlationId = correlationId;
    if (causationId) store.causationId = causationId;
  }
}

/**
 * Run a function with correlation context.
 */
export function withCorrelation<T>(
  correlationId: string,
  fn: () => T,
  causationId?: string
): T {
  return correlationStorage.run(
    { correlationId, causationId },
    fn
  );
}

/**
 * Generate a new correlation ID.
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract correlation ID from headers.
 */
export function extractCorrelationFromHeaders(
  headers: Record<string, string | string[] | undefined>
): { correlationId: string; causationId?: string } {
  const correlationId = 
    (headers['x-correlation-id'] as string) ||
    (headers['x-request-id'] as string) ||
    generateCorrelationId();
  
  const causationId = headers['x-causation-id'] as string | undefined;

  return { correlationId, causationId };
}
