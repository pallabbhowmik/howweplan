/**
 * RBAC Module
 *
 * Role-Based Access Control primitives and helpers.
 * All functions are pure and deterministic.
 */

export {
  DEFAULT_ROLE_HIERARCHY,
  DEFAULT_ROLE_PERMISSIONS,
  Permission,
  PermissionDeniedError,
  Role,
  RoleDeniedError,
  type RbacConfig,
  type RbacUser,
  type RbacUserWithPermissions,
  type RolePermissionMap,
} from './types.js';

export {
  assertPermission,
  assertRole,
  createRbacConfig,
  getUserPermissions,
  getUserRoles,
  hasAllPermissions,
  hasAllRoles,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
} from './helpers.js';
