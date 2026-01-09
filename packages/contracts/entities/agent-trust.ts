/**
 * Agent Trust & Reputation Entity
 * 
 * Defines the trust and reputation data model for agents.
 * Used to make pre-payment decisions without revealing agent identity.
 * 
 * CONSTITUTION RULES ENFORCED:
 * - Rule 9: No agent identity exposed pre-payment
 * - Rule 10: Reputation earned ONLY via completed bookings
 * - Rule 18: All changes are auditable
 */

// =============================================================================
// TRUST LEVEL ENUM
// =============================================================================

/**
 * Trust levels are deterministic based on platform activity.
 * Higher levels unlock more visibility and capabilities.
 */
export enum TrustLevel {
  /** New agent with verification but no bookings */
  LEVEL_1 = 'LEVEL_1',
  /** Agent with some completed bookings and good standing */
  LEVEL_2 = 'LEVEL_2',
  /** Established agent with excellent track record */
  LEVEL_3 = 'LEVEL_3',
}

// =============================================================================
// BADGE ENUM
// =============================================================================

/**
 * Badges are rule-based, auto-assigned, and auto-revoked.
 * No manual badge granting except by admin with audit trail.
 */
export enum AgentBadge {
  /** Identity + bank verified */
  VERIFIED_AGENT = 'VERIFIED_AGENT',
  /** 3+ bookings completed, 0 violations */
  PLATFORM_TRUSTED = 'PLATFORM_TRUSTED',
  /** 5+ reviews with avg rating >= 4.5 */
  TOP_PLANNER = 'TOP_PLANNER',
  /** Response time P90 <= threshold */
  ON_TIME_EXPERT = 'ON_TIME_EXPERT',
  /** New agent with verification but 0 bookings */
  NEWLY_VERIFIED = 'NEWLY_VERIFIED',
}

// =============================================================================
// AGENT STATS INTERFACE
// =============================================================================

/**
 * Comprehensive agent statistics for trust calculation.
 * This is the single source of truth for agent reputation.
 */
export interface AgentStats {
  readonly agentId: string;
  
  // Activity metrics
  readonly totalProposalsSubmitted: number;
  readonly totalBookingsCompleted: number;
  readonly totalBookingsCancelled: number;
  
  // Rating metrics (only from completed bookings)
  readonly averageRating: number | null;
  readonly ratingCount: number;
  
  // Response time metrics (in minutes)
  readonly responseTimeP50: number | null;
  readonly responseTimeP90: number | null;
  
  // Trust & compliance
  readonly platformViolationCount: number;
  readonly trustLevel: TrustLevel;
  readonly badges: readonly AgentBadge[];
  
  // Verification status (from identity service)
  readonly identityVerified: boolean;
  readonly bankVerified: boolean;
  
  // Platform protection
  readonly platformProtectionScore: number;
  readonly platformProtectionEligible: boolean;
  
  // Timestamps
  readonly lastUpdatedAt: Date;
  readonly lastRecalculatedAt: Date;
}

// =============================================================================
// BADGE ASSIGNMENT RULES
// =============================================================================

/**
 * Configuration for badge assignment rules.
 * All rules are deterministic - no ML/AI.
 */
export interface BadgeRules {
  readonly VERIFIED_AGENT: {
    readonly identityVerified: true;
    readonly bankVerified: true;
  };
  readonly PLATFORM_TRUSTED: {
    readonly minBookingsCompleted: number;
    readonly maxViolationCount: number;
  };
  readonly TOP_PLANNER: {
    readonly minRatingCount: number;
    readonly minAverageRating: number;
  };
  readonly ON_TIME_EXPERT: {
    readonly maxResponseTimeP90Minutes: number;
  };
  readonly NEWLY_VERIFIED: {
    readonly identityVerified: true;
    readonly maxBookingsCompleted: number;
  };
}

/**
 * Default badge rules - can be overridden via admin config
 */
export const DEFAULT_BADGE_RULES: BadgeRules = {
  VERIFIED_AGENT: {
    identityVerified: true,
    bankVerified: true,
  },
  PLATFORM_TRUSTED: {
    minBookingsCompleted: 3,
    maxViolationCount: 0,
  },
  TOP_PLANNER: {
    minRatingCount: 5,
    minAverageRating: 4.5,
  },
  ON_TIME_EXPERT: {
    maxResponseTimeP90Minutes: 120, // 2 hours
  },
  NEWLY_VERIFIED: {
    identityVerified: true,
    maxBookingsCompleted: 0,
  },
};

// =============================================================================
// TRUST LEVEL RULES
// =============================================================================

/**
 * Configuration for trust level assignment rules.
 */
export interface TrustLevelRules {
  readonly LEVEL_1: {
    readonly identityVerified: true;
  };
  readonly LEVEL_2: {
    readonly identityVerified: true;
    readonly minBookingsCompleted: number;
    readonly maxViolationCount: number;
    readonly minAverageRating: number | null;
  };
  readonly LEVEL_3: {
    readonly identityVerified: true;
    readonly minBookingsCompleted: number;
    readonly maxViolationCount: number;
    readonly minAverageRating: number;
    readonly minRatingCount: number;
  };
}

/**
 * Default trust level rules
 */
