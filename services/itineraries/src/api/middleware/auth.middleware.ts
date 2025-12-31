import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../env.js';
import { UnauthorizedError, ForbiddenError } from '../../utils/index.js';

/**
 * JWT payload structure.
 */
export interface JwtPayload {
  sub: string;
  role: 'TRAVELER' | 'AGENT' | 'ADMIN' | 'SYSTEM';
  email?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

/**
 * Extended request with authenticated user.
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Verify JWT token and extract payload.
 */
function verifyToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as JwtPayload;

    if (!payload.sub || !payload.role) {
      throw new UnauthorizedError('Invalid token payload');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
}

/**
 * Authentication middleware.
 * Validates JWT token and attaches user to request.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authorization header required');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
    }

    const payload = verifyToken(token);
    (req as AuthenticatedRequest).user = payload;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Internal service authentication middleware.
 * Validates internal API key for service-to-service calls.
 */
export function authenticateInternal(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const apiKey = req.headers['x-internal-api-key'];

    if (!apiKey || apiKey !== env.INTERNAL_API_KEY) {
      throw new UnauthorizedError('Invalid internal API key');
    }

    // Set system user for internal calls
    (req as AuthenticatedRequest).user = {
      sub: 'system',
      role: 'SYSTEM',
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Create role-based authorization middleware.
 */
export function requireRole(...allowedRoles: JwtPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError(
          `Role '${user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require admin role.
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Require agent or admin role.
 */
export const requireAgentOrAdmin = requireRole('AGENT', 'ADMIN');

/**
 * Require any authenticated user.
 */
export const requireAuthenticated = requireRole('TRAVELER', 'AGENT', 'ADMIN', 'SYSTEM');
