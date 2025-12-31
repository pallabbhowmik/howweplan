/**
 * Identity Types
 *
 * Type definitions for identity context.
 * All types are pure data structures.
 */

import type { RbacUserWithPermissions } from '../rbac/types.js';

/**
 * Authentication method used to establish identity
 */
export type AuthMethod =
  | 'jwt'
  | 'api_key'
  | 'session'
  | 'oauth'
  | 'anonymous'
  | 'service_account';

/**
 * Identity status
 */
export type IdentityStatus = 'authenticated' | 'anonymous' | 'expired' | 'invalid';

/**
 * JWT claims commonly used for identity
 */
export interface IdentityClaims {
  /** User/subject identifier */
  readonly sub?: string;
  /** Email address */
  readonly email?: string;
  /** Whether email is verified */
  readonly email_verified?: boolean;
  /** Display name */
  readonly name?: string;
  /** Given/first name */
  readonly given_name?: string;
  /** Family/last name */
  readonly family_name?: string;
  /** Profile picture URL */
  readonly picture?: string;
  /** Preferred username */
  readonly preferred_username?: string;
  /** Locale */
  readonly locale?: string;
  /** Timezone */
  readonly zoneinfo?: string;
  /** Roles claim (various formats) */
  readonly roles?: readonly string[];
  /** Groups claim */
  readonly groups?: readonly string[];
  /** Scope claim */
  readonly scope?: string;
  /** Custom claims */
  readonly [key: string]: unknown;
}

/**
 * Configuration for building identity context.
 * All values must be passed explicitly.
 */
export interface IdentityContextConfig<
  R extends string = string,
  P extends string = string,
> {
  /**
   * Claim key to extract roles from.
   * @default 'roles'
   */
  readonly rolesClaimKey?: string;

  /**
   * Claim key to extract permissions from.
   * @default 'permissions'
   */
  readonly permissionsClaimKey?: string;

  /**
   * Default roles to assign if none found in claims.
   */
  readonly defaultRoles?: readonly R[];

  /**
   * Role mapping to transform claim roles to system roles.
   * Key is claim role value, value is system role.
   */
  readonly roleMapping?: Readonly<Record<string, R>>;

  /**
   * Permission mapping to transform claim permissions to system permissions.
   */
  readonly permissionMapping?: Readonly<Record<string, P>>;

  /**
   * Claim key for user ID.
   * @default 'sub'
   */
  readonly userIdClaimKey?: string;

  /**
   * Claim key for email.
   * @default 'email'
   */
  readonly emailClaimKey?: string;

  /**
   * Claim key for display name.
   * @default 'name'
   */
  readonly nameClaimKey?: string;

  /**
   * Custom metadata extractor function.
   * Must be a pure function.
   */
  readonly extractMetadata?: (claims: IdentityClaims) => Readonly<Record<string, unknown>>;
}

/**
 * Complete identity context built from claims.
 */
export interface IdentityContext<
  R extends string = string,
  P extends string = string,
> extends RbacUserWithPermissions<R, P> {
  /** Unique user identifier */
  readonly userId: string | undefined;

  /** User email address */
  readonly email: string | undefined;

  /** Whether email is verified */
  readonly emailVerified: boolean;

  /** User display name */
  readonly displayName: string | undefined;

  /** User roles */
  readonly roles: readonly R[];

  /** Direct permissions (not derived from roles) */
  readonly permissions: readonly P[];

  /** Identity status */
  readonly status: IdentityStatus;

  /** How the user was authenticated */
  readonly authMethod: AuthMethod | undefined;

  /** Original claims the identity was built from */
  readonly claims: Readonly<IdentityClaims>;

  /** Custom metadata extracted from claims */
  readonly metadata: Readonly<Record<string, unknown>>;

  /** Token expiration timestamp (if applicable) */
  readonly expiresAt: number | undefined;

  /** Whether the identity is authenticated (status === 'authenticated') */
  readonly isAuthenticated: boolean;

  /** Whether the identity is anonymous */
  readonly isAnonymous: boolean;
}

/**
 * Result of identity context building
 */
export interface IdentityContextResult<
  R extends string = string,
  P extends string = string,
> {
  readonly success: boolean;
  readonly identity: IdentityContext<R, P> | undefined;
  readonly error?: string;
}

/**
 * Anonymous identity template
 */
export interface AnonymousIdentityConfig<R extends string = string> {
  /** Roles to assign to anonymous users */
  readonly roles?: readonly R[];
  /** Custom metadata */
  readonly metadata?: Readonly<Record<string, unknown>>;
}
