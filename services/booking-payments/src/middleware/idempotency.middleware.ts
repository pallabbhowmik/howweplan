/**
 * Idempotency Middleware for Booking-Payments Service
 * 
 * CRITICAL for payment operations - ensures that retried payment
 * requests don't result in duplicate charges.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';

interface IdempotencyRecord {
  status: 'processing' | 'completed';
  response?: {
    statusCode: number;
    body: unknown;
    headers: Record<string, string>;
  };
  fingerprint: string;
  createdAt: number;
}

// In-memory store for development
// TODO: Replace with Redis in production
const idempotencyStore = new Map<string, IdempotencyRecord>();

// Clean up old records periodically (24 hour TTL)
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

// Track cleanup interval for graceful shutdown
let idempotencyCleanupInterval: NodeJS.Timeout | null = null;

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

idempotencyCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

/**
 * Generate a fingerprint for the request body
 */
function generateFingerprint(body: unknown): string {
  const content = JSON.stringify(body || {});
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Middleware to handle idempotent payment requests
 */
export function idempotencyMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only apply to mutation methods
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      next();
      return;
    }

    // Skip for webhook endpoints (they have their own idempotency via Stripe)
    if (req.path.includes('/webhooks/')) {
      next();
      return;
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    // Idempotency key is optional but recommended for payments
    if (!idempotencyKey) {
      next();
      return;
    }

    // Include service and path in the key to avoid collisions
    const fullKey = `booking-payments:${req.path}:${idempotencyKey}`;
    const fingerprint = generateFingerprint(req.body);

    const existingRecord = idempotencyStore.get(fullKey);

    if (existingRecord) {
      // Check if request payload matches
      if (existingRecord.fingerprint !== fingerprint) {
        res.status(422).json({
          error: {
            code: 'IDEMPOTENCY_KEY_CONFLICT',
            message: 'This idempotency key was already used with a different request payload',
          },
        });
        return;
      }

      // If still processing, return conflict
      if (existingRecord.status === 'processing') {
        res.status(409).json({
          error: {
            code: 'DUPLICATE_REQUEST_IN_PROGRESS',
            message: 'A request with this idempotency key is already being processed',
          },
        });
        return;
      }

      // Return cached response
      if (existingRecord.response) {
        res.setHeader('X-Idempotent-Replayed', 'true');
        
        for (const [header, value] of Object.entries(existingRecord.response.headers)) {
          res.setHeader(header, value);
        }
        
        res.status(existingRecord.response.statusCode).json(existingRecord.response.body);
        return;
      }
    }

    // Store processing status
    idempotencyStore.set(fullKey, {
      status: 'processing',
      fingerprint,
      createdAt: Date.now(),
    });

    // Capture the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      // Only cache successful responses for payments
      const shouldCache = res.statusCode >= 200 && res.statusCode < 300;
      
      if (shouldCache) {
        idempotencyStore.set(fullKey, {
          status: 'completed',
          fingerprint,
          response: {
            statusCode: res.statusCode,
            body,
            headers: {
              'content-type': res.getHeader('content-type') as string || 'application/json',
            },
          },
          createdAt: Date.now(),
        });
      } else {
        // Remove failed requests so they can be retried
        idempotencyStore.delete(fullKey);
      }

      return originalJson(body);
    };

    next();
  };
}
