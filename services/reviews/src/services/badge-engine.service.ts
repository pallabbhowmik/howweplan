/**
 * Badge Engine Service
 * 
 * Deterministic, rule-based badge assignment and revocation.
 * NO AI/ML dependencies - pure business logic.
 * 
 * RULES:
 * - Badges are auto-calculated based on agent stats
 * - Badges are auto-revoked on violation
 * - Badges are recalculated nightly or on relevant events
 */

import {
  AgentBadge,
  TrustLevel,
  type AgentStats,
  type BadgeRules,
  type TrustLevelRules,
  DEFAULT_BADGE_RULES,
  DEFAULT_TRUST_LEVEL_RULES,
} from '@tripcomposer/contracts';

// =============================================================================
// TYPES
// =============================================================================

export interface BadgeEvaluationResult {
  badge: AgentBadge;
  earned: boolean;
  reason: string;
  requirements: Record<string, { required: unknown; actual: unknown; met: boolean }>;
}

export interface TrustLevelEvaluationResult {
  level: TrustLevel;
  reason: string;
  requirements: Record<string, { required: unknown; actual: unknown; met: boolean }>;
}

export interface AgentBadgeChanges {
  agentId: string;
  previousBadges: AgentBadge[];
  newBadges: AgentBadge[];
  assigned: AgentBadge[];
  revoked: AgentBadge[];
}

// =============================================================================
// BADGE ENGINE
// =============================================================================

