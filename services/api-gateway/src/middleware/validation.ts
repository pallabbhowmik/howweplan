import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { logger } from './logger';

/**
 * Input Validation Middleware
 * Validates request body, query params, and headers
 */

// Common validation schemas
export const schemas = {
  // UUID validation
  uuid: z.string().uuid(),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine(
    data => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate),
    { message: 'startDate must be before or equal to endDate' }
  ),

  // Email
  email: z.string().email().toLowerCase().trim(),

  // Phone
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),

  // URL
  url: z.string().url(),

  // Money amount (in cents)
  amount: z.number().int().min(0),

  // Trip Request
  tripRequest: z.object({
    destination: z.string().min(2).max(200),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    travelers: z.number().int().min(1).max(50),
    budget: z.number().min(0).optional(),
    currency: z.string().length(3).default('USD'),
    preferences: z.object({
      accommodationType: z.enum(['hotel', 'resort', 'villa', 'apartment', 'hostel']).optional(),
      travelStyle: z.enum(['luxury', 'mid-range', 'budget', 'backpacker']).optional(),
      interests: z.array(z.string()).optional(),
      dietaryRestrictions: z.array(z.string()).optional(),
      accessibilityNeeds: z.array(z.string()).optional(),
    }).optional(),
    notes: z.string().max(5000).optional(),
  }).refine(
    data => new Date(data.startDate) <= new Date(data.endDate),
    { message: 'startDate must be before or equal to endDate' }
  ).refine(
    data => new Date(data.startDate) >= new Date(),
    { message: 'startDate must be in the future' }
  ),

  // User registration
  userRegistration: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(8).max(128)
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    firstName: z.string().min(1).max(100).trim(),
    lastName: z.string().min(1).max(100).trim(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  }),

  // Login
  login: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1),
    rememberMe: z.boolean().optional(),
  }),

  // Review
  review: z.object({
    rating: z.number().int().min(1).max(5),
    title: z.string().min(5).max(200).trim(),
    content: z.string().min(20).max(5000).trim(),
    wouldRecommend: z.boolean().optional(),
  }),

  // Message
  message: z.object({
    content: z.string().min(1).max(10000).trim(),
    attachments: z.array(z.object({
      type: z.enum(['image', 'document', 'link']),
      url: z.string().url(),
      name: z.string().max(255).optional(),
    })).max(10).optional(),
  }),

  // Dispute
  dispute: z.object({
    type: z.enum(['booking', 'payment', 'service', 'other']),
    subject: z.string().min(10).max(200).trim(),
    description: z.string().min(50).max(10000).trim(),
    evidenceUrls: z.array(z.string().url()).max(10).optional(),
    requestedResolution: z.enum(['refund', 'credit', 'replacement', 'explanation', 'other']).optional(),
  }),
};

/**
 * Generic validation middleware factory
 */
export function validate<T>(schema: z.ZodType<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        logger.warn({
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          ip: req.ip || 'unknown',
          userId: req.user?.userId,
          warning: 'Validation failed',
          errors,
        });

        res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          code: 'VALIDATION_FAILED',
          details: errors,
        });
        return;
      }

      // Replace the source data with validated/transformed data
      if (source === 'body') {
        req.body = result.data;
      } else if (source === 'query') {
        req.query = result.data as any;
      } else {
        req.params = result.data as any;
      }

      next();
    } catch (error) {
      logger.error({
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        error: 'Validation error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during validation',
        code: 'VALIDATION_ERROR',
      });
    }
  };
}

/**
 * Sanitize input - remove potentially dangerous content
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any, depth = 0): any {
  // Prevent deep recursion attacks
  if (depth > 10) {
    return {};
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[sanitizeString(key)] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize a string value
 */
function sanitizeString(str: string): string {
  return str
    // Remove null bytes
    .replace(/\0/g, '')
    // Trim excessive whitespace
    .trim()
    // Limit length to prevent DoS
    .slice(0, 50000);
}

/**
 * Request size limiter middleware
 */
export function requestSizeLimiter(req: Request, res: Response, next: NextFunction): void {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);

  if (contentLength > config.requestSizeLimit) {
    logger.warn({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || 'unknown',
      userId: req.user?.userId,
      warning: 'Request too large',
      contentLength,
      limit: config.requestSizeLimit,
    });

    res.status(413).json({
      error: 'Payload Too Large',
      message: `Request body exceeds maximum size of ${config.requestSizeLimit / 1024}KB`,
      code: 'REQUEST_TOO_LARGE',
    });
    return;
  }

  next();
}

/**
 * Validate UUID parameter middleware
 */
export function validateUuidParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];

    if (!value || !schemas.uuid.safeParse(value).success) {
      res.status(400).json({
        error: 'Validation Error',
        message: `Invalid ${paramName}: must be a valid UUID`,
        code: 'INVALID_UUID',
      });
      return;
    }

    next();
  };
}

/**
 * Content-Type validation middleware
 */
export function requireJson(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];

    // Allow both application/json and multipart/form-data (for file uploads)
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be application/json or multipart/form-data',
        code: 'INVALID_CONTENT_TYPE',
      });
      return;
    }
  }

  next();
}
