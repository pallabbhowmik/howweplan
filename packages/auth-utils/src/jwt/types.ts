/**
 * JWT Types
 *
 * All types for JWT operations. Configuration must be passed explicitly.
 * This module is pure and deterministic with no side effects.
 */

/**
 * Standard JWT Header
 */
export interface JwtHeader {
  readonly alg: string;
  readonly typ?: string;
  readonly kid?: string;
}

/**
 * Standard JWT Claims (RFC 7519)
 */
export interface JwtStandardClaims {
  /** Issuer */
  readonly iss?: string;
  /** Subject */
  readonly sub?: string;
  /** Audience */
  readonly aud?: string | readonly string[];
  /** Expiration Time (Unix timestamp) */
  readonly exp?: number;
  /** Not Before (Unix timestamp) */
  readonly nbf?: number;
  /** Issued At (Unix timestamp) */
  readonly iat?: number;
  /** JWT ID */
  readonly jti?: string;
}

/**
 * Custom claims that can be added to a JWT
 */
export interface JwtCustomClaims {
  readonly [key: string]: unknown;
}

/**
 * Complete JWT payload combining standard and custom claims
 */
export type JwtPayload = JwtStandardClaims & JwtCustomClaims;

/**
 * Decoded JWT structure (without verification)
 */
export interface DecodedJwt {
  readonly header: JwtHeader;
  readonly payload: JwtPayload;
  readonly signature: string;
  readonly raw: {
    readonly header: string;
    readonly payload: string;
    readonly signature: string;
  };
}

/**
 * Supported signature algorithms
 */
export type JwtAlgorithm =
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'PS256'
  | 'PS384'
  | 'PS512';

/**
 * Configuration for JWT verification
 * All values must be passed explicitly - no environment variable reading
 */
export interface JwtVerificationConfig {
  /**
   * The secret key for HMAC algorithms or public key for RSA/ECDSA
   * MUST be passed explicitly - never read from environment
   */
  readonly secret: string;

  /**
   * Expected algorithm(s). If provided, verification fails if token uses different algorithm
   */
  readonly algorithms?: readonly JwtAlgorithm[];

  /**
   * Expected issuer. If provided, verification fails if token has different issuer
   */
  readonly issuer?: string | readonly string[];

  /**
   * Expected audience. If provided, verification fails if token has different audience
   */
  readonly audience?: string | readonly string[];

  /**
   * Clock tolerance in seconds for exp/nbf validation
   * @default 0
   */
  readonly clockTolerance?: number;

  /**
   * Current timestamp to use for time-based validation (Unix timestamp)
   * Must be passed explicitly for deterministic behavior
   */
  readonly currentTime: number;

  /**
   * Whether to ignore expiration. Use with caution.
   * @default false
   */
  readonly ignoreExpiration?: boolean;

  /**
   * Whether to ignore not-before claim. Use with caution.
   * @default false
   */
  readonly ignoreNotBefore?: boolean;

  /**
   * Expected subject. If provided, verification fails if token has different subject
   */
  readonly subject?: string;

  /**
   * Maximum allowed age of token in seconds
   */
  readonly maxAge?: number;
}

/**
 * Result of JWT verification
 */
export interface JwtVerificationResult {
  readonly valid: boolean;
  readonly payload?: JwtPayload;
  readonly header?: JwtHeader;
  readonly error?: JwtVerificationError;
}

/**
 * JWT verification error types
 */
export type JwtVerificationErrorCode =
  | 'INVALID_TOKEN_FORMAT'
  | 'INVALID_HEADER'
  | 'INVALID_PAYLOAD'
  | 'INVALID_SIGNATURE'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_NOT_YET_VALID'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'INVALID_SUBJECT'
  | 'ALGORITHM_MISMATCH'
  | 'TOKEN_TOO_OLD'
  | 'MISSING_REQUIRED_CLAIM';

/**
 * Structured JWT verification error
 */
export interface JwtVerificationError {
  readonly code: JwtVerificationErrorCode;
  readonly message: string;
  readonly claim?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}

/**
 * Claims extracted from a JWT for easy access
 */
export interface ExtractedClaims {
  /** User/subject identifier */
  readonly subject: string | undefined;
  /** Token issuer */
  readonly issuer: string | undefined;
  /** Token audience(s) */
  readonly audience: readonly string[];
  /** Expiration timestamp */
  readonly expiresAt: number | undefined;
  /** Issued at timestamp */
  readonly issuedAt: number | undefined;
  /** Not valid before timestamp */
  readonly notBefore: number | undefined;
  /** JWT ID */
  readonly tokenId: string | undefined;
  /** All custom claims (non-standard) */
  readonly customClaims: Readonly<Record<string, unknown>>;
  /** Raw payload for advanced use cases */
  readonly rawPayload: JwtPayload;
}
