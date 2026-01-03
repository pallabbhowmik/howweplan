/**
 * JWT token service for authentication.
 * Handles token creation, verification, and refresh.
 * Supports both RS256 (asymmetric) and HS256 (symmetric) algorithms.
 */

import jwt, { JwtPayload, SignOptions, VerifyOptions, Algorithm } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { env } from '../env.js';
import { getDbClient } from './database.js';
import {
  IdentityContext,
  UserRole,
  AccountStatus,
  AgentVerificationStatus,
} from '../types/identity.types.js';
import { InvalidTokenError, TokenExpiredError } from './errors.js';

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the signing key based on algorithm configuration.
 * RS256: Uses private key for signing
 * HS256: Uses shared secret
 */
function getSigningKey(): string {
  if (env.JWT_ALGORITHM === 'RS256') {
    return env.JWT_PRIVATE_KEY;
  }
  return env.JWT_SECRET || '';
}

/**
 * Get the verification key based on algorithm configuration.
 * RS256: Uses public key for verification
 * HS256: Uses shared secret
 */
function getVerificationKey(): string {
  if (env.JWT_ALGORITHM === 'RS256') {
    return env.JWT_PUBLIC_KEY;
  }
  return env.JWT_SECRET || '';
}

/**
 * Get the algorithm to use for JWT operations.
 */
function getAlgorithm(): Algorithm {
  return env.JWT_ALGORITHM as Algorithm;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses duration string (e.g., "15m", "7d") to seconds.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const value = parseInt(match[1] ?? '0', 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

const ACCESS_TOKEN_EXPIRY_SECONDS = parseDuration(env.JWT_ACCESS_TOKEN_EXPIRY);
const REFRESH_TOKEN_EXPIRY_SECONDS = parseDuration(env.JWT_REFRESH_TOKEN_EXPIRY);

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN PAYLOAD TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AccessTokenPayload {
  sub: string;
  email: string; // User email for gateway forwarding
  role: UserRole;
  status: AccountStatus;
  agentVerificationStatus: AgentVerificationStatus | null;
  ver: number; // Token version for revocation
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  jti: string; // Unique token ID for revocation
  ver: number; // Token version for revocation
  type: 'refresh';
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CREATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an access token for a user.
 * Includes token version for instant revocation capability.
 */
export function createAccessToken(
  userId: string,
  email: string,
  role: UserRole,
  status: AccountStatus,
  agentVerificationStatus: AgentVerificationStatus | null,
  tokenVersion: number = 1
): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    email,
    role,
    status,
    agentVerificationStatus,
    ver: tokenVersion,
    type: 'access',
  };

  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: getAlgorithm(),
  };

  return jwt.sign(payload, getSigningKey(), options);
}

/**
 * Creates a refresh token for a user and stores it in the database.
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const db = getDbClient();

  // Generate a random token
  const tokenValue = randomBytes(32).toString('base64url');
  const tokenId = randomBytes(16).toString('hex');
  const tokenHash = createHash('sha256').update(tokenValue).digest('hex');

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  // Store the hashed token
  const { error } = await db.from('refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
  });

  if (error) {
    throw new Error(`Failed to store refresh token: ${error.message}`);
  }

  // Create a JWT that contains the token ID for lookup
  const payload: RefreshTokenPayload = {
    sub: userId,
    jti: tokenId,
    ver: 1,
    type: 'refresh',
  };

  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithm: getAlgorithm(),
  };

  // Combine the JWT with the random token for verification
  const jwtToken = jwt.sign(payload, getSigningKey(), options);
  return `${jwtToken}.${tokenValue}`;
}

/**
 * Creates both access and refresh tokens for a user.
 */
export async function createTokenPair(
  userId: string,
  email: string,
  role: UserRole,
  status: AccountStatus,
  agentVerificationStatus: AgentVerificationStatus | null
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const accessToken = createAccessToken(userId, email, role, status, agentVerificationStatus);
  const refreshToken = await createRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies an access token and returns the identity context.
 */
export function verifyAccessToken(token: string): IdentityContext {
  const options: VerifyOptions = {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: [getAlgorithm()],
  };

  try {
    const decoded = jwt.verify(token, getVerificationKey(), options) as JwtPayload & AccessTokenPayload;

    if (decoded.type !== 'access') {
      throw new InvalidTokenError({ reason: 'Not an access token' });
    }

    return {
      sub: decoded.sub,
      role: decoded.role,
      status: decoded.status,
      agentVerificationStatus: decoded.agentVerificationStatus,
      iat: decoded.iat ?? 0,
      exp: decoded.exp ?? 0,
      iss: decoded.iss ?? '',
      aud: decoded.aud as string,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new InvalidTokenError({ reason: error.message });
    }
    throw error;
  }
}

/**
 * Verifies a refresh token and returns the user ID.
 * Also checks that the token hasn't been revoked.
 */
export async function verifyRefreshToken(
  token: string
): Promise<{ userId: string; tokenHash: string }> {
  const parts = token.split('.');
  if (parts.length !== 4) {
    // JWT has 3 parts, plus our token value
    throw new InvalidTokenError({ reason: 'Invalid refresh token format' });
  }

  const jwtToken = parts.slice(0, 3).join('.');
  const tokenValue = parts[3];

  if (!tokenValue) {
    throw new InvalidTokenError({ reason: 'Missing token value' });
  }

  const options: VerifyOptions = {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    algorithms: [getAlgorithm()],
  };

  try {
    const decoded = jwt.verify(jwtToken, getVerificationKey(), options) as JwtPayload & RefreshTokenPayload;

    if (decoded.type !== 'refresh') {
      throw new InvalidTokenError({ reason: 'Not a refresh token' });
    }

    // Hash the token value for lookup
    const tokenHash = createHash('sha256').update(tokenValue).digest('hex');

    // Check if the token exists and is valid
    const db = getDbClient();
    const { data, error } = await db
      .from('refresh_tokens')
      .select('*')
      .eq('user_id', decoded.sub)
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      throw new InvalidTokenError({ reason: 'Refresh token not found or revoked' });
    }

    return { userId: decoded.sub, tokenHash };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new InvalidTokenError({ reason: error.message });
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN REVOCATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Revokes a specific refresh token.
 */
export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  const db = getDbClient();

  const { error } = await db
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);

  if (error) {
    throw new Error(`Failed to revoke refresh token: ${error.message}`);
  }
}

/**
 * Revokes all refresh tokens for a user.
 * Use when a user logs out from all devices or when security is compromised.
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const db = getDbClient();

  const { error } = await db
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) {
    throw new Error(`Failed to revoke refresh tokens: ${error.message}`);
  }
}

/**
 * Cleans up expired refresh tokens from the database.
 * Should be called periodically by a background job.
 */
export async function cleanupExpiredRefreshTokens(): Promise<number> {
  const db = getDbClient();

  const { data, error } = await db
    .from('refresh_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
  }

  return data?.length ?? 0;
}
