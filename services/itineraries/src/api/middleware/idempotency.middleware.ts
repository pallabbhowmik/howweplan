/**
 * Idempotency Middleware for Itineraries Service
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createHash } from 'crypto';

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
setInterval(() => store.cleanup(), 60000);

const TTL_SECONDS = 86400;

function generateFingerprint(body: unknown): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(body || {}));
  return hash.digest('hex');
}

export function idempotencyMiddleware(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next();
    }

    if (req.path.includes('/health')) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (!idempotencyKey) {
      return next();
    }

    try {
      const fingerprint = generateFingerprint(req.body);
      const existing = await store.get(idempotencyKey);

      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          res.status(422).json({
            error: {
              code: 'IDEMPOTENCY_KEY_CONFLICT',
              message: 'Idempotency key was already used with a different request payload',
            },
          });
          return;
        }

        if (existing.status === 'processing') {
          res.status(409).json({
            error: {
              code: 'DUPLICATE_REQUEST_IN_PROGRESS',
              message: 'A request with this idempotency key is already being processed',
            },
          });
          return;
        }

        if (existing.status === 'completed' && existing.statusCode) {
          res.setHeader('X-Idempotent-Replayed', 'true');
          res.status(existing.statusCode).json(existing.body);
          return;
        }
      }

      const record: IdempotencyRecord = {
        key: idempotencyKey,
        status: 'processing',
        fingerprint,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + TTL_SECONDS * 1000),
      };
      await store.set(idempotencyKey, record);

      const originalJson = res.json.bind(res);
      res.json = function(body: unknown) {
        record.status = 'completed';
        record.statusCode = res.statusCode;
        record.body = body;
        void store.set(idempotencyKey, record);
        return originalJson(body);
      };

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
