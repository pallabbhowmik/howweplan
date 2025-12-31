/**
 * @tripcomposer/auth-utils
 *
 * Pure authentication and authorization utilities.
 *
 * This package provides:
 * - JWT decoding, verification, and claim extraction
 * - Role-based access control (RBAC) primitives
 * - Identity context building from JWT claims
 *
 * IMPORTANT: This package is designed to be pure and side-effect free.
 * - No environment variable reading
 * - No database access
 * - No external service calls
 * - No I/O operations
 *
 * All configuration must be passed explicitly as function arguments.
 * Safe to use in both browser and server environments.
 *
 * @packageDocumentation
 */

// ============================================================================
// JWT Module
// ============================================================================

export type {
  DecodedJwt,
  ExtractedClaims,
  JwtAlgorithm,
  JwtCustomClaims,
  JwtHeader,
  JwtPayload,
  JwtStandardClaims,
  JwtVerificationConfig,
  JwtVerificationError,
  JwtVerificationErrorCode,
  JwtVerificationResult,
} from './jwt/index.js';

export {
  decodeJwt,
  extractClaims,
  isTokenExpired,
  isTokenNotYetValid,
  validateJwtClaims,
  verifyJwt,
} from './jwt/index.js';

// ============================================================================
// RBAC Module
// ============================================================================

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
} from './rbac/index.js';

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
} from './rbac/index.js';

// ============================================================================
// Identity Module
// ============================================================================

export type {
  AnonymousIdentityConfig,
  AuthMethod,
  IdentityClaims,
  IdentityContext,
  IdentityContextConfig,
  IdentityContextResult,
  IdentityStatus,
} from './identity/index.js';

export {
  buildIdentityContext,
  createAnonymousIdentity,
  getIdentityRemainingTime,
  isIdentityExpired,
  mergeIdentityContexts,
  tryBuildIdentityContext,
} from './identity/index.js';
