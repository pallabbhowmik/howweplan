import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

type Role = 'user' | 'agent' | 'admin' | 'system';

interface RoutePermission {
  path: string | RegExp;
  method: string | string[];
  roles: Role[];
  ownershipCheck?: (req: Request) => boolean; // For checking resource ownership
}

/**
 * Role hierarchy - higher roles inherit lower role permissions
 */
const ROLE_HIERARCHY: Record<Role, Role[]> = {
  user: ['user'],
  agent: ['agent', 'user'],
  admin: ['admin', 'agent', 'user'],
  system: ['system', 'admin', 'agent', 'user'],
};

/**
 * Route-based permissions configuration
 * Define which roles can access which endpoints
 */
const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Identity Service - mostly public or self-access
  // NOTE: RBAC runs before route handlers, so `req.params` is not reliable here.
  // We must parse resource ids from `req.path`.
  {
    path: '/api/identity/users/me',
    method: ['GET', 'PATCH'],
    roles: ['user'],
  },
  {
    path: /^\/api\/identity\/users\/[^/]+$/,
    method: 'GET',
    roles: ['user'],
    ownershipCheck: (req) => {
      const match = req.path.match(/^\/api\/identity\/users\/([^/]+)$/);
      const requested = match?.[1];
      if (!requested) return false;
      if (requested === 'me') return true;
      return requested === req.user?.userId;
    },
  },
  {
    path: /^\/api\/identity\/users\/[^/]+$/,
    method: 'PUT',
    roles: ['user'],
    ownershipCheck: (req) => {
      const match = req.path.match(/^\/api\/identity\/users\/([^/]+)$/);
      const requested = match?.[1];
      if (!requested) return false;
      if (requested === 'me') return true;
      return requested === req.user?.userId;
    },
  },
  { path: '/api/identity/users', method: 'GET', roles: ['admin'] },
  { path: '/api/identity/users', method: 'POST', roles: ['admin'] },
  
  // Requests Service
  { path: '/api/requests', method: 'GET', roles: ['user'] }, // Users see their own, agents see assigned
  { path: '/api/requests', method: 'POST', roles: ['user'] },
  { path: /^\/api\/requests\/[^/]+$/, method: 'GET', roles: ['user'] },
  { path: /^\/api\/requests\/[^/]+$/, method: ['PUT', 'PATCH'], roles: ['user'] },
  { path: /^\/api\/requests\/[^/]+$/, method: 'DELETE', roles: ['user', 'admin'] },
  
  // Itineraries Service
  { path: '/api/itineraries', method: 'GET', roles: ['user'] },
  { path: '/api/itineraries', method: 'POST', roles: ['agent'] },
  { path: /^\/api\/itineraries\/[^/]+$/, method: 'GET', roles: ['user'] },
  { path: /^\/api\/itineraries\/[^/]+$/, method: ['PUT', 'PATCH'], roles: ['agent'] },
  { path: /^\/api\/itineraries\/[^/]+$/, method: 'DELETE', roles: ['agent', 'admin'] },
  
  // Matching Service
  { path: '/api/matching', method: '*', roles: ['agent', 'system'] },
  
  // Booking & Payments (supports both legacy and /api/v1/ paths)
  { path: '/api/booking-payments/bookings', method: 'GET', roles: ['user'] },
  { path: '/api/booking-payments/bookings', method: 'POST', roles: ['user'] },
  { path: /^\/api\/booking-payments\/bookings\/[^/]+$/, method: 'GET', roles: ['user'] },
  { path: '/api/booking-payments/api/v1/bookings', method: 'GET', roles: ['user'] },
  { path: '/api/booking-payments/api/v1/bookings', method: 'POST', roles: ['user'] },
  { path: /^\/api\/booking-payments\/api\/v1\/bookings\/[^/]+/, method: 'GET', roles: ['user'] },
  { path: /^\/api\/booking-payments\/api\/v1\/bookings\/[^/]+\/cancel$/, method: 'POST', roles: ['user'] },
  { path: /^\/api\/booking-payments\/api\/v1\/bookings\/[^/]+\/checkout$/, method: 'POST', roles: ['user'] },
  { path: '/api/booking-payments/payments', method: '*', roles: ['user'] },
  { path: '/api/booking-payments/api/v1/payments', method: '*', roles: ['user'] },
  { path: '/api/booking-payments/admin', method: '*', roles: ['admin'] },
  
  // Messaging Service
  { path: '/api/messaging', method: '*', roles: ['user'] },
  
  // Notifications Service (supports both legacy and /api/v1/ paths)
  { path: '/api/notifications', method: 'GET', roles: ['user'] },
  { path: '/api/notifications', method: 'POST', roles: ['system'] },
  { path: /^\/api\/notifications\/[^/]+\/read$/, method: 'POST', roles: ['user'] },
  { path: '/api/notifications/api/v1/notifications', method: 'GET', roles: ['user'] },
  { path: /^\/api\/notifications\/api\/v1\/notifications\/[^/]+\/read$/, method: 'POST', roles: ['user'] },
  
  // Disputes Service
  { path: '/api/disputes', method: 'GET', roles: ['user'] },
  { path: '/api/disputes', method: 'POST', roles: ['user'] },
  { path: /^\/api\/disputes\/[^/]+$/, method: 'GET', roles: ['user'] },
  { path: /^\/api\/disputes\/[^/]+\/resolve$/, method: 'POST', roles: ['admin'] },
  
  // Audit Service - Admin/System only
  { path: '/api/audit', method: '*', roles: ['admin', 'system'] },
  
  // Reviews Service
  { path: '/api/reviews', method: 'GET', roles: ['user'] }, // Public readable
  { path: '/api/reviews', method: 'POST', roles: ['user'] },
  { path: /^\/api\/reviews\/[^/]+$/, method: 'GET', roles: ['user'] },
  { path: /^\/api\/reviews\/[^/]+$/, method: ['PUT', 'DELETE'], roles: ['user', 'admin'] },
];

