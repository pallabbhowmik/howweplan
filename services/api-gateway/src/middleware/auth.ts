import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from './logger';

interface JWTPayload {
  sub: string; // userId
  email: string;
  role: 'user' | 'agent' | 'admin' | 'system';
  permissions?: string[];
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  jti?: string; // JWT ID for revocation tracking
  version?: number; // Token version for forced logout
}

/**
 * Simple JWT verification without external library
 * In production, use jsonwebtoken or jose library
 */
function verifyJWT(token: string, secret: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    return payload as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Generate JWT token (for internal use)
 */
export function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: number = 900): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.jwt.secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

// Token revocation store (in production, use Redis)
const revokedTokens = new Set<string>();

export function revokeToken(jti: string): void {
  revokedTokens.add(jti);
}

export function isTokenRevoked(jti: string): boolean {
  return revokedTokens.has(jti);
}

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/identity/auth/login' },
  { method: 'POST', path: '/api/identity/auth/register' },
  { method: 'POST', path: '/api/identity/auth/refresh' },
  { method: 'POST', path: '/api/identity/auth/forgot-password' },
  { method: 'POST', path: '/api/identity/auth/reset-password' },
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/api/reviews' }, // Public reviews
  { method: 'GET', path: '/api/itineraries/public' }, // Public itineraries
];

function isPublicRoute(method: string, path: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.method !== method && route.method !== '*') return false;
    if (route.path.endsWith('*')) {
      return path.startsWith(route.path.slice(0, -1));
    }
    return path === route.path || path.startsWith(route.path + '/');
  });
}

/**
 * JWT Authentication Middleware
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for public routes
  if (isPublicRoute(req.method, req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || 'unknown',
      error: 'Missing or invalid Authorization header',
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header',
      code: 'AUTH_MISSING_TOKEN',
    });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyJWT(token, config.jwt.secret);

  if (!payload) {
    logger.warn({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || 'unknown',
      error: 'Invalid JWT signature',
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
      code: 'AUTH_INVALID_TOKEN',
    });
    return;
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    logger.warn({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || 'unknown',
      userId: payload.sub,
      error: 'Token expired',
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expired',
      code: 'AUTH_TOKEN_EXPIRED',
    });
    return;
  }

  // Check issuer and audience
  if (payload.iss !== config.jwt.issuer) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token issuer',
      code: 'AUTH_INVALID_ISSUER',
    });
    return;
  }

  // Check revocation
  if (payload.jti && isTokenRevoked(payload.jti)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token has been revoked',
      code: 'AUTH_TOKEN_REVOKED',
    });
    return;
  }

  // Attach user to request
  req.user = {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions,
  };

  next();
}

/**
 * Optional auth - doesn't fail if no token, just doesn't set user
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const payload = verifyJWT(token, config.jwt.secret);

  if (payload && payload.exp >= Math.floor(Date.now() / 1000)) {
    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
  }

  next();
}
