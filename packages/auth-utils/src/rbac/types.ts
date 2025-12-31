/**
 * RBAC Types
 *
 * Role-Based Access Control type definitions.
 * All types are pure data structures with no side effects.
 */

/**
 * Standard roles available in the system.
 * Extend this enum in consuming applications as needed.
 */
export const Role = {
  GUEST: 'guest',
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/**
 * Standard permissions available in the system.
 * Extend this enum in consuming applications as needed.
 */
export const Permission = {
  // Read permissions
  READ_OWN: 'read:own',
  READ_ANY: 'read:any',

  // Write permissions
  CREATE_OWN: 'create:own',
  CREATE_ANY: 'create:any',
  UPDATE_OWN: 'update:own',
  UPDATE_ANY: 'update:any',
  DELETE_OWN: 'delete:own',
  DELETE_ANY: 'delete:any',

  // User management
  MANAGE_USERS: 'manage:users',
  MANAGE_ROLES: 'manage:roles',

  // System administration
  VIEW_AUDIT_LOGS: 'view:audit_logs',
  MANAGE_SETTINGS: 'manage:settings',
  MANAGE_SYSTEM: 'manage:system',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Mapping of roles to their granted permissions.
 * Used to define what each role is allowed to do.
 */
export type RolePermissionMap<
  R extends string = Role,
  P extends string = Permission,
> = Readonly<Record<R, readonly P[]>>;

/**
 * Default role-permission mapping.
 * Applications should define their own mapping based on requirements.
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMap = {
  [Role.GUEST]: [Permission.READ_OWN],
  [Role.USER]: [
    Permission.READ_OWN,
    Permission.CREATE_OWN,
    Permission.UPDATE_OWN,
    Permission.DELETE_OWN,
  ],
  [Role.MODERATOR]: [
    Permission.READ_OWN,
    Permission.READ_ANY,
    Permission.CREATE_OWN,
    Permission.UPDATE_OWN,
    Permission.UPDATE_ANY,
    Permission.DELETE_OWN,
  ],
  [Role.ADMIN]: [
    Permission.READ_OWN,
    Permission.READ_ANY,
    Permission.CREATE_OWN,
    Permission.CREATE_ANY,
    Permission.UPDATE_OWN,
    Permission.UPDATE_ANY,
    Permission.DELETE_OWN,
    Permission.DELETE_ANY,
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [Role.SUPER_ADMIN]: [
    Permission.READ_OWN,
    Permission.READ_ANY,
    Permission.CREATE_OWN,
    Permission.CREATE_ANY,
    Permission.UPDATE_OWN,
    Permission.UPDATE_ANY,
    Permission.DELETE_OWN,
    Permission.DELETE_ANY,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_SYSTEM,
  ],
} as const;

/**
 * User object with roles for RBAC operations.
 * This is the minimal interface required for role/permission checks.
 */
export interface RbacUser<R extends string = string> {
  readonly roles: readonly R[];
}

/**
 * User object with explicit permissions.
 * Permissions can be granted directly in addition to role-based permissions.
 */
export interface RbacUserWithPermissions<
  R extends string = string,
  P extends string = string,
> extends RbacUser<R> {
  readonly permissions?: readonly P[];
}

/**
 * Configuration for RBAC operations.
 * Must be passed explicitly to all functions that need it.
 */
export interface RbacConfig<
  R extends string = Role,
  P extends string = Permission,
> {
  /**
   * Mapping of roles to permissions.
   * MUST be passed explicitly - never read from environment.
   */
  readonly rolePermissions: RolePermissionMap<R, P>;

  /**
   * Role hierarchy where higher roles inherit permissions from lower roles.
   * Key is the role, value is array of roles it inherits from.
   * Optional - if not provided, no inheritance is applied.
   */
  readonly roleHierarchy?: Readonly<Record<R, readonly R[]>>;

  /**
   * Whether to use strict mode.
   * In strict mode, unknown roles/permissions throw errors.
   * @default false
   */
  readonly strict?: boolean;
}

/**
 * Default role hierarchy where higher roles inherit from lower ones.
 */
export const DEFAULT_ROLE_HIERARCHY: Readonly<Record<Role, readonly Role[]>> = {
  [Role.GUEST]: [],
  [Role.USER]: [Role.GUEST],
  [Role.MODERATOR]: [Role.USER, Role.GUEST],
  [Role.ADMIN]: [Role.MODERATOR, Role.USER, Role.GUEST],
  [Role.SUPER_ADMIN]: [Role.ADMIN, Role.MODERATOR, Role.USER, Role.GUEST],
} as const;

/**
 * Error thrown when a permission assertion fails.
 */
export class PermissionDeniedError extends Error {
  public readonly code = 'PERMISSION_DENIED' as const;

  constructor(
    public readonly permission: string,
    public readonly userRoles: readonly string[],
    message?: string
  ) {
    super(
      message ??
        `Permission '${permission}' denied for user with roles: ${userRoles.join(', ') || 'none'}`
    );
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Error thrown when a role assertion fails.
 */
export class RoleDeniedError extends Error {
  public readonly code = 'ROLE_DENIED' as const;

  constructor(
    public readonly requiredRole: string,
    public readonly userRoles: readonly string[],
    message?: string
  ) {
    super(
      message ??
        `Role '${requiredRole}' required. User has roles: ${userRoles.join(', ') || 'none'}`
    );
    this.name = 'RoleDeniedError';
  }
}
