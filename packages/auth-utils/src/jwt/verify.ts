/**
 * JWT Verification Utilities
 *
 * Pure functions for verifying JWT tokens.
 * All configuration must be passed explicitly - no environment variable reading.
 *
 * NOTE: This module provides verification logic structure but does NOT
 * implement cryptographic signature verification. For production use,
 * integrate with a proper crypto library (e.g., jose, jsonwebtoken)
 * and pass the verification result through these validators.
 */

import { decodeJwt } from './decode.js';
import type {
  DecodedJwt,
  JwtVerificationConfig,
  JwtVerificationError,
  JwtVerificationResult,
} from './types.js';

/**
 * Create a verification error object
 * Pure function - no side effects
 */
function createError(
  code: JwtVerificationError['code'],
  message: string,
  details?: Partial<Pick<JwtVerificationError, 'claim' | 'expected' | 'actual'>>
): JwtVerificationError {
  return {
    code,
    message,
    ...details,
  };
}

/**
 * Create a failed verification result
 * Pure function - no side effects
 */
function fail(error: JwtVerificationError): JwtVerificationResult {
  return {
    valid: false,
    error,
  };
}

/**
 * Validate token format and decode
 * Pure function - no side effects
 */
function validateAndDecode(token: string): DecodedJwt | JwtVerificationError {
  if (typeof token !== 'string' || token.trim() === '') {
    return createError(
      'INVALID_TOKEN_FORMAT',
      'Token must be a non-empty string'
    );
  }

  const decoded = decodeJwt(token);

  if (!decoded) {
    return createError(
      'INVALID_TOKEN_FORMAT',
      'Token is not a valid JWT format'
    );
  }

  return decoded;
}

/**
 * Validate algorithm matches expected algorithms
 * Pure function - no side effects
 */
function validateAlgorithm(
  decoded: DecodedJwt,
  config: JwtVerificationConfig
): JwtVerificationError | null {
  if (!config.algorithms || config.algorithms.length === 0) {
    return null;
  }

  const tokenAlg = decoded.header.alg;

  if (!config.algorithms.includes(tokenAlg as (typeof config.algorithms)[number])) {
    return createError(
      'ALGORITHM_MISMATCH',
      `Token algorithm '${tokenAlg}' does not match expected algorithms`,
      {
        claim: 'alg',
        expected: config.algorithms,
        actual: tokenAlg,
      }
    );
  }

  return null;
}

/**
 * Validate token expiration
 * Pure function - no side effects
 */
function validateExpiration(
  decoded: DecodedJwt,
  config: JwtVerificationConfig
): JwtVerificationError | null {
  if (config.ignoreExpiration) {
    return null;
  }

  const { exp } = decoded.payload;

  if (exp === undefined) {
    return null; // No expiration claim, consider valid
  }

  if (typeof exp !== 'number') {
    return createError(
      'INVALID_PAYLOAD',
      'Expiration claim (exp) must be a number',
      { claim: 'exp', actual: exp }
    );
  }

  const tolerance = config.clockTolerance ?? 0;
  const effectiveExp = exp + tolerance;

  if (config.currentTime > effectiveExp) {
    return createError(
      'TOKEN_EXPIRED',
      `Token expired at ${new Date(exp * 1000).toISOString()}`,
      {
        claim: 'exp',
        expected: `<= ${effectiveExp}`,
        actual: config.currentTime,
      }
    );
  }

  return null;
}

/**
 * Validate not-before claim
 * Pure function - no side effects
 */
function validateNotBefore(
  decoded: DecodedJwt,
  config: JwtVerificationConfig
): JwtVerificationError | null {
  if (config.ignoreNotBefore) {
    return null;
  }

  const { nbf } = decoded.payload;

  if (nbf === undefined) {
    return null; // No not-before claim, consider valid
  }

  if (typeof nbf !== 'number') {
    return createError(
      'INVALID_PAYLOAD',
      'Not-before claim (nbf) must be a number',
      { claim: 'nbf', actual: nbf }
    );
  }

  const tolerance = config.clockTolerance ?? 0;
  const effectiveNbf = nbf - tolerance;

  if (config.currentTime < effectiveNbf) {
    return createError(
      'TOKEN_NOT_YET_VALID',
      `Token not valid before ${new Date(nbf * 1000).toISOString()}`,
      {
        claim: 'nbf',
        expected: `>= ${effectiveNbf}`,
        actual: config.currentTime,
      }
    );
  }

  return null;
}

/**
 * Validate issuer claim
 * Pure function - no side effects
 */
function validateIssuer(
  decoded: DecodedJwt,
  config: JwtVerificationConfig
): JwtVerificationError | null {
  if (!config.issuer) {
    return null;
  }

  const { iss } = decoded.payload;

  if (iss === undefined) {
    return createError(
      'MISSING_REQUIRED_CLAIM',
      'Token is missing required issuer (iss) claim',
      { claim: 'iss', expected: config.issuer }
    );
  }

  const expectedIssuers = Array.isArray(config.issuer)
    ? config.issuer
    : [config.issuer];

  if (!expectedIssuers.includes(iss)) {
    return createError(
      'INVALID_ISSUER',
      `Token issuer '${iss}' does not match expected issuer(s)`,
      {
        claim: 'iss',
        expected: config.issuer,
        actual: iss,
      }
    );
  }

  return null;
}

/**
 * Validate audience claim
 * Pure function - no side effects
 */
