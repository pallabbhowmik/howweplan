/**
 * Multi-Factor Authentication (MFA) Service
 * Implements TOTP-based 2FA with backup recovery codes.
 */

import { createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { getDbClient } from './database.js';
import { env } from '../env.js';
import { auditMfaEvent, AuditEventType } from './audit.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const MFA_CONFIG = {
  /** TOTP token length */
  totpDigits: 6,
  /** TOTP time step in seconds */
  totpPeriod: 30,
  /** TOTP algorithm */
  totpAlgorithm: 'sha1' as const,
  /** Window for time drift (±1 periods) */
  totpWindow: 1,
  /** Number of recovery codes to generate */
  recoveryCodeCount: 10,
  /** Recovery code length */
  recoveryCodeLength: 8,
  /** Secret key length in bytes */
  secretLength: 20,
};

// ─────────────────────────────────────────────────────────────────────────────
// ENCRYPTION FOR SECRETS
// ─────────────────────────────────────────────────────────────────────────────

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a secret using AES-256-GCM.
 */
function encryptSecret(secret: string): string {
  const key = Buffer.from(env.JWT_SECRET).subarray(0, 32); // Use first 32 bytes of JWT secret
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a secret using AES-256-GCM.
 */
function decryptSecret(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const key = Buffer.from(env.JWT_SECRET).subarray(0, 32);
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');
  
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTP IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a random base32-encoded secret for TOTP.
 */
export function generateTotpSecret(): string {
  const buffer = randomBytes(MFA_CONFIG.secretLength);
  return base32Encode(buffer);
}

/**
 * Generates a TOTP code for the given secret and time.
 */
export function generateTotpCode(secret: string, timestamp?: number): string {
  const time = timestamp ?? Date.now();
  const counter = Math.floor(time / 1000 / MFA_CONFIG.totpPeriod);
  
  const secretBuffer = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  
  const hmac = createHmac(MFA_CONFIG.totpAlgorithm, secretBuffer);
  hmac.update(counterBuffer);
  const hash = hmac.digest();
  
  // Dynamic truncation
  const offset = hash[hash.length - 1]! & 0x0f;
  const binary = 
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);
  
  const otp = binary % Math.pow(10, MFA_CONFIG.totpDigits);
  return otp.toString().padStart(MFA_CONFIG.totpDigits, '0');
}

/**
 * Verifies a TOTP code with time drift tolerance.
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  const now = Date.now();
  
  // Check current and adjacent time windows
  for (let i = -MFA_CONFIG.totpWindow; i <= MFA_CONFIG.totpWindow; i++) {
    const timestamp = now + (i * MFA_CONFIG.totpPeriod * 1000);
    const expectedCode = generateTotpCode(secret, timestamp);
    
    if (timingSafeEqual(code, expectedCode)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Timing-safe string comparison.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE32 ENCODING/DECODING
// ─────────────────────────────────────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  
  return output;
}

function base32Decode(str: string): Buffer {
  const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const output: number[] = [];
  let bits = 0;
  let value = 0;
  
  for (const char of cleanStr) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    
    value = (value << 5) | idx;
    bits += 5;
    
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  
  return Buffer.from(output);
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY CODES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates recovery codes for MFA backup.
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < MFA_CONFIG.recoveryCodeCount; i++) {
    const code = randomBytes(MFA_CONFIG.recoveryCodeLength / 2)
      .toString('hex')
      .toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hashes a recovery code for storage.
 */
function hashRecoveryCode(code: string): string {
  const hmac = createHmac('sha256', env.JWT_SECRET);
  hmac.update(code.toUpperCase());
  return hmac.digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface MfaSetup {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
}

export interface MfaStatus {
  enabled: boolean;
  enrolledAt?: Date;
  lastUsedAt?: Date;
  recoveryCodesRemaining: number;
}

/**
 * Initiates MFA setup for a user.
 * Returns the secret and QR code URL but doesn't enable MFA until verified.
 */
export async function initiateMfaSetup(
  userId: string,
  email: string
): Promise<MfaSetup> {
  const secret = generateTotpSecret();
  const recoveryCodes = generateRecoveryCodes();
  
  // Generate QR code URL (otpauth format)
  const issuer = encodeURIComponent('HowWePlan');
  const account = encodeURIComponent(email);
  const qrCodeUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${MFA_CONFIG.totpDigits}&period=${MFA_CONFIG.totpPeriod}`;
  
  // Store encrypted secret and hashed recovery codes (pending state)
  const db = getDbClient();
  
  await db.from('mfa_secrets').upsert({
    user_id: userId,
    totp_secret_encrypted: encryptSecret(secret),
    recovery_codes: recoveryCodes.map(hashRecoveryCode),
    enabled: false,
    enrolled_at: null,
    last_used_at: null,
    updated_at: new Date().toISOString(),
  });
  
  return {
    secret,
    qrCodeUrl,
    recoveryCodes,
  };
}

/**
 * Completes MFA setup by verifying the first TOTP code.
 */
export async function completeMfaSetup(
  userId: string,
  code: string,
  context: { ipAddress?: string; userAgent?: string; correlationId?: string }
): Promise<boolean> {
  const db = getDbClient();
  
  // Get the pending secret
  const { data, error } = await db
    .from('mfa_secrets')
    .select('totp_secret_encrypted, enabled')
    .eq('user_id', userId)
    .single();
  
  if (error || !data || data.enabled) {
    return false;
  }
  
  const secret = decryptSecret(data.totp_secret_encrypted);
  
  if (!verifyTotpCode(secret, code)) {
    await auditMfaEvent(AuditEventType.MFA_CHALLENGE_FAILURE, userId, context, false);
    return false;
  }
  
  // Enable MFA
  await db
    .from('mfa_secrets')
    .update({
      enabled: true,
      enrolled_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  
  await auditMfaEvent(AuditEventType.MFA_ENABLED, userId, context, true);
  
  return true;
}

/**
 * Verifies a TOTP code for a user.
 */
export async function verifyMfaCode(
  userId: string,
  code: string,
  context: { ipAddress?: string; userAgent?: string; correlationId?: string }
): Promise<boolean> {
  const db = getDbClient();
  
  const { data, error } = await db
    .from('mfa_secrets')
    .select('totp_secret_encrypted, enabled, last_otp_at')
    .eq('user_id', userId)
    .single();
  
  if (error || !data || !data.enabled) {
    return false;
  }
  
  const secret = decryptSecret(data.totp_secret_encrypted);
  
  // Check for replay attack (same OTP used within time window)
  if (data.last_otp_at) {
    const lastUse = new Date(data.last_otp_at).getTime();
    const now = Date.now();
    if (now - lastUse < MFA_CONFIG.totpPeriod * 1000) {
      // Potential replay attack - log and reject
      await auditMfaEvent(AuditEventType.MFA_CHALLENGE_FAILURE, userId, {
        ...context,
        metadata: { reason: 'potential_replay' },
      } as any, false);
      return false;
    }
  }
  
  if (!verifyTotpCode(secret, code)) {
    await auditMfaEvent(AuditEventType.MFA_CHALLENGE_FAILURE, userId, context, false);
    return false;
  }
  
  // Update last used timestamp
  await db
    .from('mfa_secrets')
    .update({
      last_used_at: new Date().toISOString(),
      last_otp_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  
  await auditMfaEvent(AuditEventType.MFA_CHALLENGE_SUCCESS, userId, context, true);
  
  return true;
}

/**
 * Verifies a recovery code and marks it as used.
 */
export async function verifyRecoveryCode(
  userId: string,
  code: string,
  context: { ipAddress?: string; userAgent?: string; correlationId?: string }
): Promise<boolean> {
  const db = getDbClient();
  
  const { data, error } = await db
    .from('mfa_secrets')
    .select('recovery_codes')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  const hashedCode = hashRecoveryCode(code);
  const codes = data.recovery_codes as string[];
  const codeIndex = codes.indexOf(hashedCode);
  
  if (codeIndex === -1) {
    await auditMfaEvent(AuditEventType.MFA_CHALLENGE_FAILURE, userId, context, false);
    return false;
  }
  
  // Remove used code
  codes.splice(codeIndex, 1);
  
  await db
    .from('mfa_secrets')
    .update({
      recovery_codes: codes,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  
  await auditMfaEvent(AuditEventType.MFA_RECOVERY_USED, userId, context, true);
  
  return true;
}

/**
 * Disables MFA for a user.
 */
export async function disableMfa(
  userId: string,
  context: { ipAddress?: string; userAgent?: string; correlationId?: string }
): Promise<void> {
  const db = getDbClient();
  
  await db
    .from('mfa_secrets')
    .delete()
    .eq('user_id', userId);
  
  await auditMfaEvent(AuditEventType.MFA_DISABLED, userId, context, true);
}

/**
 * Gets MFA status for a user.
 */
export async function getMfaStatus(userId: string): Promise<MfaStatus> {
  const db = getDbClient();
  
  const { data, error } = await db
    .from('mfa_secrets')
    .select('enabled, enrolled_at, last_used_at, recovery_codes')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return {
      enabled: false,
      recoveryCodesRemaining: 0,
    };
  }
  
  return {
    enabled: data.enabled,
    enrolledAt: data.enrolled_at ? new Date(data.enrolled_at) : undefined,
    lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
    recoveryCodesRemaining: (data.recovery_codes as string[])?.length ?? 0,
  };
}

/**
 * Checks if user has MFA enabled.
 */
export async function isMfaEnabled(userId: string): Promise<boolean> {
  const status = await getMfaStatus(userId);
  return status.enabled;
}
