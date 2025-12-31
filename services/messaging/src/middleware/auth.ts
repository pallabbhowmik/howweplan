/**
 * Messaging Service - Authentication Middleware
 *
 * Handles JWT verification and authorization.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
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

export function createAuthMiddleware(): AuthMiddleware {
  const supabase = createClient(
    config.auth.supabaseUrl,
    config.auth.supabaseServiceRoleKey
  );

  /**
   * Extracts and verifies JWT from Authorization header.
   */
  async function verifyToken(authHeader: string | undefined): Promise<AuthenticatedUser | null> {
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      // Get user type from metadata
      const userType = (user.user_metadata?.['user_type'] ?? 'USER') as 'USER' | 'AGENT' | 'ADMIN';

      return {
        userId: user.id,
        userType,
        email: user.email ?? '',
      };
    } catch {
      return null;
    }
  }

  return {
    /**
     * Requires valid authentication.
     */
    async requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
      try {
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
     */
    async optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
      try {
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
