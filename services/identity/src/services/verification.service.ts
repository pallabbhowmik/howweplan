/**
 * Verification Token Service
 * Handles email/phone verification with secure, single-use tokens.
 */

import { createHash, randomBytes } from 'crypto';
import { getDbClient } from './database.js';
import { env } from '../env.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export enum VerificationType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_CHANGE = 'EMAIL_CHANGE',
}

const TOKEN_CONFIG: Record<VerificationType, { expiryMinutes: number; maxAttempts: number }> = {
  [VerificationType.EMAIL]: { expiryMinutes: 30, maxAttempts: 5 },
  [VerificationType.PHONE]: { expiryMinutes: 10, maxAttempts: 5 },
  [VerificationType.PASSWORD_RESET]: { expiryMinutes: 15, maxAttempts: 3 },
  [VerificationType.EMAIL_CHANGE]: { expiryMinutes: 30, maxAttempts: 3 },
};

// Rate limiting for resend
const RESEND_COOLDOWN_MS = 60000; // 1 minute between resends

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically secure token.
 */
function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generates a short numeric code for SMS/phone verification.
 */
function generateNumericCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  const randomBuffer = randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += digits[randomBuffer[i]! % 10];
  }
  return code;
}

/**
 * Hashes a token for storage (we never store raw tokens).
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CREATION
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateTokenResult {
  token: string;
  code?: string;
  expiresAt: Date;
}

/**
 * Creates a verification token for a user.
 * For phone verification, also generates a numeric code.
 */
export async function createVerificationToken(
  userId: string,
  type: VerificationType,
  target: string // email or phone number
): Promise<CreateTokenResult> {
  const db = getDbClient();
  const config = TOKEN_CONFIG[type];
  
  // Check rate limit for resend
  const { data: existingToken } = await db
    .from('verification_tokens')
    .select('created_at')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (existingToken) {
    const lastCreated = new Date(existingToken.created_at).getTime();
    const now = Date.now();
    
    if (now - lastCreated < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - lastCreated)) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new code`);
    }
  }
  
  // Revoke any existing unused tokens of this type
  await db
    .from('verification_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('type', type)
    .is('used_at', null)
    .is('revoked_at', null);
  
  // Generate new token
  const token = generateToken();
  const code = type === VerificationType.PHONE ? generateNumericCode() : undefined;
  const expiresAt = new Date(Date.now() + config.expiryMinutes * 60 * 1000);
  
  // Store hashed token
  const { error } = await db.from('verification_tokens').insert({
    user_id: userId,
    type,
    target: target.toLowerCase(),
    token_hash: hashToken(token),
    code_hash: code ? hashToken(code) : null,
    expires_at: expiresAt.toISOString(),
    attempts: 0,
    max_attempts: config.maxAttempts,
    created_at: new Date().toISOString(),
  });
  
  if (error) {
    throw new Error(`Failed to create verification token: ${error.message}`);
  }
  
  return {
    token,
    code,
    expiresAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface VerifyTokenResult {
  valid: boolean;
  userId?: string;
  target?: string;
  error?: string;
}

/**
 * Verifies a token or code.
 * Marks the token as used if valid.
 */
export async function verifyToken(
  tokenOrCode: string,
  type: VerificationType
): Promise<VerifyTokenResult> {
  const db = getDbClient();
  
  const tokenHash = hashToken(tokenOrCode);
  const now = new Date().toISOString();
  
  // Try to find by token hash first, then by code hash
  let query = db
    .from('verification_tokens')
    .select('*')
    .eq('type', type)
    .is('used_at', null)
    .is('revoked_at', null)
    .gt('expires_at', now);
  
  // Check if it's a numeric code (phone verification)
  if (/^\d{6}$/.test(tokenOrCode)) {
    query = query.eq('code_hash', tokenHash);
  } else {
    query = query.eq('token_hash', tokenHash);
  }
  
  const { data: tokenData, error } = await query.single();
  
  if (error || !tokenData) {
    return { valid: false, error: 'Invalid or expired verification code' };
  }
  
  // Check max attempts
  if (tokenData.attempts >= tokenData.max_attempts) {
    // Revoke the token
    await db
      .from('verification_tokens')
      .update({ revoked_at: now })
      .eq('id', tokenData.id);
    
    return { valid: false, error: 'Maximum verification attempts exceeded' };
  }
  
  // Increment attempt count
  await db
    .from('verification_tokens')
    .update({ attempts: tokenData.attempts + 1 })
    .eq('id', tokenData.id);
  
  // Mark as used (single-use token)
  await db
    .from('verification_tokens')
    .update({ used_at: now })
    .eq('id', tokenData.id);
  
  return {
    valid: true,
    userId: tokenData.user_id,
    target: tokenData.target,
  };
}

/**
 * Verifies a token for a specific user (used when user is already authenticated).
 */
export async function verifyTokenForUser(
  userId: string,
  tokenOrCode: string,
  type: VerificationType
): Promise<VerifyTokenResult> {
  const result = await verifyToken(tokenOrCode, type);
  
  if (!result.valid) {
    return result;
  }
  
  if (result.userId !== userId) {
    return { valid: false, error: 'Token does not belong to this user' };
  }
  
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CLEANUP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Revokes all pending verification tokens for a user.
 */
export async function revokeUserTokens(
  userId: string,
  type?: VerificationType
): Promise<void> {
  const db = getDbClient();
  
  let query = db
    .from('verification_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null)
    .is('revoked_at', null);
  
  if (type) {
    query = query.eq('type', type);
  }
  
  await query;
}

/**
 * Cleans up expired verification tokens.
 * Should be run periodically as a background job.
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const db = getDbClient();
  
  const { data, error } = await db
    .from('verification_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');
  
  if (error) {
    throw new Error(`Failed to cleanup expired tokens: ${error.message}`);
  }
  
  return data?.length ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET SPECIFIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a password reset token.
 * Returns the token that should be sent to the user's email.
 */
export async function createPasswordResetToken(
  userId: string,
  email: string
): Promise<CreateTokenResult> {
  return createVerificationToken(userId, VerificationType.PASSWORD_RESET, email);
}

/**
 * Verifies a password reset token.
 */
export async function verifyPasswordResetToken(
  token: string
): Promise<VerifyTokenResult> {
  return verifyToken(token, VerificationType.PASSWORD_RESET);
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION SPECIFIC FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an email verification token.
 */
export async function createEmailVerificationToken(
  userId: string,
  email: string
): Promise<CreateTokenResult> {
  return createVerificationToken(userId, VerificationType.EMAIL, email);
}

/**
 * Verifies an email verification token.
 */
export async function verifyEmailVerificationToken(
  token: string
): Promise<VerifyTokenResult> {
  return verifyToken(token, VerificationType.EMAIL);
}
