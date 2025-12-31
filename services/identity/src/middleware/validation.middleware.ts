/**
 * Request validation middleware using Zod schemas.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AuthenticatedRequest } from './auth.middleware.js';

/**
 * Creates middleware that validates request body against a Zod schema.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: {
              errors: error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              })),
            },
          },
          requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw error;
    }
  };
}

/**
 * Creates middleware that validates request query parameters against a Zod schema.
 */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: {
              errors: error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              })),
            },
          },
          requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw error;
    }
  };
}

/**
 * Creates middleware that validates request params against a Zod schema.
 */
export function validateParams(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid URL parameters',
            details: {
              errors: error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              })),
            },
          },
          requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw error;
    }
  };
}