export const badgeEngine = {
  /**
   * Evaluate a single badge for an agent.
   * Returns whether the badge is earned and the reason.
   */
  evaluateBadge(
    badge: AgentBadge,
    stats: AgentStats,
    rules: BadgeRules = DEFAULT_BADGE_RULES
  ): BadgeEvaluationResult {
    switch (badge) {
      case AgentBadge.VERIFIED_AGENT:
        return this.evaluateVerifiedAgent(stats, rules);
      case AgentBadge.PLATFORM_TRUSTED:
        return this.evaluatePlatformTrusted(stats, rules);
      case AgentBadge.TOP_PLANNER:
        return this.evaluateTopPlanner(stats, rules);
      case AgentBadge.ON_TIME_EXPERT:
        return this.evaluateOnTimeExpert(stats, rules);
      case AgentBadge.NEWLY_VERIFIED:
        return this.evaluateNewlyVerified(stats, rules);
      default:
        return {
          badge,
          earned: false,
          reason: 'Unknown badge type',
          requirements: {},
        };
    }
  },

  /**
   * VERIFIED_AGENT: identityVerified + bankVerified
   */
  evaluateVerifiedAgent(stats: AgentStats, rules: BadgeRules): BadgeEvaluationResult {
    const identityMet = stats.identityVerified === rules.VERIFIED_AGENT.identityVerified;
    const bankMet = stats.bankVerified === rules.VERIFIED_AGENT.bankVerified;
    const earned = identityMet && bankMet;

    return {
      badge: AgentBadge.VERIFIED_AGENT,
      earned,
      reason: earned
        ? 'Identity and bank verification complete'
        : 'Requires identity and bank verification',
      requirements: {
        identityVerified: {
          required: true,
          actual: stats.identityVerified,
          met: identityMet,
        },
        bankVerified: {
          required: true,
          actual: stats.bankVerified,
          met: bankMet,
        },
      },
    };
  },

  /**
   * PLATFORM_TRUSTED: 3+ bookings, 0 violations
   */
  evaluatePlatformTrusted(stats: AgentStats, rules: BadgeRules): BadgeEvaluationResult {
    const bookingsMet = stats.totalBookingsCompleted >= rules.PLATFORM_TRUSTED.minBookingsCompleted;
    const violationsMet = stats.platformViolationCount <= rules.PLATFORM_TRUSTED.maxViolationCount;
    const earned = bookingsMet && violationsMet;

    return {
      badge: AgentBadge.PLATFORM_TRUSTED,
      earned,
      reason: earned
        ? 'Trusted platform member with clean record'
        : violationsMet
          ? `Need ${rules.PLATFORM_TRUSTED.minBookingsCompleted - stats.totalBookingsCompleted} more completed bookings`
          : 'Platform violations detected - badge not available',
      requirements: {
        minBookingsCompleted: {
          required: rules.PLATFORM_TRUSTED.minBookingsCompleted,
          actual: stats.totalBookingsCompleted,
          met: bookingsMet,
        },
        maxViolationCount: {
          required: rules.PLATFORM_TRUSTED.maxViolationCount,
          actual: stats.platformViolationCount,
          met: violationsMet,
        },
      },
    };
  },

  /**
   * TOP_PLANNER: 5+ reviews with avg >= 4.5
   */
  evaluateTopPlanner(stats: AgentStats, rules: BadgeRules): BadgeEvaluationResult {
    const ratingCountMet = stats.ratingCount >= rules.TOP_PLANNER.minRatingCount;
    const avgRatingMet = stats.averageRating !== null && stats.averageRating >= rules.TOP_PLANNER.minAverageRating;
    const earned = ratingCountMet && avgRatingMet;

    return {
      badge: AgentBadge.TOP_PLANNER,
      earned,
      reason: earned
        ? 'Exceptional planning quality recognized'
        : !ratingCountMet
          ? `Need ${rules.TOP_PLANNER.minRatingCount - stats.ratingCount} more reviews`
          : `Average rating ${stats.averageRating?.toFixed(2) || 'N/A'} is below ${rules.TOP_PLANNER.minAverageRating}`,
      requirements: {
        minRatingCount: {
          required: rules.TOP_PLANNER.minRatingCount,
          actual: stats.ratingCount,
          met: ratingCountMet,
        },
        minAverageRating: {
          required: rules.TOP_PLANNER.minAverageRating,
          actual: stats.averageRating,
          met: avgRatingMet,
        },
      },
    };
  },

  /**
   * ON_TIME_EXPERT: Response time P90 <= threshold
   */
  evaluateOnTimeExpert(stats: AgentStats, rules: BadgeRules): BadgeEvaluationResult {
    const hasResponseData = stats.responseTimeP90 !== null;
    const responseTimeMet = hasResponseData && stats.responseTimeP90! <= rules.ON_TIME_EXPERT.maxResponseTimeP90Minutes;
    const earned = responseTimeMet;

    return {
      badge: AgentBadge.ON_TIME_EXPERT,
      earned,
      reason: earned
        ? 'Consistently fast response times'
        : !hasResponseData
          ? 'Not enough response data yet'
          : `Response time P90 (${stats.responseTimeP90} min) exceeds ${rules.ON_TIME_EXPERT.maxResponseTimeP90Minutes} min threshold`,
      requirements: {
        maxResponseTimeP90Minutes: {
          required: rules.ON_TIME_EXPERT.maxResponseTimeP90Minutes,
          actual: stats.responseTimeP90,
          met: responseTimeMet,
        },
      },
    };
  },

  /**
   * NEWLY_VERIFIED: identityVerified + 0 bookings
   */
  evaluateNewlyVerified(stats: AgentStats, rules: BadgeRules): BadgeEvaluationResult {
    const identityMet = stats.identityVerified === rules.NEWLY_VERIFIED.identityVerified;
    const bookingsMet = stats.totalBookingsCompleted <= rules.NEWLY_VERIFIED.maxBookingsCompleted;
    const earned = identityMet && bookingsMet;

    return {
      badge: AgentBadge.NEWLY_VERIFIED,
      earned,
      reason: earned
        ? 'New verified agent - ready to build reputation'
        : !identityMet
          ? 'Identity verification required'
          : 'Agent has completed bookings - no longer "new"',
      requirements: {
        identityVerified: {
          required: true,
          actual: stats.identityVerified,
          met: identityMet,
        },
        maxBookingsCompleted: {
          required: rules.NEWLY_VERIFIED.maxBookingsCompleted,
          actual: stats.totalBookingsCompleted,
          met: bookingsMet,
        },
      },
    };
  },

  /**
   * Evaluate all badges for an agent.
   * Returns the list of earned badges.
   */
  evaluateAllBadges(
    stats: AgentStats,
    rules: BadgeRules = DEFAULT_BADGE_RULES
  ): BadgeEvaluationResult[] {
    const allBadges = Object.values(AgentBadge);
    return allBadges.map(badge => this.evaluateBadge(badge, stats, rules));
  },

  /**
   * Get badges that should be assigned based on current stats.
   */
  calculateBadges(
    stats: AgentStats,
    rules: BadgeRules = DEFAULT_BADGE_RULES
  ): AgentBadge[] {
    const evaluations = this.evaluateAllBadges(stats, rules);
    return evaluations.filter(e => e.earned).map(e => e.badge);
  },

  /**
   * Calculate badge changes (assigned and revoked).
   */
  calculateBadgeChanges(
    stats: AgentStats,
    currentBadges: AgentBadge[],
    rules: BadgeRules = DEFAULT_BADGE_RULES
  ): AgentBadgeChanges {
    const newBadges = this.calculateBadges(stats, rules);

    const currentSet = new Set(currentBadges);
    const newSet = new Set(newBadges);

    const assigned = newBadges.filter(b => !currentSet.has(b));
    const revoked = currentBadges.filter(b => !newSet.has(b));

    return {
      agentId: stats.agentId,
      previousBadges: currentBadges,
      newBadges,
      assigned,
      revoked,
    };
  },
};

