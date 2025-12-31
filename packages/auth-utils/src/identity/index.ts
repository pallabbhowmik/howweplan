/**
 * Identity Module
 *
 * Identity context building utilities.
 * All functions are pure and deterministic.
 */

export type {
  AnonymousIdentityConfig,
  AuthMethod,
  IdentityClaims,
  IdentityContext,
  IdentityContextConfig,
  IdentityContextResult,
  IdentityStatus,
} from './types.js';

export {
  buildIdentityContext,
  createAnonymousIdentity,
  getIdentityRemainingTime,
  isIdentityExpired,
  mergeIdentityContexts,
  tryBuildIdentityContext,
} from './builder.js';
