/**
 * Agent Entity
 * Represents a travel agent on the platform
 */

export interface Agent {
  readonly id: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly phoneNumber: string;
  readonly phoneVerified: boolean;
  readonly firstName: string;
  readonly lastName: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly specializations: readonly string[];
  readonly languages: readonly string[];
  readonly destinations: readonly string[];
  readonly yearsOfExperience: number;
  readonly agencyName: string | null;
  readonly agencyLicenseNumber: string | null;
  readonly commissionRate: number; // 8-12% as per constitution
  readonly rating: number | null;
  readonly totalReviews: number;
  readonly completedBookings: number;
  readonly responseTimeMinutes: number | null;
  readonly isVerified: boolean;
  readonly isActive: boolean;
  readonly isBanned: boolean;
  readonly banReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastActiveAt: Date | null;
}

/**
 * Pre-confirmation agent info (semi-blind as per constitution rule 9)
 * Only first name and photo visible before agent confirms
 */
export interface ObfuscatedAgent {
  readonly id: string;
  readonly firstName: string;
  readonly avatarUrl: string | null;
  readonly rating: number | null;
  readonly totalReviews: number;
  readonly responseTimeMinutes: number | null;
  readonly specializations: readonly string[];
}

/**
 * Full agent identity revealed after confirmation (constitution rule 10)
 * Full contact details released only after payment (constitution rule 11)
 */
export interface RevealedAgent {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly specializations: readonly string[];
  readonly languages: readonly string[];
  readonly yearsOfExperience: number;
  readonly agencyName: string | null;
  readonly rating: number | null;
  readonly totalReviews: number;
  readonly completedBookings: number;
}

/**
 * Full agent contact details (post-payment only - constitution rule 11)
 */
export interface AgentContactDetails {
  readonly email: string;
  readonly phoneNumber: string;
}
