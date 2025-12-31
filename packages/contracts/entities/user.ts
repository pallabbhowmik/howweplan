/**
 * User Entity
 * Represents a traveler/customer on the platform
 */

export interface User {
  readonly id: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly phoneNumber: string | null;
  readonly phoneVerified: boolean;
  readonly firstName: string;
  readonly lastName: string;
  readonly avatarUrl: string | null;
  readonly preferredCurrency: string;
  readonly preferredLanguage: string;
  readonly timezone: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastActiveAt: Date | null;
  readonly isActive: boolean;
  readonly isBanned: boolean;
  readonly banReason: string | null;
}

/**
 * Obfuscated user info visible to agents pre-confirmation
 */
export interface ObfuscatedUser {
  readonly firstName: string;
  readonly avatarUrl: string | null;
}
