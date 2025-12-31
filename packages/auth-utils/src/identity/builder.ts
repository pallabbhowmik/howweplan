/**
 * Identity Context Builder
 *
 * Pure functions for building identity context from JWT claims.
 * All functions are deterministic and side-effect free.
 */

import type {
  AnonymousIdentityConfig,
  AuthMethod,
  IdentityClaims,
  IdentityContext,
  IdentityContextConfig,
  IdentityContextResult,
  IdentityStatus,
} from './types.js';

/**
 * Extract an array value from claims with type safety.
 * Pure function - no side effects.
 */
function extractArrayClaim(
  claims: IdentityClaims,
  key: string
): readonly string[] {
  const value = claims[key];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    // Handle space-separated string (common for scope claim)
    return value.split(/\s+/).filter(Boolean);
  }

  return [];
}

/**
 * Extract a string value from claims with type safety.
 * Pure function - no side effects.
 */
function extractStringClaim(
  claims: IdentityClaims,
  key: string
): string | undefined {
  const value = claims[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Extract a boolean value from claims with type safety.
 * Pure function - no side effects.
 */
function extractBooleanClaim(
  claims: IdentityClaims,
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = claims[key];
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return defaultValue;
}

/**
 * Extract a number value from claims with type safety.
 * Pure function - no side effects.
 */
function extractNumberClaim(
  claims: IdentityClaims,
  key: string
): number | undefined {
  const value = claims[key];
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  return undefined;
}

/**
 * Map roles from claims to system roles.
 * Pure function - no side effects.
 */
function mapRoles<R extends string>(
  claimRoles: readonly string[],
  mapping?: Readonly<Record<string, R>>
): readonly R[] {
  if (!mapping) {
    return claimRoles as readonly R[];
  }

  const mappedRoles: R[] = [];

  for (const role of claimRoles) {
    const mappedRole = mapping[role];
    if (mappedRole !== undefined) {
      mappedRoles.push(mappedRole);
    } else {
      // Keep unmapped roles as-is
      mappedRoles.push(role as R);
    }
  }

  return mappedRoles;
}

/**
 * Map permissions from claims to system permissions.
 * Pure function - no side effects.
 */
function mapPermissions<P extends string>(
  claimPermissions: readonly string[],
  mapping?: Readonly<Record<string, P>>
): readonly P[] {
  if (!mapping) {
    return claimPermissions as readonly P[];
  }

  const mappedPermissions: P[] = [];

  for (const perm of claimPermissions) {
    const mappedPerm = mapping[perm];
    if (mappedPerm !== undefined) {
      mappedPermissions.push(mappedPerm);
    } else {
      mappedPermissions.push(perm as P);
    }
  }

  return mappedPermissions;
}

/**
 * Determine identity status from claims and expiration.
 * Pure function - no side effects.
 *
 * @param claims - The identity claims
 * @param currentTime - Current timestamp (must be passed explicitly)
 */
function determineStatus(
  claims: IdentityClaims,
  currentTime?: number
): IdentityStatus {
  // Check if we have a subject (user ID)
  if (!claims.sub) {
    return 'anonymous';
  }

  // Check expiration if currentTime provided
  if (currentTime !== undefined) {
    const exp = extractNumberClaim(claims, 'exp');
    if (exp !== undefined && currentTime > exp) {
      return 'expired';
    }
  }

  return 'authenticated';
}

/**
 * Build an identity context from JWT claims.
 *
 * This function extracts and normalizes user identity information
 * from JWT claims. All configuration must be passed explicitly.
 *
 * @param claims - JWT claims to build identity from
 * @param config - Configuration for identity building
 * @param options - Additional options
 * @returns Identity context
 *
 * @example
 * ```typescript
 * const claims = {
 *   sub: 'user-123',
 *   email: 'user@example.com',
 *   roles: ['admin'],
 *   exp: 1735600000,
 * };
 *
 * const config = {
 *   rolesClaimKey: 'roles',
 *   defaultRoles: ['user'],
 * };
 *
 * const identity = buildIdentityContext(claims, config, {
 *   currentTime: Math.floor(Date.now() / 1000),
 *   authMethod: 'jwt',
 * });
 * ```
 *
 * @pure This function has no side effects
 */
export function buildIdentityContext<
  R extends string = string,
  P extends string = string,
>(
  claims: IdentityClaims,
  config: IdentityContextConfig<R, P> = {},
  options: {
    /** Current timestamp for expiration checking */
    currentTime?: number;
    /** Authentication method used */
    authMethod?: AuthMethod;
  } = {}
): IdentityContext<R, P> {
  const {
    rolesClaimKey = 'roles',
    permissionsClaimKey = 'permissions',
    defaultRoles = [],
    roleMapping,
    permissionMapping,
    userIdClaimKey = 'sub',
    emailClaimKey = 'email',
    nameClaimKey = 'name',
    extractMetadata,
  } = config;

  // Extract basic identity info
  const userId = extractStringClaim(claims, userIdClaimKey);
  const email = extractStringClaim(claims, emailClaimKey);
  const emailVerified = extractBooleanClaim(claims, 'email_verified', false);
  const displayName =
    extractStringClaim(claims, nameClaimKey) ??
    extractStringClaim(claims, 'preferred_username');
  const expiresAt = extractNumberClaim(claims, 'exp');

  // Extract and map roles
  const rawRoles = extractArrayClaim(claims, rolesClaimKey);
  const roles: readonly R[] =
    rawRoles.length > 0
      ? mapRoles(rawRoles, roleMapping)
      : (defaultRoles as readonly R[]);

  // Extract and map permissions
  const rawPermissions = extractArrayClaim(claims, permissionsClaimKey);
  const permissions = mapPermissions(rawPermissions, permissionMapping);

  // Determine status
  const status = determineStatus(claims, options.currentTime);

  // Extract custom metadata
  const metadata = extractMetadata ? extractMetadata(claims) : {};

  return {
    userId,
    email,
    emailVerified,
    displayName,
    roles,
    permissions,
    status,
    authMethod: options.authMethod,
    claims: Object.freeze({ ...claims }),
    metadata: Object.freeze(metadata),
    expiresAt,
    isAuthenticated: status === 'authenticated',
    isAnonymous: status === 'anonymous',
  };
}

/**
 * Build an identity context with result wrapper.
 * Useful for error handling in pipelines.
 *
 * @param claims - JWT claims to build identity from
 * @param config - Configuration for identity building
 * @param options - Additional options
 * @returns Result object with success flag and identity or error
 *
 * @pure This function has no side effects
 */
export function tryBuildIdentityContext<
  R extends string = string,
  P extends string = string,
>(
  claims: IdentityClaims,
  config: IdentityContextConfig<R, P> = {},
  options: {
    currentTime?: number;
    authMethod?: AuthMethod;
  } = {}
): IdentityContextResult<R, P> {
  try {
    const identity = buildIdentityContext(claims, config, options);
    return {
      success: true,
      identity,
    };
  } catch (error) {
    return {
      success: false,
      identity: undefined,
      error: error instanceof Error ? error.message : 'Unknown error building identity',
    };
  }
}

/**
 * Create an anonymous identity context.
 *
 * @param config - Optional configuration for anonymous identity
 * @returns Anonymous identity context
 *
 * @example
 * ```typescript
 * const anonymous = createAnonymousIdentity({
 *   roles: ['guest'],
 * });
 * ```
 *
 * @pure This function has no side effects
 */
export function createAnonymousIdentity<R extends string = string>(
  config: AnonymousIdentityConfig<R> = {}
): IdentityContext<R, never> {
  return {
    userId: undefined,
    email: undefined,
    emailVerified: false,
    displayName: undefined,
    roles: config.roles ?? ([] as readonly R[]),
    permissions: [],
    status: 'anonymous',
    authMethod: 'anonymous',
    claims: Object.freeze({}),
    metadata: Object.freeze(config.metadata ?? {}),
    expiresAt: undefined,
    isAuthenticated: false,
    isAnonymous: true,
  };
}

/**
 * Check if an identity is expired.
 *
 * @param identity - Identity context to check
 * @param currentTime - Current timestamp
 * @returns true if expired
 *
 * @pure This function has no side effects
 */
export function isIdentityExpired(
  identity: IdentityContext,
  currentTime: number
): boolean {
  if (identity.expiresAt === undefined) {
    return false;
  }
  return currentTime > identity.expiresAt;
}

/**
 * Get remaining validity time for an identity.
 *
 * @param identity - Identity context
 * @param currentTime - Current timestamp
 * @returns Remaining time in seconds, or undefined if no expiration
 *
 * @pure This function has no side effects
 */
export function getIdentityRemainingTime(
  identity: IdentityContext,
  currentTime: number
): number | undefined {
  if (identity.expiresAt === undefined) {
    return undefined;
  }

  const remaining = identity.expiresAt - currentTime;
  return remaining > 0 ? remaining : 0;
}

/**
 * Merge two identity contexts, with the second taking precedence.
 * Useful for enriching identity with additional claims.
 *
 * @param base - Base identity context
 * @param override - Identity context to merge in
 * @returns Merged identity context
 *
 * @pure This function has no side effects
 */
export function mergeIdentityContexts<R extends string, P extends string>(
  base: IdentityContext<R, P>,
  override: Partial<IdentityContext<R, P>>
): IdentityContext<R, P> {
  return {
    ...base,
    ...override,
    // Merge arrays instead of replacing
    roles:
      override.roles !== undefined
        ? [...new Set([...base.roles, ...override.roles])]
        : base.roles,
    permissions:
      override.permissions !== undefined
        ? ([...new Set([...base.permissions, ...override.permissions])] as readonly P[])
        : base.permissions,
    // Merge metadata
    metadata: Object.freeze({
      ...base.metadata,
      ...override.metadata,
    }),
    // Merge claims
    claims: Object.freeze({
      ...base.claims,
      ...override.claims,
    }),
    // Recalculate derived properties
    isAuthenticated:
      (override.status ?? base.status) === 'authenticated',
    isAnonymous: (override.status ?? base.status) === 'anonymous',
  };
}
