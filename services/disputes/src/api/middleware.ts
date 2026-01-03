/**
 * API middleware
 * 
 * Express middleware for authentication, error handling, and request processing.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'fs';
import jwt from 'jsonwebtoken';
import { config, env } from '../env.js';
import { logger, createRequestLogger } from '../audit/logger.js';

/**
 * Read a secret file from Render's secret files location.
 */
function readSecretFile(filename: string): string | undefined {
  const paths = [
    `/etc/secrets/${filename}`,
    `./secrets/${filename}`,
    `./${filename}`,
  ];
  for (const path of paths) {
    if (existsSync(path)) {
      try {
        return readFileSync(path, 'utf-8').trim();
      } catch { /* continue */ }
    }
  }
  return undefined;
}

/**
 * Get JWT public key from secret file or env var.
 */
function getJwtPublicKey(): string {
  const fileContent = readSecretFile('jwt-public.pem');
  if (fileContent) return fileContent;
  const envKey = process.env.JWT_PUBLIC_KEY;
  return envKey ? envKey.replace(/\\n/g, '\n') : '';
}

/**
 * User information extracted from JWT.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: 'traveler' | 'agent' | 'admin';
  sessionId?: string;
}

interface JWTPayload {
  sub: string;
  role: string;
  status: string;
  type: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * Extend Express Request to include user.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      correlationId: string;
      requestLogger: ReturnType<typeof createRequestLogger>;
    }
  }
}

/**
 * Add correlation ID and request logger to each request.
 */
export function correlationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;
  req.requestLogger = createRequestLogger(correlationId);
  next();
}

/**
 * Request logging middleware.
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    req.requestLogger.info({
      msg: 'Request completed',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}

/**
 * Authentication middleware.
 * Verifies JWT tokens for API access.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // JWT configuration - RS256 with secret files or HS256 fallback
    const JWT_ALGORITHM = (process.env.JWT_ALGORITHM || 'RS256') as 'RS256' | 'HS256';
    const JWT_PUBLIC_KEY = getJwtPublicKey();
    const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-jwt-secret-minimum-32-characters-long' : '');
    const JWT_ISSUER = process.env.JWT_ISSUER || 'tripcomposer-identity';
    const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'tripcomposer-platform';
    
    // Determine verification key based on algorithm
    const verifyKey = JWT_ALGORITHM === 'RS256' ? JWT_PUBLIC_KEY : JWT_SECRET;
    
    if (!verifyKey) {
      res.status(500).json({ error: `JWT verification key not configured (${JWT_ALGORITHM})` });
      return;
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, verifyKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: [JWT_ALGORITHM],
    }) as JWTPayload;

    // Map JWT role to service role
    let role: AuthUser['role'] = 'traveler';
    if (decoded.role === 'admin' || decoded.role === 'super_admin' || decoded.role === 'support') {
      role = 'admin';
    } else if (decoded.role === 'agent') {
      role = 'agent';
    }

    req.user = {
      id: decoded.sub,
      email: `${decoded.sub}@tripcomposer.local`,
      role,
    };

    next();
  } catch (error) {
    req.requestLogger?.error?.({
      msg: 'JWT verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Internal service authentication middleware.
 */
export function internalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const serviceToken = req.headers['x-service-token'] as string;

  if (serviceToken !== config.auth.internalToken) {
    res.status(403).json({ error: 'Invalid service token' });
    return;
  }

  next();
}

/**
 * Error handling middleware.
 */
export const errorMiddleware: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  req.requestLogger.error({
    msg: 'Request error',
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  // Don't expose internal errors in production
  const isProduction = config.service.name === 'disputes'; // placeholder for env check
  const message = isProduction ? 'Internal server error' : err.message;

  res.status(500).json({
    error: message,
    correlationId: req.correlationId,
  });
};

/**
 * Not found handler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
}
