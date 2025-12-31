/**
 * RBAC Helpers
 *
 * Pure functions for role and permission checking.
 * All functions are deterministic and side-effect free.
 */

import {
  DEFAULT_ROLE_HIERARCHY,
  DEFAULT_ROLE_PERMISSIONS,
  PermissionDeniedError,
  RoleDeniedError,
  type RbacConfig,
  type RbacUser,
  type RbacUserWithPermissions,
  type Role,
  type Permission,
  type RolePermissionMap,
} from './types.js';

/**
 * Get all roles including inherited roles from hierarchy.
 * Pure function - no side effects.
 *
 * @param roles - Direct roles assigned to user
 * @param hierarchy - Role hierarchy map
 * @returns Set of all effective roles
 */
function getEffectiveRoles<R extends string>(
  roles: readonly R[],
  hierarchy?: Readonly<Record<R, readonly R[]>>
): ReadonlySet<R> {
  const effectiveRoles = new Set<R>(roles);

  if (!hierarchy) {
    return effectiveRoles;
  }

  for (const role of roles) {
    const inheritedRoles = hierarchy[role];
    if (inheritedRoles) {
      for (const inherited of inheritedRoles) {
        effectiveRoles.add(inherited);
      }
    }
  }

  return effectiveRoles;
}

/**
 * Get all permissions for a set of roles.
 * Pure function - no side effects.
 *
 * @param roles - Roles to get permissions for
 * @param rolePermissions - Role-to-permissions mapping
 * @returns Set of all permissions
 */
function getRolePermissions<R extends string, P extends string>(
  roles: ReadonlySet<R>,
  rolePermissions: RolePermissionMap<R, P>
): ReadonlySet<P> {
  const permissions = new Set<P>();

  for (const role of roles) {
    const rolePerms = rolePermissions[role];
    if (rolePerms) {
      for (const perm of rolePerms) {
        permissions.add(perm);
      }
    }
  }

  return permissions;
}

/**
 * Check if a user has a specific role.
 *
 * @param user - User with roles array
 * @param role - Role to check for
 * @param hierarchy - Optional role hierarchy for inheritance
 * @returns true if user has the role (directly or inherited)
 *
 * @example
 * ```typescript
 * const user = { roles: ['admin'] };
 * hasRole(user, 'admin'); // true
 * hasRole(user, 'user', DEFAULT_ROLE_HIERARCHY); // true (inherited)
 * ```
 *
 * @pure This function has no side effects
 */
export function hasRole<R extends string>(
  user: RbacUser<R>,
  role: R,
  hierarchy?: Readonly<Record<R, readonly R[]>>
): boolean {
  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  const effectiveRoles = getEffectiveRoles(user.roles, hierarchy);
  return effectiveRoles.has(role);
}

/**
 * Check if a user has any of the specified roles.
 *
 * @param user - User with roles array
 * @param roles - Roles to check for (any match returns true)
 * @param hierarchy - Optional role hierarchy for inheritance
 * @returns true if user has any of the roles
 *
 * @pure This function has no side effects
 */
export function hasAnyRole<R extends string>(
  user: RbacUser<R>,
  roles: readonly R[],
  hierarchy?: Readonly<Record<R, readonly R[]>>
): boolean {
  if (!user.roles || user.roles.length === 0 || roles.length === 0) {
    return false;
  }

  const effectiveRoles = getEffectiveRoles(user.roles, hierarchy);

  return roles.some((role) => effectiveRoles.has(role));
}

/**
 * Check if a user has all of the specified roles.
 *
 * @param user - User with roles array
 * @param roles - Roles to check for (all must match)
 * @param hierarchy - Optional role hierarchy for inheritance
 * @returns true if user has all of the roles
 *
 * @pure This function has no side effects
 */
export function hasAllRoles<R extends string>(
  user: RbacUser<R>,
  roles: readonly R[],
  hierarchy?: Readonly<Record<R, readonly R[]>>
): boolean {
  if (!user.roles || user.roles.length === 0) {
    return roles.length === 0;
  }

  if (roles.length === 0) {
    return true;
  }

  const effectiveRoles = getEffectiveRoles(user.roles, hierarchy);

  return roles.every((role) => effectiveRoles.has(role));
}

/**
 * Check if a user has a specific permission.
 *
 * @param user - User with roles and optional direct permissions
 * @param permission - Permission to check for
 * @param config - RBAC configuration (MUST be passed explicitly)
 * @returns true if user has the permission
 *
 * @example
 * ```typescript
 * const user = { roles: ['admin'] };
 * const config = {
 *   rolePermissions: DEFAULT_ROLE_PERMISSIONS,
 *   roleHierarchy: DEFAULT_ROLE_HIERARCHY,
 * };
 *
 * hasPermission(user, 'manage:users', config); // true
 * hasPermission(user, 'manage:system', config); // false
 * ```
 *
 * @pure This function has no side effects
 */
