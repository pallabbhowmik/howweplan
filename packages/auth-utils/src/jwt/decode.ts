/**
 * JWT Decode Utilities
 *
 * Pure functions for decoding JWTs without verification.
 * These functions are deterministic and side-effect free.
 */

import type {
  DecodedJwt,
  ExtractedClaims,
  JwtHeader,
  JwtPayload,
  JwtStandardClaims,
} from './types.js';

/**
 * Standard JWT claim keys that should not be included in custom claims
 */
const STANDARD_CLAIM_KEYS: ReadonlySet<keyof JwtStandardClaims> = new Set([
  'iss',
  'sub',
  'aud',
  'exp',
  'nbf',
  'iat',
  'jti',
]);

/**
 * Base64URL decode a string to UTF-8
 * Pure function - no side effects
 */
function base64UrlDecode(input: string): string {
  // Replace URL-safe characters with standard base64 characters
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if necessary
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }

  // Decode base64 to binary string, then to UTF-8
  // Using atob which is available in both browser and Node.js (v16+)
  const binaryString = atob(base64);

  // Convert binary string to UTF-8
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

/**
 * Parse JSON safely, returning undefined on failure
 * Pure function - no side effects
 */
function safeJsonParse<T>(input: string): T | undefined {
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}

/**
 * Validate that a value looks like a JWT header
 * Pure function - no side effects
 */
function isValidHeader(value: unknown): value is JwtHeader {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['alg'] === 'string';
}

/**
 * Validate that a value looks like a JWT payload
 * Pure function - no side effects
 */
function isValidPayload(value: unknown): value is JwtPayload {
  return typeof value === 'object' && value !== null;
}

/**
 * Decode a JWT token without verification.
 *
 * WARNING: This function does NOT verify the signature.
 * Use verifyJwt() for secure verification.
 *
 * @param token - The JWT string to decode
 * @returns The decoded JWT or undefined if the token is malformed
 *
 * @example
 * ```typescript
 * const decoded = decodeJwt(token);
 * if (decoded) {
 *   console.log(decoded.payload.sub);
 * }
 * ```
 *
 * @pure This function has no side effects
 */
export function decodeJwt(token: string): DecodedJwt | undefined {
  if (typeof token !== 'string') {
    return undefined;
  }

  const parts = token.split('.');

  if (parts.length !== 3) {
    return undefined;
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  if (!headerB64 || !payloadB64 || !signatureB64) {
    return undefined;
  }

  // Decode header
  let headerJson: string;
  try {
    headerJson = base64UrlDecode(headerB64);
  } catch {
    return undefined;
  }

  const header = safeJsonParse<unknown>(headerJson);
  if (!isValidHeader(header)) {
    return undefined;
  }

  // Decode payload
  let payloadJson: string;
  try {
    payloadJson = base64UrlDecode(payloadB64);
  } catch {
    return undefined;
  }

  const payload = safeJsonParse<unknown>(payloadJson);
  if (!isValidPayload(payload)) {
    return undefined;
  }

  return {
    header,
    payload,
    signature: signatureB64,
    raw: {
      header: headerB64,
      payload: payloadB64,
      signature: signatureB64,
    },
  };
}

/**
 * Extract and normalize claims from a JWT token.
 *
 * This provides a convenient interface for accessing common claims
 * with normalized types (e.g., audience is always an array).
 *
 * WARNING: This function does NOT verify the signature.
 * Use verifyJwt() for secure verification before trusting claims.
 *
 * @param token - The JWT string to extract claims from
 * @returns Extracted claims or undefined if the token is malformed
 *
 * @example
 * ```typescript
 * const claims = extractClaims(token);
 * if (claims) {
 *   console.log(`User: ${claims.subject}`);
 *   console.log(`Expires: ${new Date(claims.expiresAt * 1000)}`);
 * }
 * ```
 *
 * @pure This function has no side effects
 */
export function extractClaims(token: string): ExtractedClaims | undefined {
  const decoded = decodeJwt(token);

  if (!decoded) {
    return undefined;
  }

  const { payload } = decoded;

  // Normalize audience to always be an array
  const normalizeAudience = (aud: unknown): readonly string[] => {
    if (typeof aud === 'string') {
      return [aud];
    }
    if (Array.isArray(aud)) {
      return aud.filter((a): a is string => typeof a === 'string');
    }
    return [];
  };

  // Extract custom claims (non-standard claims)
  const customClaims: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!STANDARD_CLAIM_KEYS.has(key as keyof JwtStandardClaims)) {
      customClaims[key] = value;
    }
  }

  return {
    subject: typeof payload.sub === 'string' ? payload.sub : undefined,
    issuer: typeof payload.iss === 'string' ? payload.iss : undefined,
    audience: normalizeAudience(payload.aud),
    expiresAt: typeof payload.exp === 'number' ? payload.exp : undefined,
    issuedAt: typeof payload.iat === 'number' ? payload.iat : undefined,
    notBefore: typeof payload.nbf === 'number' ? payload.nbf : undefined,
    tokenId: typeof payload.jti === 'string' ? payload.jti : undefined,
    customClaims: Object.freeze(customClaims),
    rawPayload: payload,
  };
}

/**
 * Check if a token is expired based on provided current time.
 *
 * @param token - The JWT string to check
 * @param currentTime - Current Unix timestamp (seconds)
 * @param clockTolerance - Tolerance in seconds (default: 0)
 * @returns true if expired, false if not expired, undefined if token is invalid or has no exp claim
 *
 * @pure This function has no side effects
 */
export function isTokenExpired(
  token: string,
  currentTime: number,
  clockTolerance: number = 0
): boolean | undefined {
  const claims = extractClaims(token);

  if (!claims || claims.expiresAt === undefined) {
    return undefined;
  }

  return currentTime > claims.expiresAt + clockTolerance;
}

/**
 * Check if a token is not yet valid based on provided current time.
 *
 * @param token - The JWT string to check
 * @param currentTime - Current Unix timestamp (seconds)
 * @param clockTolerance - Tolerance in seconds (default: 0)
 * @returns true if not yet valid, false if valid, undefined if token is invalid or has no nbf claim
 *
 * @pure This function has no side effects
 */
export function isTokenNotYetValid(
  token: string,
  currentTime: number,
  clockTolerance: number = 0
): boolean | undefined {
  const claims = extractClaims(token);

  if (!claims || claims.notBefore === undefined) {
    return undefined;
  }

  return currentTime < claims.notBefore - clockTolerance;
}
