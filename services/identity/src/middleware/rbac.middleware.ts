/**
 * Role-Based Access Control (RBAC) middleware and guards.
 * Enforces permission-based access control on routes.
 */

import { Request, Response, NextFunction } from 'express';
import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  AccountStatus,
  AgentVerificationStatus,
} from '../types/identity.types.js';
import {
  InsufficientPermissionsError,
  AgentNotVerifiedError,
  AccountNotVerifiedError,
} from '../services/errors.js';
import { AuthenticatedRequest, isAuthenticated } from './auth.middleware.js';

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION CHECKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Checks if a role has any of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Checks if a role has all of the specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates middleware that requires specific roles.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthenticated(req)) {
      const error = new InsufficientPermissionsError();
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!roles.includes(req.identity.role)) {
      const error = new InsufficientPermissionsError();
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Creates middleware that requires a specific permission.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthenticated(req)) {
      const error = new InsufficientPermissionsError(permission);
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!hasPermission(req.identity.role, permission)) {
      const error = new InsufficientPermissionsError(permission);
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Creates middleware that requires any of the specified permissions.
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthenticated(req)) {
      const error = new InsufficientPermissionsError();
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!hasAnyPermission(req.identity.role, permissions)) {
      const error = new InsufficientPermissionsError();
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Creates middleware that requires all of the specified permissions.
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthenticated(req)) {
      const error = new InsufficientPermissionsError();
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!hasAllPermissions(req.identity.role, permissions)) {
      const error = new InsufficientPermissionsError();
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIZED GUARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Middleware that requires the user to be the owner of the resource.
 * The resource owner ID is extracted from the request params or body.
 */
export function requireOwnership(resourceIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isAuthenticated(req)) {
      const error = new InsufficientPermissionsError();
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const resourceOwnerId =
      req.params[resourceIdParam] || (req.body as Record<string, unknown>)?.[resourceIdParam];

    // Admins can access any resource
    if (req.identity.role === UserRole.ADMIN) {
      next();
      return;
    }

    // Check ownership
    if (resourceOwnerId !== req.identity.sub) {
      const error = new InsufficientPermissionsError();
      res.status(error.statusCode).json({
        success: false,
        error: error.toJSON(),
        requestId: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Middleware that requires the user's email to be verified.
 */
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthenticated(req)) {
    const error = new AccountNotVerifiedError();
    res.status(error.statusCode).json({
      success: false,
      error: error.toJSON(),
      requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Skip check for admins
  if (req.identity.role === UserRole.ADMIN) {
    next();
    return;
  }

  // Check if account is still pending verification
  if (req.identity.status === AccountStatus.PENDING_VERIFICATION) {
    const error = new AccountNotVerifiedError();
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

/**
 * Middleware that requires an agent to be verified.
 */
export function requireVerifiedAgent(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthenticated(req)) {
    const error = new AgentNotVerifiedError();
    res.status(error.statusCode).json({
      success: false,
      error: error.toJSON(),
      requestId: (req as AuthenticatedRequest).correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Skip check for admins
  if (req.identity.role === UserRole.ADMIN) {
    next();
    return;
  }

  // Check if user is an agent
  if (req.identity.role !== UserRole.AGENT) {
    const error = new InsufficientPermissionsError('Must be an agent');
    res.status(error.statusCode).json({
      success: false,
      error: error.toJSON(),
      requestId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Check if agent is verified
  if (req.identity.agentVerificationStatus !== AgentVerificationStatus.VERIFIED) {
    const error = new AgentNotVerifiedError();
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

/**
 * Middleware that requires admin role.
 * Shorthand for requireRole(UserRole.ADMIN).
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Middleware that requires agent role.
 * Shorthand for requireRole(UserRole.AGENT).
 */
export const requireAgent = requireRole(UserRole.AGENT);