/**
 * Check if user's role has access based on role hierarchy
 */
function hasRoleAccess(userRole: Role, allowedRoles: Role[]): boolean {
  const userRoles = ROLE_HIERARCHY[userRole] || [];
  return allowedRoles.some(role => userRoles.includes(role));
}

/**
 * Find matching route permission
 */
function findRoutePermission(method: string, path: string): RoutePermission | null {
  for (const permission of ROUTE_PERMISSIONS) {
    // Check method
    const methods = Array.isArray(permission.method) ? permission.method : [permission.method];
    if (!methods.includes('*') && !methods.includes(method)) {
      continue;
    }

    // Check path
    if (typeof permission.path === 'string') {
      if (path === permission.path || path.startsWith(permission.path + '/')) {
        return permission;
      }
    } else if (permission.path instanceof RegExp) {
      if (permission.path.test(path)) {
        return permission;
      }
    }
  }
  return null;
}

/**
 * RBAC Authorization Middleware
 * 
 * Note: When no user is authenticated, we pass through to let the backend service
 * handle authorization. This is intentional - backend services check X-User-Id header
 * and return appropriate 401 responses. The gateway RBAC only enforces role-based
 * restrictions when a user IS authenticated (e.g., preventing users from accessing
 * admin endpoints).
 */
export function rbacMiddleware(req: Request, res: Response, next: NextFunction): void {
  const permission = findRoutePermission(req.method, req.path);

  // If no specific permission defined, allow through (public or handled by service)
  if (!permission) {
    return next();
  }

  // If no user authenticated, pass through to let backend service handle auth
  // Backend services check X-User-Id header and return 401 if required
  if (!req.user) {
    return next();
  }

  // Check role access for authenticated users
  if (!hasRoleAccess(req.user.role, permission.roles)) {
    logger.warn({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip || 'unknown',
      userId: req.user.userId,
      userRole: req.user.role,
      error: `Access denied. Required roles: ${permission.roles.join(', ')}`,
    });

    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this resource',
      code: 'RBAC_ACCESS_DENIED',
    });
    return;
  }

  // Check ownership if required
  if (permission.ownershipCheck && !permission.ownershipCheck(req)) {
    // Only deny if not admin/system
    if (!hasRoleAccess(req.user.role, ['admin'])) {
      logger.warn({
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        ip: req.ip || 'unknown',
        userId: req.user.userId,
        userRole: req.user.role,
        error: 'Resource ownership check failed',
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources',
        code: 'RBAC_OWNERSHIP_DENIED',
      });
      return;
    }
  }

  next();
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!hasRoleAccess(req.user.role, roles)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This endpoint requires one of these roles: ${roles.join(', ')}`,
        code: 'RBAC_ROLE_REQUIRED',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user owns the resource
 */
export function requireOwnership(extractUserId: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Admin and system roles bypass ownership check
    if (hasRoleAccess(req.user.role, ['admin'])) {
      return next();
    }

    const resourceUserId = extractUserId(req);
    if (resourceUserId && resourceUserId !== req.user.userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources',
        code: 'RBAC_OWNERSHIP_DENIED',
      });
      return;
    }

    next();
  };
}
