import type { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload as JwtLibPayload, Algorithm } from 'jsonwebtoken';
import { readFileSync, existsSync } from 'fs';
import { env } from '../../env.js';
import { UnauthorizedError, ForbiddenError } from '../../utils/index.js';

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
  const envKey = env.JWT_PUBLIC_KEY;
  return envKey || '';
}

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
    const algorithm = (env.JWT_ALGORITHM || 'RS256') as Algorithm;
    const publicKey = getJwtPublicKey();
    const secret = env.JWT_SECRET;
    
    // Determine verification key based on algorithm
    const verifyKey = algorithm === 'RS256' ? publicKey : secret;
    
    if (!verifyKey) {
      throw new UnauthorizedError(`JWT verification key not configured (${algorithm})`);
    }

    const payload = jwt.verify(token, verifyKey, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: [algorithm],
    }) as JwtLibPayload & JwtPayload;

    if (!payload.sub || !payload.role) {
      throw new UnauthorizedError('Invalid token payload');
    }

    return {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
      iss: payload.iss,
      aud: typeof payload.aud === 'string' ? payload.aud : payload.aud?.[0],
      exp: payload.exp,
      iat: payload.iat,
    };
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
 * Extract user from API Gateway forwarded headers.
 * The gateway authenticates the JWT and forwards user info in headers.
 */
function getGatewayUser(req: Request): JwtPayload | null {
  const userId = req.headers['x-user-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string | undefined;
  const email = (req.headers['x-user-email'] as string | undefined) ?? '';

  if (!userId || !role) return null;

  const normalizedRole = String(role).toUpperCase();
  const mappedRole: JwtPayload['role'] =
    normalizedRole === 'AGENT' ? 'AGENT' :
    normalizedRole === 'ADMIN' ? 'ADMIN' :
    normalizedRole === 'SYSTEM' ? 'SYSTEM' : 'TRAVELER';

  return { sub: userId, role: mappedRole, email };
}

/**
 * Authentication middleware.
 * Validates JWT token and attaches user to request.
 * Checks API Gateway headers first (trusted), then falls back to JWT verification.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    // First, check for gateway-forwarded headers (gateway has already authenticated)
    const gatewayUser = getGatewayUser(req);
    if (gatewayUser) {
      (req as AuthenticatedRequest).user = gatewayUser;
      next();
      return;
    }

    // Fallback: verify JWT directly (for direct API calls or testing)
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