// =============================================================================
// TRUST LEVEL ENGINE
// =============================================================================

export const trustLevelEngine = {
  /**
   * Calculate trust level based on agent stats.
   * Level 3 > Level 2 > Level 1
   */
  calculateTrustLevel(
    stats: AgentStats,
    rules: TrustLevelRules = DEFAULT_TRUST_LEVEL_RULES
  ): TrustLevelEvaluationResult {
    // Check Level 3 first (highest)
    const level3 = this.evaluateLevel3(stats, rules);
    if (level3.met) {
      return {
        level: TrustLevel.LEVEL_3,
        reason: 'Established agent with excellent track record',
        requirements: level3.requirements,
      };
    }

    // Check Level 2
    const level2 = this.evaluateLevel2(stats, rules);
    if (level2.met) {
      return {
        level: TrustLevel.LEVEL_2,
        reason: 'Agent with good standing and completed bookings',
        requirements: level2.requirements,
      };
    }

    // Check Level 1 (basic)
    const level1 = this.evaluateLevel1(stats, rules);
    if (level1.met) {
      return {
        level: TrustLevel.LEVEL_1,
        reason: 'Verified agent ready to accept bookings',
        requirements: level1.requirements,
      };
    }

    // Default to Level 1 if identity verified, otherwise Level 1 with warning
    return {
      level: TrustLevel.LEVEL_1,
      reason: stats.identityVerified
        ? 'New verified agent'
        : 'Identity verification pending',
      requirements: level1.requirements,
    };
  },

  evaluateLevel1(
    stats: AgentStats,
    rules: TrustLevelRules
  ): { met: boolean; requirements: Record<string, { required: unknown; actual: unknown; met: boolean }> } {
    const identityMet = stats.identityVerified === rules.LEVEL_1.identityVerified;

    return {
      met: identityMet,
      requirements: {
        identityVerified: {
          required: true,
          actual: stats.identityVerified,
          met: identityMet,
        },
      },
    };
  },

  evaluateLevel2(
    stats: AgentStats,
    rules: TrustLevelRules
  ): { met: boolean; requirements: Record<string, { required: unknown; actual: unknown; met: boolean }> } {
    const identityMet = stats.identityVerified === rules.LEVEL_2.identityVerified;
    const bookingsMet = stats.totalBookingsCompleted >= rules.LEVEL_2.minBookingsCompleted;
    const violationsMet = stats.platformViolationCount <= rules.LEVEL_2.maxViolationCount;
    const ratingMet = rules.LEVEL_2.minAverageRating === null ||
      stats.averageRating === null ||
      stats.averageRating >= rules.LEVEL_2.minAverageRating;

    return {
      met: identityMet && bookingsMet && violationsMet && ratingMet,
      requirements: {
        identityVerified: {
          required: true,
          actual: stats.identityVerified,
          met: identityMet,
        },
        minBookingsCompleted: {
          required: rules.LEVEL_2.minBookingsCompleted,
          actual: stats.totalBookingsCompleted,
          met: bookingsMet,
        },
        maxViolationCount: {
          required: rules.LEVEL_2.maxViolationCount,
          actual: stats.platformViolationCount,
          met: violationsMet,
        },
        minAverageRating: {
          required: rules.LEVEL_2.minAverageRating,
          actual: stats.averageRating,
          met: ratingMet,
        },
      },
    };
  },

  evaluateLevel3(
    stats: AgentStats,
    rules: TrustLevelRules
  ): { met: boolean; requirements: Record<string, { required: unknown; actual: unknown; met: boolean }> } {
    const identityMet = stats.identityVerified === rules.LEVEL_3.identityVerified;
    const bookingsMet = stats.totalBookingsCompleted >= rules.LEVEL_3.minBookingsCompleted;
    const violationsMet = stats.platformViolationCount <= rules.LEVEL_3.maxViolationCount;
    const ratingMet = stats.averageRating !== null && stats.averageRating >= rules.LEVEL_3.minAverageRating;
    const ratingCountMet = stats.ratingCount >= rules.LEVEL_3.minRatingCount;

    return {
      met: identityMet && bookingsMet && violationsMet && ratingMet && ratingCountMet,
      requirements: {
        identityVerified: {
          required: true,
          actual: stats.identityVerified,
          met: identityMet,
        },
        minBookingsCompleted: {
          required: rules.LEVEL_3.minBookingsCompleted,
          actual: stats.totalBookingsCompleted,
          met: bookingsMet,
        },
        maxViolationCount: {
          required: rules.LEVEL_3.maxViolationCount,
          actual: stats.platformViolationCount,
          met: violationsMet,
        },
        minAverageRating: {
          required: rules.LEVEL_3.minAverageRating,
          actual: stats.averageRating,
          met: ratingMet,
        },
        minRatingCount: {
          required: rules.LEVEL_3.minRatingCount,
          actual: stats.ratingCount,
          met: ratingCountMet,
        },
      },
    };
  },

  /**
   * Get progress towards next trust level.
   */
  getProgressToNextLevel(
    stats: AgentStats,
    currentLevel: TrustLevel,
    rules: TrustLevelRules = DEFAULT_TRUST_LEVEL_RULES
  ): {
    nextLevel: TrustLevel | null;
    requirements: Record<string, { required: unknown; actual: unknown; progress: number }>;
  } {
    if (currentLevel === TrustLevel.LEVEL_3) {
      return { nextLevel: null, requirements: {} };
    }

    const nextLevel = currentLevel === TrustLevel.LEVEL_1 ? TrustLevel.LEVEL_2 : TrustLevel.LEVEL_3;
    const targetRules = nextLevel === TrustLevel.LEVEL_2 ? rules.LEVEL_2 : rules.LEVEL_3;

    const requirements: Record<string, { required: unknown; actual: unknown; progress: number }> = {
      minBookingsCompleted: {
        required: targetRules.minBookingsCompleted,
        actual: stats.totalBookingsCompleted,
        progress: Math.min(100, (stats.totalBookingsCompleted / targetRules.minBookingsCompleted) * 100),
      },
    };

    const targetRulesObj = targetRules as any;
    if ('minRatingCount' in targetRulesObj && typeof targetRulesObj.minRatingCount === 'number') {
      requirements.minRatingCount = {
        required: targetRulesObj.minRatingCount,
        actual: stats.ratingCount,
        progress: Math.min(100, (stats.ratingCount / targetRulesObj.minRatingCount) * 100),
      };
    }

    return { nextLevel, requirements };
  },
};
