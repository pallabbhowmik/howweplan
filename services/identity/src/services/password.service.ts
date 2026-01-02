/**
 * Password hashing service using Argon2id (recommended for 2024+).
 * Provides secure password hashing with timing-safe comparison.
 */

import * as argon2 from 'argon2';
import { scrypt, timingSafeEqual, ScryptOptions } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// ARGON2ID CONFIGURATION (PRIMARY - RECOMMENDED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Argon2id configuration following OWASP recommendations.
 * These parameters provide strong security while remaining practical.
 */
const ARGON2_CONFIG: argon2.Options = {
  type: argon2.argon2id,        // Argon2id variant (best for password hashing)
  memoryCost: 65536,            // 64 MB memory
  timeCost: 3,                  // 3 iterations
  parallelism: 4,               // 4 parallel threads
  hashLength: 32,               // 32 byte output
};

// ─────────────────────────────────────────────────────────────────────────────
// SCRYPT CONFIGURATION (FALLBACK FOR LEGACY HASHES)
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Scrypt configuration reference (kept for documentation):
 * - keyLength: 64 bytes
 * - saltLength: 32 bytes  
 * - cost (N): 16384 (power of 2)
 * - blockSize (r): 8
 * - parallelization (p): 1
 */

/**
 * Promisified scrypt function with proper typing.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMON PASSWORD CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top 1000 most common passwords (abbreviated list - in production, use a file).
 */
const COMMON_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234',
  '111111', '1234567', 'dragon', '123123', 'baseball', 'iloveyou', 'trustno1',
  'sunshine', 'princess', 'football', 'welcome', 'shadow', 'superman', 'michael',
  'master', 'jennifer', 'letmein', 'login', 'admin', 'passw0rd', 'hello',
  'monkey', 'abc123', 'starwars', 'whatever', 'qwerty123', 'password123',
  'password1', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '0987654321',
]);

/**
 * Checks if a password is in the common passwords list.
 */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Validates password strength (not just length).
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (isCommonPassword(password)) {
    errors.push('This password is too common and easily guessable');
  }

  // Check for at least one letter and one number (not overly strict)
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD HASHING (ARGON2ID)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hashes a password using Argon2id.
 * Returns a PHC-formatted string that includes algorithm, parameters, and hash.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      hashLength: 32,
    });
  } catch (error) {
    throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verifies a password against a hash.
 * Supports both Argon2 and legacy scrypt hashes.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Check if this is a legacy scrypt hash
    if (hash.startsWith('$scrypt$')) {
      return await verifyScryptPassword(password, hash);
    }

    // Argon2 verification (handles $argon2id$ prefix)
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Verifies a password against a legacy scrypt hash.
 */
async function verifyScryptPassword(password: string, hash: string): Promise<boolean> {
  try {
    const parts = hash.split('$');
    if (parts.length !== 5 || parts[1] !== 'scrypt') {
      return false;
    }

    const paramsStr = parts[2];
    const saltStr = parts[3];
    const hashStr = parts[4];

    if (!paramsStr || !saltStr || !hashStr) {
      return false;
    }

    const params = JSON.parse(Buffer.from(paramsStr, 'base64url').toString()) as {
      N: number;
      r: number;
      p: number;
      kl: number;
    };

    const salt = Buffer.from(saltStr, 'base64url');
    const storedHash = Buffer.from(hashStr, 'base64url');

    const derivedKey = await scryptAsync(password, salt, params.kl, {
      N: params.N,
      r: params.r,
      p: params.p,
    });

    // Timing-safe comparison
    return timingSafeEqual(storedHash, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Checks if a password hash needs to be rehashed.
 * Returns true if using legacy algorithm or outdated parameters.
 */
export function needsRehash(hash: string): boolean {
  try {
    // Legacy scrypt hashes should be upgraded
    if (hash.startsWith('$scrypt$')) {
      return true;
    }

    // Check if Argon2 parameters need updating
    return argon2.needsRehash(hash, ARGON2_CONFIG);
  } catch {
    return true;
  }
}