function validateAudience(
  decoded: DecodedJwt,
  config: JwtVerificationConfig
): JwtVerificationError | null {
  if (!config.audience) {
    return null;
  }

  const { aud } = decoded.payload;

  if (aud === undefined) {
    return createError(
      'MISSING_REQUIRED_CLAIM',
      'Token is missing required audience (aud) claim',
      { claim: 'aud', expected: config.audience }
    );
  }

  const tokenAudiences = Array.isArray(aud) ? aud : [aud];
  const expectedAudiences = Array.isArray(config.audience)
    ? config.audience
    : [config.audience];

  const hasMatchingAudience = tokenAudiences.some((tokenAud) =>
    expectedAudiences.includes(tokenAud)
  );

  if (!hasMatchingAudience) {
    return createError(
      'INVALID_AUDIENCE',
      'Token audience does not match expected audience(s)',
      {
        claim: 'aud',
        expected: config.audience,
        actual: aud,
      }
    );
  }

  return null;
}

/**
 * Validate subject claim
 * Pure function - no side effects
 */
function validateSubject(
  decoded: DecodedJwt,
  config: JwtVerificationConfig
): JwtVerificationError | null {
  if (!config.subject) {
    return null;
  }

  const { sub } = decoded.payload;

  if (sub === undefined) {
    return createError(
      'MISSING_REQUIRED_CLAIM',
      'Token is missing required subject (sub) claim',
      { claim: 'sub', expected: config.subject }
    );
  }

  if (sub !== config.subject) {
    return createError(
      'INVALID_SUBJECT',
      `Token subject '${sub}' does not match expected subject`,
      {
        claim: 'sub',
        expected: config.subject,
        actual: sub,
      }
    );
  }

  return null;
}

/**
 * Validate token age (based on iat claim)
 * Pure function - no side effects
 */
function validateMaxAge(
  decoded: DecodedJwt,
  config: JwtVerificationConfig
): JwtVerificationError | null {
  if (config.maxAge === undefined) {
    return null;
  }

  const { iat } = decoded.payload;

  if (iat === undefined) {
    return createError(
      'MISSING_REQUIRED_CLAIM',
      'Token is missing required issued-at (iat) claim for maxAge validation',
      { claim: 'iat' }
    );
  }

  if (typeof iat !== 'number') {
    return createError(
      'INVALID_PAYLOAD',
      'Issued-at claim (iat) must be a number',
      { claim: 'iat', actual: iat }
    );
  }

  const tokenAge = config.currentTime - iat;
  const tolerance = config.clockTolerance ?? 0;

  if (tokenAge > config.maxAge + tolerance) {
    return createError(
      'TOKEN_TOO_OLD',
      `Token age (${tokenAge}s) exceeds maximum allowed age (${config.maxAge}s)`,
      {
        claim: 'iat',
        expected: `age <= ${config.maxAge + tolerance}`,
        actual: tokenAge,
      }
    );
  }

  return null;
}

/**
 * Verify a JWT token against the provided configuration.
 *
 * IMPORTANT: This function validates claims and structure but requires
 * external signature verification. The `secret` in config is provided
 * for integration with crypto libraries. This function assumes signature
 * verification is handled separately and validates all other aspects.
 *
 * For full cryptographic verification, use this in conjunction with
 * a crypto library like `jose` or `jsonwebtoken`.
 *
 * @param token - The JWT string to verify
 * @param config - Verification configuration (MUST be passed explicitly)
 * @returns Verification result with valid flag and payload or error
 *
 * @example
 * ```typescript
 * // Configuration must be passed explicitly - never read from env
 * const config: JwtVerificationConfig = {
 *   secret: secretFromSecureSource,
 *   algorithms: ['HS256'],
 *   issuer: 'https://auth.example.com',
 *   audience: 'my-app',
 *   currentTime: Math.floor(Date.now() / 1000),
 * };
 *
 * const result = verifyJwt(token, config);
 * if (result.valid) {
 *   console.log('User:', result.payload?.sub);
 * } else {
 *   console.error('Verification failed:', result.error?.message);
 * }
 * ```
 *
 * @pure This function has no side effects (does not read environment, make network calls, etc.)
 */
export function verifyJwt(
  token: string,
  config: JwtVerificationConfig
): JwtVerificationResult {
  // Validate and decode token
  const decodeResult = validateAndDecode(token);

  if ('code' in decodeResult) {
    return fail(decodeResult);
  }

  const decoded = decodeResult;

  // Run all validators in sequence
  const validators = [
    validateAlgorithm,
    validateExpiration,
    validateNotBefore,
    validateIssuer,
    validateAudience,
    validateSubject,
    validateMaxAge,
  ] as const;

  for (const validator of validators) {
    const error = validator(decoded, config);
    if (error) {
      return fail(error);
    }
  }

  // All validations passed
  // NOTE: Cryptographic signature verification should be done externally
  return {
    valid: true,
    payload: decoded.payload,
    header: decoded.header,
  };
}

/**
 * Validate JWT claims without signature verification.
 * Use this when signature has been verified externally.
 *
 * @param token - The JWT string to validate
 * @param config - Verification configuration (secret is ignored)
 * @returns Verification result
 *
 * @pure This function has no side effects
 */
export function validateJwtClaims(
  token: string,
  config: Omit<JwtVerificationConfig, 'secret'>
): JwtVerificationResult {
  return verifyJwt(token, { ...config, secret: '' });
}
