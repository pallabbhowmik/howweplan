import type { Request, Response, NextFunction } from 'express';
import { z, ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../../utils/index.js';

/**
 * Validation targets.
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Create validation middleware for a specific target.
 */
function createValidator<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => {
          const path = e.path.join('.');
          return path ? `${path}: ${e.message}` : e.message;
        });
        next(new ValidationError(`Validation failed: ${messages.join('; ')}`));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request body.
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return createValidator(schema, 'body');
}

/**
 * Validate query parameters.
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return createValidator(schema, 'query');
}

/**
 * Validate path parameters.
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return createValidator(schema, 'params');
}

/**
 * Common parameter schemas.
 */
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const itineraryIdParamSchema = z.object({
  itineraryId: z.string().uuid(),
});

export const itemIdParamSchema = z.object({
  itineraryId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export const versionParamSchema = z.object({
  itineraryId: z.string().uuid(),
  version: z.coerce.number().int().positive(),
});

export const versionCompareParamSchema = z.object({
  itineraryId: z.string().uuid(),
  fromVersion: z.coerce.number().int().positive(),
  toVersion: z.coerce.number().int().positive(),
});