export const DEFAULT_TRUST_LEVEL_RULES: TrustLevelRules = {
  LEVEL_1: {
    identityVerified: true,
  },
  LEVEL_2: {
    identityVerified: true,
    minBookingsCompleted: 2,
    maxViolationCount: 0,
    minAverageRating: 3.5,
  },
  LEVEL_3: {
    identityVerified: true,
    minBookingsCompleted: 10,
    maxViolationCount: 0,
    minAverageRating: 4.5,
    minRatingCount: 5,
  },
};

// =============================================================================
// PLATFORM PROTECTION SCORE
// =============================================================================

/**
 * Platform protection score configuration.
 * Score is 0-100, representing trustworthiness for platform protection guarantee.
 */
export interface PlatformProtectionConfig {
  /** Minimum score to be eligible for platform protection badge */
  readonly eligibilityThreshold: number;
  /** Penalty per cancellation */
  readonly cancellationPenalty: number;
  /** Penalty per violation */
  readonly violationPenalty: number;
  /** Penalty per lost dispute */
  readonly disputeLostPenalty: number;
}

export const DEFAULT_PLATFORM_PROTECTION_CONFIG: PlatformProtectionConfig = {
  eligibilityThreshold: 80,
  cancellationPenalty: 10,
  violationPenalty: 25,
  disputeLostPenalty: 15,
};

// =============================================================================
// BADGE HISTORY
// =============================================================================

/**
 * Tracks badge assignments and revocations for audit trail.
 */
export interface BadgeHistoryEntry {
  readonly id: string;
  readonly agentId: string;
  readonly badge: AgentBadge;
  readonly action: 'ASSIGNED' | 'REVOKED';
  readonly reason: string;
  readonly triggeredBy: 'SYSTEM' | 'ADMIN';
  readonly adminId: string | null;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
}

// =============================================================================
// VIOLATION RECORD
// =============================================================================

/**
 * Types of platform violations that affect trust.
 */
export enum ViolationType {
  /** Attempted to share contact info pre-payment */
  CONTACT_INFO_LEAK = 'CONTACT_INFO_LEAK',
  /** Shared external payment link */
  EXTERNAL_PAYMENT_LINK = 'EXTERNAL_PAYMENT_LINK',
  /** Shared UPI ID or bank details in message */
  PAYMENT_INFO_LEAK = 'PAYMENT_INFO_LEAK',
  /** Shared social media or website links */
  EXTERNAL_LINK_SHARE = 'EXTERNAL_LINK_SHARE',
  /** Fraudulent activity detected */
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  /** Multiple cancellations */
  EXCESSIVE_CANCELLATIONS = 'EXCESSIVE_CANCELLATIONS',
  /** Lost dispute */
  DISPUTE_LOST = 'DISPUTE_LOST',
  /** Other policy violation */
  POLICY_VIOLATION = 'POLICY_VIOLATION',
}

/**
 * Record of a platform violation.
 */
export interface ViolationRecord {
  readonly id: string;
  readonly agentId: string;
  readonly violationType: ViolationType;
  readonly description: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly bookingId: string | null;
  readonly messageId: string | null;
  readonly evidence: Record<string, unknown>;
  readonly autoDetected: boolean;
  readonly reportedBy: string | null;
  readonly resolvedAt: Date | null;
  readonly resolvedBy: string | null;
  readonly resolutionNotes: string | null;
  readonly createdAt: Date;
}

// =============================================================================
// AGENT PUBLIC PROFILE (PRE-PAYMENT SAFE)
// =============================================================================

/**
 * Agent profile safe to expose pre-payment.
 * NEVER includes: name, company, phone, email, photo, links
 */
export interface AgentPublicProfile {
  readonly agentId: string;
  
  // Reputation metrics
  readonly averageRating: number | null;
  readonly ratingCount: number;
  readonly completedBookings: number;
  
  // Activity indicators (range-based, not exact)
  readonly proposalActivityLevel: 'NEW' | 'ACTIVE' | 'VERY_ACTIVE' | 'TOP_PERFORMER';
  
  // Response time label
  readonly responseTimeLabel: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'SLOW' | null;
  
  // Trust indicators
  readonly trustLevel: TrustLevel;
  readonly badges: readonly AgentBadge[];
  
  // Platform protection
  readonly platformProtectionEligible: boolean;
  
  // Generic specializations (no identifying info)
  readonly specializations: readonly string[];
  
  // Verification status
  readonly isVerified: boolean;
}

/**
 * Helper to convert response time P90 to label
 */
export function getResponseTimeLabel(p90Minutes: number | null): AgentPublicProfile['responseTimeLabel'] {
  if (p90Minutes === null) return null;
  if (p90Minutes <= 30) return 'EXCELLENT';
  if (p90Minutes <= 60) return 'GOOD';
  if (p90Minutes <= 180) return 'AVERAGE';
  return 'SLOW';
}

/**
 * Helper to convert proposal count to activity level
 */
export function getProposalActivityLevel(
  totalProposals: number,
  completedBookings: number
): AgentPublicProfile['proposalActivityLevel'] {
  if (completedBookings >= 20 && totalProposals >= 50) return 'TOP_PERFORMER';
  if (totalProposals >= 20) return 'VERY_ACTIVE';
  if (totalProposals >= 5) return 'ACTIVE';
  return 'NEW';
}
