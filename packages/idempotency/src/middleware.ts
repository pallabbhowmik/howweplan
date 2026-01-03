/**
 * Idempotency Express Middleware
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createHash } from 'crypto';
import { IdempotencyStore, IdempotencyStatus } from './store';
import { IdempotencyConfig, IdempotencyResult, DEFAULT_CONFIG } from './types';
import { 
  DuplicateRequestError, 
  IdempotencyConflictError,
  MissingIdempotencyKeyError,
} from './errors';

declare global {
  namespace Express {
    interface Request {
      idempotencyKey?: string;
    }
  }
}

export class IdempotencyMiddleware {
  private readonly store: IdempotencyStore;
  private readonly config: Required<Omit<IdempotencyConfig, 'fingerprintFn'>> & 
    Pick<IdempotencyConfig, 'fingerprintFn'>;

  constructor(store: IdempotencyStore, config: IdempotencyConfig = {}) {
    this.store = store;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Generate a fingerprint for the request body.
   */
  private generateFingerprint(body: unknown): string {
    if (this.config.fingerprintFn) {
      return this.config.fingerprintFn(body);
    }

    const hash = createHash('sha256');
    hash.update(JSON.stringify(body || {}));
    return hash.digest('hex');
  }

  /**
   * Check if the request should be processed by idempotency middleware.
   */
  private shouldProcess(req: Request): boolean {
    // Check method
    if (!this.config.methods.includes(req.method)) {
      return false;
    }

    // Check excluded paths
    for (const path of this.config.excludePaths) {
      if (req.path.startsWith(path)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the middleware handler.
   */
  handler(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Skip if not applicable
      if (!this.shouldProcess(req)) {
        return next();
      }

      const idempotencyKey = req.headers[this.config.headerName.toLowerCase()] as string;

      // Check if key is required
      if (!idempotencyKey) {
        if (this.config.required) {
          const error = new MissingIdempotencyKeyError();
          res.status(400).json({
            error: {
              code: error.code,
              message: error.message,
            },
          });
          return;
        }
        // Not required, proceed without idempotency check
        return next();
      }

      req.idempotencyKey = idempotencyKey;

      try {
        const fingerprint = this.generateFingerprint(req.body);
        const { acquired, record } = await this.store.acquire(
          idempotencyKey,
          fingerprint,
          this.config.ttlSeconds
        );

        if (!acquired && record) {
          // Request with this key already exists
          
          // Check fingerprint mismatch
          if (record.fingerprint && record.fingerprint !== fingerprint) {
            throw new IdempotencyConflictError(idempotencyKey);
          }

          // Check if still processing
          if (record.status === IdempotencyStatus.PROCESSING) {
            throw new DuplicateRequestError(idempotencyKey);
          }

          // Request completed, return cached response
          if (record.status === IdempotencyStatus.COMPLETED && record.statusCode) {
            res.setHeader('X-Idempotent-Replayed', 'true');
            
            if (record.headers) {
              for (const [key, value] of Object.entries(record.headers)) {
                res.setHeader(key, value);
              }
            }

            res.status(record.statusCode).json(record.body);
            return;
          }

          // Failed request, allow retry
          if (record.status === IdempotencyStatus.FAILED) {
            await this.store.delete(idempotencyKey);
            // Re-acquire
            const reacquire = await this.store.acquire(
              idempotencyKey,
              fingerprint,
              this.config.ttlSeconds
            );
            if (!reacquire.acquired) {
              throw new DuplicateRequestError(idempotencyKey);
            }
          }
        }

        // Intercept response to capture and store
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const captureResponse = async (body: unknown): Promise<void> => {
          try {
            await this.store.complete(
              idempotencyKey,
              res.statusCode,
              body,
              this.getResponseHeaders(res)
            );
          } catch (error) {
            console.error('Failed to store idempotency response:', error);
          }
        };

        res.json = function(body: unknown) {
          void captureResponse(body);
          return originalJson(body);
        };

        res.send = function(body: unknown) {
          if (typeof body === 'object') {
            void captureResponse(body);
          }
          return originalSend(body);
        };

        // Handle errors to mark as failed
        res.on('close', () => {
          if (!res.writableEnded) {
            void this.store.fail(idempotencyKey);
          }
        });

        next();
      } catch (error) {
        if (error instanceof DuplicateRequestError) {
          res.status(409).json({
            error: {
              code: error.code,
              message: error.message,
              idempotencyKey: error.idempotencyKey,
            },
          });
          return;
        }

        if (error instanceof IdempotencyConflictError) {
          res.status(422).json({
            error: {
              code: error.code,
              message: error.message,
              idempotencyKey: error.idempotencyKey,
            },
          });
          return;
        }

        next(error);
      }
    };
  }

  private getResponseHeaders(res: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    const headerKeys = ['content-type', 'x-correlation-id', 'x-request-id'];
    
    for (const key of headerKeys) {
      const value = res.getHeader(key);
      if (value && typeof value === 'string') {
        headers[key] = value;
      }
    }

    return headers;
  }
}

/**
 * Create idempotency middleware.
 */
export function idempotencyMiddleware(
  store: IdempotencyStore,
  config?: IdempotencyConfig
): RequestHandler {
  const middleware = new IdempotencyMiddleware(store, config);
  return middleware.handler();
}
