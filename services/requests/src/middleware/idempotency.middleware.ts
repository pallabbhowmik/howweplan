/**
 * Idempotency Middleware for Requests Service
 * 
 * Integrates with @tripcomposer/idempotency package to ensure
 * all creation endpoints are safe to retry.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createHash } from 'crypto';

// Simple in-memory store for development
// In production, use Redis via @tripcomposer/idempotency package
interface IdempotencyRecord {
  key: string;
  status: 'processing' | 'completed' | 'failed';
  fingerprint: string;
  statusCode?: number;
  body?: unknown;
  createdAt: Date;
  expiresAt: Date;
}

class InMemoryIdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();

  async get(key: string): Promise<IdempotencyRecord | null> {
    const record = this.records.get(key);
    if (!record) return null;
    if (record.expiresAt < new Date()) {
      this.records.delete(key);
      return null;
    }
    return record;
  }

  async set(key: string, record: IdempotencyRecord): Promise<void> {
    this.records.set(key, record);
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }

  // Cleanup expired records periodically
  cleanup(): number {
    let cleaned = 0;
    const now = new Date();
    for (const [key, record] of this.records) {
      if (record.expiresAt < now) {
        this.records.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }
}

const store = new InMemoryIdempotencyStore();

// Track cleanup interval for graceful shutdown
let idempotencyCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the idempotency cleanup interval.
 * Called automatically when the middleware is first used.
 */
function initializeIdempotencyCleanup(): void {
  if (idempotencyCleanupInterval) return;
  // Cleanup every minute
  idempotencyCleanupInterval = setInterval(() => store.cleanup(), 60000);
}

/**
 * Stop the idempotency cleanup interval.
 * Call this during graceful shutdown.
 */
export function stopIdempotencyCleanup(): void {
  if (idempotencyCleanupInterval) {
    clearInterval(idempotencyCleanupInterval);
    idempotencyCleanupInterval = null;
  }
}

const TTL_SECONDS = 86400; // 24 hours

function generateFingerprint(body: unknown): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(body || {}));
  return hash.digest('hex');
}

/**
 * Idempotency middleware for mutation endpoints.
 */
export function idempotencyMiddleware(): RequestHandler {
  // Initialize cleanup interval on first use
  initializeIdempotencyCleanup();
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only apply to POST, PUT, PATCH
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    // Skip health checks and other non-mutation paths
    if (req.path.includes('/health') || req.path.includes('/caps')) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    // If no key provided, proceed without idempotency check
    if (!idempotencyKey) {
      return next();
    }

    // Attach key to request for logging
    (req as Request & { idempotencyKey?: string }).idempotencyKey = idempotencyKey;

    try {
      const fingerprint = generateFingerprint(req.body);
      const existing = await store.get(idempotencyKey);

      if (existing) {
        // Check fingerprint mismatch
        if (existing.fingerprint !== fingerprint) {
          res.status(422).json({
            error: {
              code: 'IDEMPOTENCY_KEY_CONFLICT',
              message: 'Idempotency key was already used with a different request payload',
            },
          });
          return;
        }

        // Check if still processing
        if (existing.status === 'processing') {
          res.status(409).json({
            error: {
              code: 'DUPLICATE_REQUEST_IN_PROGRESS',
              message: 'A request with this idempotency key is already being processed',
            },
          });
          return;
        }

        // Return cached response
        if (existing.status === 'completed' && existing.statusCode) {
          res.setHeader('X-Idempotent-Replayed', 'true');
          res.status(existing.statusCode).json(existing.body);
          return;
        }
      }

      // Create new record
      const record: IdempotencyRecord = {
        key: idempotencyKey,
        status: 'processing',
        fingerprint,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
      };
      await store.set(idempotencyKey, record);

      // Capture response
      const originalJson = res.json.bind(res);
      res.json = function(body: unknown) {
        record.status = 'completed';
        record.statusCode = res.statusCode;
        record.body = body;
        void store.set(idempotencyKey, record);
        return originalJson(body);
      };

      // Handle errors
      res.on('close', () => {
        if (!res.writableEnded && record.status === 'processing') {
          record.status = 'failed';
          void store.delete(idempotencyKey);
        }
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}