export function hasPermission<R extends string, P extends string>(
  user: RbacUserWithPermissions<R, P>,
  permission: P,
  config: RbacConfig<R, P>
): boolean {
  // Check direct permissions first
  if (user.permissions?.includes(permission)) {
    return true;
  }

  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  // Get effective roles (with inheritance)
  const effectiveRoles = getEffectiveRoles(user.roles, config.roleHierarchy);

  // Get all permissions for effective roles
  const rolePermissions = getRolePermissions(
    effectiveRoles,
    config.rolePermissions
  );

  return rolePermissions.has(permission);
}

/**
 * Check if a user has any of the specified permissions.
 *
 * @param user - User with roles and optional direct permissions
 * @param permissions - Permissions to check for (any match returns true)
 * @param config - RBAC configuration
 * @returns true if user has any of the permissions
 *
 * @pure This function has no side effects
 */
export function hasAnyPermission<R extends string, P extends string>(
  user: RbacUserWithPermissions<R, P>,
  permissions: readonly P[],
  config: RbacConfig<R, P>
): boolean {
  if (permissions.length === 0) {
    return false;
  }

  return permissions.some((perm) => hasPermission(user, perm, config));
}

/**
 * Check if a user has all of the specified permissions.
 *
 * @param user - User with roles and optional direct permissions
 * @param permissions - Permissions to check for (all must match)
 * @param config - RBAC configuration
 * @returns true if user has all of the permissions
 *
 * @pure This function has no side effects
 */
export function hasAllPermissions<R extends string, P extends string>(
  user: RbacUserWithPermissions<R, P>,
  permissions: readonly P[],
  config: RbacConfig<R, P>
): boolean {
  if (permissions.length === 0) {
    return true;
  }

  return permissions.every((perm) => hasPermission(user, perm, config));
}

/**
 * Assert that a user has a specific permission.
 * Throws PermissionDeniedError if the check fails.
 *
 * @param user - User with roles and optional direct permissions
 * @param permission - Permission to assert
 * @param config - RBAC configuration
 * @throws PermissionDeniedError if user does not have permission
 *
 * @example
 * ```typescript
 * try {
 *   assertPermission(user, 'manage:users', config);
 *   // User has permission, proceed
 * } catch (error) {
 *   if (error instanceof PermissionDeniedError) {
 *     // Handle denied permission
 *   }
 * }
 * ```
 *
 * @pure This function only throws, no other side effects
 */
export function assertPermission<R extends string, P extends string>(
  user: RbacUserWithPermissions<R, P>,
  permission: P,
  config: RbacConfig<R, P>
): void {
  if (!hasPermission(user, permission, config)) {
    throw new PermissionDeniedError(permission, user.roles);
  }
}

/**
 * Assert that a user has a specific role.
 * Throws RoleDeniedError if the check fails.
 *
 * @param user - User with roles
 * @param role - Role to assert
 * @param hierarchy - Optional role hierarchy for inheritance
 * @throws RoleDeniedError if user does not have role
 *
 * @pure This function only throws, no other side effects
 */
export function assertRole<R extends string>(
  user: RbacUser<R>,
  role: R,
  hierarchy?: Readonly<Record<R, readonly R[]>>
): void {
  if (!hasRole(user, role, hierarchy)) {
    throw new RoleDeniedError(role, user.roles);
  }
}

/**
 * Get all effective permissions for a user.
 *
 * @param user - User with roles and optional direct permissions
 * @param config - RBAC configuration
 * @returns Array of all permissions the user has
 *
 * @pure This function has no side effects
 */
export function getUserPermissions<R extends string, P extends string>(
  user: RbacUserWithPermissions<R, P>,
  config: RbacConfig<R, P>
): readonly P[] {
  const permissions = new Set<P>();

  // Add direct permissions
  if (user.permissions) {
    for (const perm of user.permissions) {
      permissions.add(perm);
    }
  }

  // Add role-based permissions
  if (user.roles && user.roles.length > 0) {
    const effectiveRoles = getEffectiveRoles(user.roles, config.roleHierarchy);
    const rolePerms = getRolePermissions(effectiveRoles, config.rolePermissions);

    for (const perm of rolePerms) {
      permissions.add(perm);
    }
  }

  return Array.from(permissions);
}

/**
 * Get all effective roles for a user (including inherited).
 *
 * @param user - User with roles
 * @param hierarchy - Optional role hierarchy
 * @returns Array of all effective roles
 *
 * @pure This function has no side effects
 */
export function getUserRoles<R extends string>(
  user: RbacUser<R>,
  hierarchy?: Readonly<Record<R, readonly R[]>>
): readonly R[] {
  if (!user.roles || user.roles.length === 0) {
    return [];
  }

  return Array.from(getEffectiveRoles(user.roles, hierarchy));
}

/**
 * Create an RBAC configuration with defaults.
 * Useful for creating a typed configuration object.
 *
 * @param config - Partial configuration to merge with defaults
 * @returns Complete RBAC configuration
 *
 * @pure This function has no side effects
 */
export function createRbacConfig(
  config?: Partial<RbacConfig<Role, Permission>>
): RbacConfig<Role, Permission> {
  return {
    rolePermissions: config?.rolePermissions ?? DEFAULT_ROLE_PERMISSIONS,
    roleHierarchy: config?.roleHierarchy ?? DEFAULT_ROLE_HIERARCHY,
    strict: config?.strict ?? false,
  };
}
