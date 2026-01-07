/**
 * Authentication middleware for Express.
 * Validates JWT tokens and attaches identity context to requests.
 */

import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { verifyAccessToken } from '../services/token.service.js';
import { IdentityContext, AccountStatus } from '../types/identity.types.js';
import { InvalidTokenError, AccountSuspendedError } from '../services/errors.js';

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST AUGMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extended Express Request with identity context.
 */
export interface AuthenticatedRequest extends Request {
  /** Identity context from verified JWT */
  identity: IdentityContext;
  /** Correlation ID for distributed tracing */
  correlationId: string;
  /** Client IP address */
  clientIp: string;
}

/**
 * Type guard to check if a request is authenticated.
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return 'identity' in req && req.identity !== undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the bearer token from the Authorization header.
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') return null;
  return parts[1] ?? null;
}

/**
 * Extracts the client IP address from the request.
 */
function getClientIp(req: Request): string {
  // Trust X-Forwarded-For header if behind a reverse proxy
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0];
    const firstIp = ips?.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Trust X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0] ?? 'unknown';
  }

  // Fall back to socket address
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Middleware that requires authentication.
 * Validates the JWT and attaches identity context to the request.
 * Trusts gateway-forwarded headers (X-User-Id, X-User-Role, X-User-Email) for internal traffic.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract correlation ID
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    nanoid();

  // Attach correlation ID to response headers
  res.setHeader('X-Correlation-Id', correlationId);

  // First, check for gateway-forwarded headers (trusted internal traffic)
  // The API Gateway validates the JWT and forwards user info in these headers
  const gatewayUserId = req.headers['x-user-id'] as string | undefined;
  const gatewayUserRole = req.headers['x-user-role'] as string | undefined;

  if (gatewayUserId && gatewayUserRole) {
    // Trust gateway-forwarded headers
    const now = Math.floor(Date.now() / 1000);
    const identity: IdentityContext = {
      sub: gatewayUserId,
      role: gatewayUserRole.toLowerCase() as 'user' | 'agent' | 'admin',
      status: 'ACTIVE' as AccountStatus,
      agentVerificationStatus: null,
      iat: now,
      exp: now + 3600,
      iss: 'gateway',
      aud: 'identity-service',
    };

    (req as AuthenticatedRequest).identity = identity;
    (req as AuthenticatedRequest).correlationId = correlationId;
    (req as AuthenticatedRequest).clientIp = getClientIp(req);
    
    next();
    return;
  }

  // Fallback: Extract and validate token directly (for direct service calls)
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'IDENTITY_INVALID_TOKEN',
        message: 'Authorization header is missing or invalid',
      },
      requestId: correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const identity = verifyAccessToken(token);

    // Attach identity and metadata to request
    (req as AuthenticatedRequest).identity = identity;
    (req as AuthenticatedRequest).correlationId = correlationId;
    (req as AuthenticatedRequest).clientIp = getClientIp(req);

    next();
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      res.status(401).json({
        success: false,
        error: error.toJSON(),
        requestId: correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Middleware that optionally authenticates.
 * If a token is present, validates it and attaches identity context.
 * If no token is present, continues without authentication.
 * Trusts gateway-forwarded headers (X-User-Id, X-User-Role, X-User-Email) for internal traffic.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract correlation ID
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    nanoid();

  // Attach correlation ID to response headers
  res.setHeader('X-Correlation-Id', correlationId);
  (req as AuthenticatedRequest).correlationId = correlationId;
  (req as AuthenticatedRequest).clientIp = getClientIp(req);

  // First, check for gateway-forwarded headers (trusted internal traffic)
  const gatewayUserId = req.headers['x-user-id'] as string | undefined;
  const gatewayUserRole = req.headers['x-user-role'] as string | undefined;

  if (gatewayUserId && gatewayUserRole) {
    // Trust gateway-forwarded headers
    const now = Math.floor(Date.now() / 1000);
    const identity: IdentityContext = {
      sub: gatewayUserId,
      role: gatewayUserRole.toLowerCase() as 'user' | 'agent' | 'admin',
      status: 'ACTIVE' as AccountStatus,
      agentVerificationStatus: null,
      iat: now,
      exp: now + 3600,
      iss: 'gateway',
      aud: 'identity-service',
    };

    (req as AuthenticatedRequest).identity = identity;
    next();
    return;
  }

  // Fallback: Extract token (optional) for direct service calls
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    const identity = verifyAccessToken(token);
    (req as AuthenticatedRequest).identity = identity;
    next();
  } catch {
    // Ignore token errors for optional auth
    next();
  }
}

/**
 * Middleware that blocks suspended accounts from write operations.
 * Per business rules: suspended accounts are read-only.
 */
export function blockSuspended(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthenticated(req)) {
    next();
    return;
  }

  // Allow read operations for suspended accounts
  const readMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (readMethods.includes(req.method)) {
    next();
    return;
  }

  // Block write operations for suspended accounts
  if (req.identity.status === AccountStatus.SUSPENDED) {
    const error = new AccountSuspendedError();
    res.status(error.statusCode).json({
      success: false,
      error: error.toJSON(),
      requestId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
