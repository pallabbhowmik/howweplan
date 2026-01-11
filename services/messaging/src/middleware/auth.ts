/**
 * Messaging Service - Authentication Middleware
 *
 * Handles authentication via:
 * 1. API Gateway headers (X-User-Id, X-User-Role) - trusted when coming from gateway
 * 2. JWT verification - fallback for direct API calls
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../env';
import { Errors } from '../api/errors';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  userId: string;
  userType: 'USER' | 'AGENT' | 'ADMIN';
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================

export interface AuthMiddleware {
  requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
  requireInternalAuth: (req: Request, res: Response, next: NextFunction) => void;
  optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}

/**
 * Extract user from API Gateway forwarded headers.
 * The gateway authenticates the JWT and forwards user info in headers.
 */
function getGatewayUser(req: Request): AuthenticatedUser | null {
  const userId = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;
  const email = (req.headers['x-user-email'] as string | undefined) ?? '';

  if (!userId || !role) return null;

  const normalizedRole = String(role).toUpperCase();
  const userType: 'USER' | 'AGENT' | 'ADMIN' =
    normalizedRole === 'AGENT' ? 'AGENT' : normalizedRole === 'ADMIN' ? 'ADMIN' : 'USER';

  return { userId, userType, email };
}

export function createAuthMiddleware(): AuthMiddleware {
  /**
   * Extracts and verifies JWT from Authorization header.
   */
  async function verifyToken(authHeader: string | undefined): Promise<AuthenticatedUser | null> {
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    try {
      // Prefer Identity-issued JWT validation (fast, no external calls)
      const algorithm = config.auth.jwtAlgorithm;
      const verifyKey = algorithm === 'RS256' ? config.auth.jwtPublicKey : config.auth.jwtSecret;

      if (verifyKey) {
        try {
          const payload = jwt.verify(token, verifyKey, {
            algorithms: [algorithm],
            // Issuer in local dev configs has historically varied; enforce only when explicitly set.
            ...(config.auth.jwtIssuer ? { issuer: config.auth.jwtIssuer } : {}),
          }) as any;

          const role = String(payload?.role ?? 'USER').toUpperCase();
          const userType: 'USER' | 'AGENT' | 'ADMIN' =
            role === 'AGENT' ? 'AGENT' : role === 'ADMIN' ? 'ADMIN' : 'USER';

          return {
            userId: String(payload?.sub ?? ''),
            userType,
            email: String(payload?.email ?? ''),
          };
        } catch (jwtError) {
           console.warn(`[Auth] Local JWT verification failed: ${(jwtError as Error).message}`);
           // Fallthrough to Supabase check
        }
      } else {
         console.warn('[Auth] No verification key available for local JWT validation');
      }

      // Back-compat fallback (slower): validate Supabase access tokens.
      // This keeps older clients working while we complete the migration.
      if (config.isDevelopment) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(config.auth.supabaseUrl, config.auth.supabaseServiceRoleKey);
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
          return null;
        }

        const userType = (user.user_metadata?.['user_type'] ?? 'USER') as 'USER' | 'AGENT' | 'ADMIN';
        return {
          userId: user.id,
          userType,
          email: user.email ?? '',
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  return {
    /**
     * Requires valid authentication.
     * Checks API Gateway headers first (trusted), then falls back to JWT verification.
     */
    async requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
      try {
        // First, check for gateway-forwarded headers (gateway has already authenticated)
        const gatewayUser = getGatewayUser(req);
        if (gatewayUser) {
          req.user = gatewayUser;
          next();
          return;
        }

        // Fallback: verify JWT directly (for direct API calls or when gateway didn't set headers)
        const user = await verifyToken(req.headers.authorization);

        if (!user) {
          throw Errors.UNAUTHORIZED();
        }

        req.user = user;
        next();
      } catch (error) {
        next(error);
      }
    },

    /**
     * Requires admin role.
     */
    requireAdmin(req: Request, _res: Response, next: NextFunction): void {
      if (!req.user) {
        next(Errors.UNAUTHORIZED());
        return;
      }

      if (req.user.userType !== 'ADMIN') {
        next(Errors.FORBIDDEN('Admin access required'));
        return;
      }

      next();
    },

    /**
     * Requires internal service API key.
     */
    requireInternalAuth(req: Request, _res: Response, next: NextFunction): void {
      const apiKey = req.headers['x-internal-api-key'];

      if (apiKey !== config.services.internalApiKey) {
        next(Errors.UNAUTHORIZED());
        return;
      }

      // Set system user for internal calls
      req.user = {
        userId: 'SYSTEM',
        userType: 'ADMIN',
        email: 'system@internal',
      };

      next();
    },

    /**
     * Optional authentication - doesn't fail if no token.
     * Checks API Gateway headers first (trusted), then falls back to JWT verification.
     */
    async optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
      try {
        // First, check for gateway-forwarded headers
        const gatewayUser = getGatewayUser(req);
        if (gatewayUser) {
          req.user = gatewayUser;
          next();
          return;
        }

        // Fallback: verify JWT directly
        const user = await verifyToken(req.headers.authorization);
        if (user) {
          req.user = user;
        }
        next();
      } catch {
        next();
      }
    },
  };
}
