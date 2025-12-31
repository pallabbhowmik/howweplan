/**
 * JWT Module
 *
 * Pure utilities for JWT decoding, verification, and claim extraction.
 * All functions are deterministic and side-effect free.
 */

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
} from './types.js';

export {
  decodeJwt,
  extractClaims,
  isTokenExpired,
  isTokenNotYetValid,
} from './decode.js';

export { validateJwtClaims, verifyJwt } from './verify.js';
