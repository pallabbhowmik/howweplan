/**
 * Error Handling Middleware
 * 
 * Global error handler that converts domain errors to HTTP responses.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { RequestError, ValidationError } from '../domain/request.errors';
import { Logger } from '../services/logger.service';

export function createErrorMiddleware(logger: Logger) {
  return (error: Error, req: Request, res: Response, _next: NextFunction): void => {
    // Log the error
    const errorContext = {
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      correlationId: req.headers['x-correlation-id'],
    };

    // Handle domain errors
    if (error instanceof RequestError) {
      logger.warn('Request error', {
        ...errorContext,
        code: error.code,
        message: error.message,
      });

      res.status(error.statusCode).json(error.toJSON());
      return;
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const validationError = new ValidationError('Validation failed', {
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });

      res.status(400).json(validationError.toJSON());
      return;
    }

    // Handle unknown errors
    logger.error('Unhandled error', {
      ...errorContext,
      error: error.message,
      stack: error.stack,
    });

    // Don't leak error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction ? 'An unexpected error occurred' : error.message,
      },
    });
  };
}
