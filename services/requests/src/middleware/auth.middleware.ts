/**
 * Authentication Middleware
 * 
 * Validates JWT tokens and attaches user context to requests.
 * Separate middleware for user and admin authentication.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../env';
import { Logger } from '../services/logger.service';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'user' | 'agent' | 'admin';
      };
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  role: 'user' | 'agent' | 'admin';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => void;
export type AdminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export function createAuthMiddleware(logger: Logger): AuthMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    // First, check for gateway-forwarded headers (trusted internal traffic)
    // The API Gateway validates the JWT and forwards user info in headers
    const gatewayUserId = req.headers['x-user-id'] as string | undefined;
    const gatewayUserRole = req.headers['x-user-role'] as string | undefined;
    const gatewayUserEmail = req.headers['x-user-email'] as string | undefined;

    if (gatewayUserId && gatewayUserRole) {
      // Trust gateway-forwarded headers
      req.user = {
        id: gatewayUserId,
        email: gatewayUserEmail || '',
        role: gatewayUserRole as 'user' | 'agent' | 'admin',
      };
      logger.debug('User authenticated via gateway headers', { userId: gatewayUserId, role: gatewayUserRole });
      next();
      return;
    }

    // Fallback to JWT validation for direct service calls (dev/testing)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header with Bearer token is required',
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      // Get verification key based on algorithm
      const algorithm = config.auth.jwtAlgorithm as 'RS256' | 'HS256';
      const verifyKey = algorithm === 'RS256' 
        ? config.auth.jwtPublicKey 
        : config.auth.jwtSecret;

      if (!verifyKey) {
        logger.error('JWT verification key not configured', { algorithm });
        res.status(500).json({
          error: {
            code: 'AUTH_CONFIG_ERROR',
            message: 'Authentication not properly configured',
          },
        });
        return;
      }

      const decoded = jwt.verify(token, verifyKey, {
        algorithms: [algorithm],
        issuer: config.auth.jwtIssuer,
        audience: config.auth.jwtAudience,
      }) as JwtPayload;

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };

      logger.debug('User authenticated via JWT', { userId: decoded.sub, role: decoded.role });
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired',
          },
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token',
          },
        });
        return;
      }

      logger.error('Authentication error', { error: (error as Error).message });
      res.status(500).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
      });
    }
  };
}

export function createAdminAuthMiddleware(logger: Logger): AdminAuthMiddleware {
  const baseAuthMiddleware = createAuthMiddleware(logger);

  return (req: Request, res: Response, next: NextFunction): void => {
    // First, run standard auth
    baseAuthMiddleware(req, res, () => {
      // If we got here, user is authenticated
      // Now check if they're an admin
      if (req.user?.role !== 'admin') {
        logger.warn('Non-admin user attempted admin action', {
          userId: req.user?.id,
          role: req.user?.role,
          path: req.path,
        });
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        });
        return;
      }

      logger.debug('Admin authenticated', { adminId: req.user.id });
      next();
    });
  };
}
