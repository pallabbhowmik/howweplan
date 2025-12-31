/**
 * Password hashing service using secure algorithms.
 * Uses built-in Node.js crypto for Argon2-like security.
 */

import { scrypt, randomBytes, timingSafeEqual, ScryptOptions } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Password hashing configuration.
 * Using scrypt with recommended parameters for 2024.
 */
const SCRYPT_CONFIG = {
  /** Length of the derived key in bytes */
  keyLength: 64,
  /** Salt length in bytes */
  saltLength: 32,
  /** CPU/memory cost parameter (N) - must be power of 2 */
  cost: 16384,
  /** Block size (r) */
  blockSize: 8,
  /** Parallelization (p) */
  parallelization: 1,
} as const;

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
// PASSWORD HASHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hashes a password using scrypt.
 * Returns a string in the format: $scrypt$params$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_CONFIG.saltLength);

  const derivedKey = await scryptAsync(password, salt, SCRYPT_CONFIG.keyLength, {
    N: SCRYPT_CONFIG.cost,
    r: SCRYPT_CONFIG.blockSize,
    p: SCRYPT_CONFIG.parallelization,
  });

  // Encode parameters for future-proofing (allows changing parameters)
  const params = Buffer.from(
    JSON.stringify({
      N: SCRYPT_CONFIG.cost,
      r: SCRYPT_CONFIG.blockSize,
      p: SCRYPT_CONFIG.parallelization,
      kl: SCRYPT_CONFIG.keyLength,
    })
  ).toString('base64url');

  return `$scrypt$${params}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

/**
 * Verifies a password against a hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
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
 * Returns true if the hash was created with outdated parameters.
 */
export function needsRehash(hash: string): boolean {
  try {
    const parts = hash.split('$');
    if (parts.length !== 5 || parts[1] !== 'scrypt') {
      return true;
    }

    const paramsStr = parts[2];
    if (!paramsStr) return true;

    const params = JSON.parse(Buffer.from(paramsStr, 'base64url').toString()) as {
      N: number;
      r: number;
      p: number;
      kl: number;
    };

    // Check if parameters match current configuration
    return (
      params.N < SCRYPT_CONFIG.cost ||
      params.r !== SCRYPT_CONFIG.blockSize ||
      params.p !== SCRYPT_CONFIG.parallelization ||
      params.kl !== SCRYPT_CONFIG.keyLength
    );
  } catch {
    return true;
  }
}
