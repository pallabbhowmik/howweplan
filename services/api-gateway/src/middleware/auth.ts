import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
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
 * Supabase JWT payload structure
 */
interface SupabaseJWTPayload {
  sub: string; // User UUID
  email?: string;
  role?: string; // Usually 'authenticated'
  user_metadata?: {
    role?: string;
    email?: string;
  };
  app_metadata?: {
    role?: string;
    provider?: string;
  };
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * Verify JWT using the configured algorithm (RS256 or HS256)
 * RS256: Uses public key for verification (recommended)
 * HS256: Uses shared secret (legacy fallback)
 * 
 * Falls back to HS256 if RS256 fails and HS256 secret is available.
 */
function verifyJWT(token: string): JWTPayload | null {
  const algorithms: Array<'RS256' | 'HS256'> = config.jwt.algorithm === 'RS256' 
    ? ['RS256', 'HS256'] // Try RS256 first, fall back to HS256
    : ['HS256'];

  // Log available keys for debugging
  const hasPublicKey = !!config.jwt.publicKey;
  const hasSecret = !!config.jwt.secret;
  
  logger.debug({
    timestamp: new Date().toISOString(),
    event: 'jwt_verify_attempt',
    algorithm: config.jwt.algorithm,
    hasPublicKey,
    hasSecret,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });

  if (!hasPublicKey && !hasSecret) {
    logger.error({
      timestamp: new Date().toISOString(),
      event: 'jwt_verify_no_keys',
      message: 'No JWT verification keys available (no public key or secret)',
    });
    return null;
  }
  
  for (const algorithm of algorithms) {
    try {
      const verifyKey = algorithm === 'RS256' ? config.jwt.publicKey : config.jwt.secret;
      
      if (!verifyKey) {
        logger.debug({
          timestamp: new Date().toISOString(),
          event: 'jwt_verify_skip_algorithm',
          algorithm,
          reason: 'key_not_available',
        });
        continue; // Skip this algorithm if key not available
      }

      const payload = jwt.verify(token, verifyKey, {
        algorithms: [algorithm],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as JWTPayload;

      logger.debug({
        timestamp: new Date().toISOString(),
        event: 'jwt_verify_success',
        algorithm,
        userId: payload.sub,
      });

      return payload;
    } catch (error) {
      // Log verification failures for debugging
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug({ timestamp: new Date().toISOString(), event: 'jwt_verify_expired' });
        return null; // Don't try other algorithms for expired tokens
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn({ 
          timestamp: new Date().toISOString(), 
          event: 'jwt_verify_failed',
          algorithm,
          error: (error as Error).message, 
        });
        // Continue to next algorithm
      } else {
        logger.error({
          timestamp: new Date().toISOString(),
          event: 'jwt_verify_unexpected_error',
          algorithm,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  
  logger.warn({
    timestamp: new Date().toISOString(),
    event: 'jwt_verify_all_algorithms_failed',
  });
  
  return null;
}

/**
 * Verify Supabase JWT token
 * Supabase can use ES256 or HS256 depending on project settings
 * - ES256: Requires fetching public key from JWKS endpoint
 * - HS256: Uses SUPABASE_JWT_SECRET
 * Returns normalized JWTPayload compatible with our system
 */
async function verifySupabaseJWT(token: string): Promise<JWTPayload | null> {
  // Decode header to check algorithm
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    logger.warn({
      timestamp: new Date().toISOString(),
      event: 'supabase_jwt_decode_failed',
    });
    return null;
  }

  const algorithm = decoded.header.alg;
  const kid = decoded.header.kid;
  
  logger.info({
    timestamp: new Date().toISOString(),
    event: 'supabase_jwt_verify_attempt',
    algorithm,
    hasKid: !!kid,
  });

  // For ES256 or RS256, we need to fetch the public key from JWKS
  if (algorithm === 'ES256' || algorithm === 'RS256') {
    // Extract Supabase project URL from issuer
    const payload = decoded.payload as SupabaseJWTPayload;
    const issuer = payload.iss; // e.g., https://xxx.supabase.co/auth/v1
    
    if (!issuer || !issuer.includes('supabase')) {
      logger.warn({
        timestamp: new Date().toISOString(),
        event: 'supabase_jwt_invalid_issuer',
        issuer,
      });
      return null;
    }

    // Build JWKS URL from issuer
    const jwksUri = issuer.replace('/auth/v1', '/auth/v1/.well-known/jwks.json');
    
    try {
      const client = jwksClient({
        jwksUri,
        cache: true,
        cacheMaxAge: 600000, // 10 minutes
      });

      const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
        client.getSigningKey(header.kid, (err, key) => {
          if (err) {
            callback(err);
            return;
          }
          const signingKey = key?.getPublicKey();
          callback(null, signingKey);
        });
      };

      return new Promise((resolve) => {
        jwt.verify(token, getKey, { algorithms: ['ES256', 'RS256'] }, (err, verifiedPayload) => {
          if (err) {
            logger.warn({
              timestamp: new Date().toISOString(),
              event: 'supabase_jwt_verify_failed',
              algorithm,
              error: err.message,
            });
            resolve(null);
            return;
          }

          const supaPayload = verifiedPayload as SupabaseJWTPayload;
          
          // Determine role from Supabase metadata
          let role: 'user' | 'agent' | 'admin' = 'user';
          if (supaPayload.app_metadata?.role === 'admin' || supaPayload.user_metadata?.role === 'admin' || supaPayload.user_metadata?.role === 'super_admin') {
            role = 'admin';
          } else if (supaPayload.app_metadata?.role === 'agent' || supaPayload.user_metadata?.role === 'agent') {
            role = 'agent';
          }

          const normalized: JWTPayload = {
            sub: supaPayload.sub,
            email: supaPayload.email || supaPayload.user_metadata?.email || '',
            role,
            iss: supaPayload.iss,
            aud: typeof supaPayload.aud === 'string' ? supaPayload.aud : 'authenticated',
            exp: supaPayload.exp,
            iat: supaPayload.iat,
          };

          logger.info({
            timestamp: new Date().toISOString(),
            event: 'supabase_jwt_verify_success',
            algorithm,
            userId: supaPayload.sub,
            role,
          });

          resolve(normalized);
        });
      });
    } catch (error) {
      logger.warn({
        timestamp: new Date().toISOString(),
        event: 'supabase_jwt_verify_error',
        algorithm,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  // For HS256, use the shared secret
  const supabaseSecret = config.supabase?.jwtSecret;
  
  if (!supabaseSecret) {
    logger.warn({
      timestamp: new Date().toISOString(),
      event: 'supabase_jwt_hs256_skip',
      reason: 'no_secret_configured',
    });
    return null;
  }

  try {
    const payload = jwt.verify(token, supabaseSecret, {
      algorithms: ['HS256'],
    }) as SupabaseJWTPayload;

    // Determine role from Supabase metadata
    let role: 'user' | 'agent' | 'admin' = 'user';
    if (payload.app_metadata?.role === 'admin' || payload.user_metadata?.role === 'admin' || payload.user_metadata?.role === 'super_admin') {
      role = 'admin';
    } else if (payload.app_metadata?.role === 'agent' || payload.user_metadata?.role === 'agent') {
      role = 'agent';
    }

    const normalized: JWTPayload = {
      sub: payload.sub,
      email: payload.email || payload.user_metadata?.email || '',
      role,
      iss: payload.iss,
      aud: typeof payload.aud === 'string' ? payload.aud : 'authenticated',
      exp: payload.exp,
      iat: payload.iat,
    };

    logger.info({
      timestamp: new Date().toISOString(),
      event: 'supabase_jwt_hs256_verify_success',
      userId: payload.sub,
      role,
    });

    return normalized;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn({ timestamp: new Date().toISOString(), event: 'supabase_jwt_expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn({ 
        timestamp: new Date().toISOString(), 
        event: 'supabase_jwt_hs256_verify_failed',
        error: (error as Error).message, 
      });
    } else {
      logger.warn({
        timestamp: new Date().toISOString(),
        event: 'supabase_jwt_hs256_error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

/**
 * Decode JWT without verification - ONLY for debugging/logging
 * Never use this for authentication decisions
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadB64 = parts[1];
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    return payload as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Generate JWT token (for internal use - gateway-issued tokens)
 * Note: For user authentication, tokens should be issued by Identity Service
 */
export function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: number = 900): string {
  const algorithm = config.jwt.algorithm;
  
  // Gateway typically only verifies tokens, not signs them
  // If signing is needed, use HS256 with shared secret for internal tokens
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

  // Public health checks (used by dashboards and uptime monitors)
  { method: 'GET', path: '/api/identity/health' },
  { method: 'GET', path: '/api/identity/api/v1/health' },
  { method: 'GET', path: '/api/requests/health' },
  { method: 'GET', path: '/api/requests/api/v1/health' },
  { method: 'GET', path: '/api/itineraries/health' },
  { method: 'GET', path: '/api/itineraries/api/v1/health' },
  { method: 'GET', path: '/api/booking-payments/health' },
  { method: 'GET', path: '/api/booking-payments/api/v1/health' },
  { method: 'GET', path: '/api/messaging/health' },
  { method: 'GET', path: '/api/messaging/api/v1/health' },
  { method: 'GET', path: '/api/disputes/health' },
  { method: 'GET', path: '/api/disputes/api/v1/health' },
  { method: 'GET', path: '/api/reviews/health' },
  { method: 'GET', path: '/api/reviews/api/v1/health' },
  { method: 'GET', path: '/api/notifications/health' },
  { method: 'GET', path: '/api/notifications/api/v1/health' },
  { method: 'GET', path: '/api/audit/health' },
  { method: 'GET', path: '/api/audit/api/v1/health' },

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
 * Supports both internal JWTs (Identity Service) and Supabase JWTs
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  
  // Try internal JWT verification first (Identity Service tokens)
  let payload = verifyJWT(token);
  let tokenSource = 'internal';
  
  // If internal verification fails, try Supabase JWT
  if (!payload) {
    payload = await verifySupabaseJWT(token);
    tokenSource = 'supabase';
  }

  if (!payload) {
    logger.warn({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || 'unknown',
      error: 'Invalid JWT - failed both internal and Supabase verification',
      algorithm: config.jwt.algorithm,
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token',
      code: 'AUTH_INVALID_TOKEN',
    });
    return;
  }

  // Check expiration (jwt.verify already checks this, but double-check)
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

  // Skip issuer check for Supabase tokens (they have different issuers)
  if (tokenSource === 'internal' && payload.iss !== config.jwt.issuer) {
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
  
  logger.debug({
    timestamp: new Date().toISOString(),
    event: 'auth_success',
    requestId: req.requestId,
    userId: payload.sub,
    role: payload.role,
    tokenSource,
  });

  next();
}

/**
 * Optional auth - doesn't fail if no token, just doesn't set user
 * Supports both internal JWTs (Identity Service) and Supabase JWTs
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.debug({
      timestamp: new Date().toISOString(),
      event: 'optional_auth_no_token',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
    });
    return next();
  }

  const token = authHeader.substring(7);
  
  // Try internal JWT verification first (Identity Service tokens)
  let payload = verifyJWT(token);
  let tokenSource = 'internal';

  // If internal verification fails, try Supabase JWT
  if (!payload) {
    payload = await verifySupabaseJWT(token);
    tokenSource = 'supabase';
  }

  if (payload && payload.exp >= Math.floor(Date.now() / 1000)) {
    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
    logger.debug({
      timestamp: new Date().toISOString(),
      event: 'optional_auth_success',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      userId: payload.sub,
      role: payload.role,
      tokenSource,
    });
  } else {
    logger.warn({
      timestamp: new Date().toISOString(),
      event: 'optional_auth_token_invalid',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      hasPayload: !!payload,
      tokenExpired: payload ? payload.exp < Math.floor(Date.now() / 1000) : 'N/A',
    });
  }

  next();
}
