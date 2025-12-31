/**
 * Request ID Middleware
 * 
 * Ensures every request has a correlation ID for tracing.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing correlation ID or generate new one
  const correlationId = (req.headers['x-correlation-id'] as string) ?? randomUUID();
  
  req.headers['x-correlation-id'] = correlationId;
  res.set('X-Correlation-ID', correlationId);
  
  next();
}
