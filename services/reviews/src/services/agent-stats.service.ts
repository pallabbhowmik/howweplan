/**
 * Agent Stats Service
 * 
 * Manages agent trust statistics.
 * Recalculates stats on events and provides public profile data.
 */

import {
  type AgentStats,
  type AgentPublicProfile,
  TrustLevel,
  AgentBadge,
  getResponseTimeLabel,
  getProposalActivityLevel,
  DEFAULT_PLATFORM_PROTECTION_CONFIG,
} from '@tripcomposer/contracts';
import { badgeEngine, trustLevelEngine } from './badge-engine.service';
import { agentStatsRepository } from '../repositories/agent-stats.repository';
import { trustReviewRepository } from '../repositories/trust-review.repository';
import { trustEventPublisher } from '../events/trust-event.publisher';

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export const agentStatsService = {
  /**
   * Get agent stats (internal use).
   */
  async getStats(agentId: string): Promise<AgentStats | null> {
    return agentStatsRepository.findById(agentId);
  },

  /**
   * Get agent public profile (safe to expose pre-payment).
   * NEVER exposes identity information.
   */
  async getPublicProfile(agentId: string): Promise<AgentPublicProfile | null> {
    const stats = await agentStatsRepository.findById(agentId);
    if (!stats) return null;

    return {
      agentId: stats.agentId,
      averageRating: stats.averageRating,
      ratingCount: stats.ratingCount,
      completedBookings: stats.totalBookingsCompleted,
      proposalActivityLevel: getProposalActivityLevel(
        stats.totalProposalsSubmitted,
        stats.totalBookingsCompleted
      ),
      responseTimeLabel: getResponseTimeLabel(stats.responseTimeP90),
      trustLevel: stats.trustLevel,
      badges: stats.badges,
      platformProtectionEligible: stats.platformProtectionEligible,
      specializations: [], // Fetched separately from agent service
      isVerified: stats.identityVerified,
    };
  },

  /**
   * Recalculate agent stats after an event.
   * Called when: review submitted, booking completed, violation detected
   */
  async recalculateStats(agentId: string): Promise<AgentStats> {
    // 1. Get current stats
    let currentStats = await agentStatsRepository.findById(agentId);
    
    if (!currentStats) {
      // Initialize new agent stats
      currentStats = await this.initializeStats(agentId);
    }

    // 2. Get fresh review stats
    const reviewStats = await trustReviewRepository.getAgentStats(agentId);

    // 3. Calculate platform protection score
    const platformProtectionScore = this.calculatePlatformProtectionScore(currentStats);

    // 4. Determine new trust level
    const statsForEvaluation: AgentStats = {
      ...currentStats,
      averageRating: reviewStats.averageRating,
      ratingCount: reviewStats.totalReviews,
      platformProtectionScore,
    };

    const trustLevelResult = trustLevelEngine.calculateTrustLevel(statsForEvaluation);

    // 5. Calculate new badges
    const badgeChanges = badgeEngine.calculateBadgeChanges(
      statsForEvaluation,
      currentStats.badges as AgentBadge[]
    );

    // 6. Build updated stats
    const updatedStats: AgentStats = {
      ...currentStats,
      averageRating: reviewStats.averageRating,
      ratingCount: reviewStats.totalReviews,
      trustLevel: trustLevelResult.level,
      badges: badgeChanges.newBadges,
      platformProtectionScore,
      platformProtectionEligible: platformProtectionScore >= DEFAULT_PLATFORM_PROTECTION_CONFIG.eligibilityThreshold,
      lastUpdatedAt: new Date(),
      lastRecalculatedAt: new Date(),
    };

    // 7. Save updated stats
    await agentStatsRepository.update(updatedStats);

    // 8. Emit events for badge changes
    for (const badge of badgeChanges.assigned) {
      await trustEventPublisher.publishBadgeAssigned({
        agentId,
        badge,
        reason: `Badge earned based on stats recalculation`,
        triggeredBy: 'SYSTEM',
        adminId: null,
        metadata: { reviewStats },
        assignedAt: new Date(),
      });
    }

    for (const badge of badgeChanges.revoked) {
      await trustEventPublisher.publishBadgeRevoked({
        agentId,
        badge,
        reason: `Badge revoked based on stats recalculation`,
        triggeredBy: 'SYSTEM',
        adminId: null,
        metadata: { reviewStats },
        revokedAt: new Date(),
      });
    }

    // 9. Emit event if trust level changed
    if (currentStats.trustLevel !== trustLevelResult.level) {
      await trustEventPublisher.publishTrustLevelChanged({
        agentId,
        previousLevel: currentStats.trustLevel,
        newLevel: trustLevelResult.level,
        reason: trustLevelResult.reason,
        triggeredBy: 'SYSTEM',
        adminId: null,
        metadata: { requirements: trustLevelResult.requirements },
        changedAt: new Date(),
      });
    }

    return updatedStats;
  },

  /**
   * Calculate platform protection score.
   * 100% if all bookings completed on-platform.
   * Reduced for cancellations, violations, disputes lost.
   */
  calculatePlatformProtectionScore(stats: AgentStats): number {
    const config = DEFAULT_PLATFORM_PROTECTION_CONFIG;
    let score = 100;

    // Deduct for cancellations
    score -= stats.totalBookingsCancelled * config.cancellationPenalty;

    // Deduct for violations
    score -= stats.platformViolationCount * config.violationPenalty;

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, score));
  },

  /**
   * Initialize stats for a new agent.
   */
  async initializeStats(agentId: string): Promise<AgentStats> {
    const initialStats: AgentStats = {
      agentId,
      totalProposalsSubmitted: 0,
      totalBookingsCompleted: 0,
      totalBookingsCancelled: 0,
      averageRating: null,
      ratingCount: 0,
      responseTimeP50: null,
      responseTimeP90: null,
      platformViolationCount: 0,
      trustLevel: TrustLevel.LEVEL_1,
      badges: [],
      identityVerified: false,
      bankVerified: false,
      platformProtectionScore: 100,
      platformProtectionEligible: true,
      lastUpdatedAt: new Date(),
      lastRecalculatedAt: new Date(),
    };

    await agentStatsRepository.create(initialStats);
    return initialStats;
  },

  /**
   * Increment violation count and recalculate stats.
   */
  async recordViolation(agentId: string): Promise<AgentStats> {
    await agentStatsRepository.incrementViolationCount(agentId);
    return this.recalculateStats(agentId);
  },

  /**
   * Increment completed booking count.
   */
  async recordCompletedBooking(agentId: string): Promise<void> {
    await agentStatsRepository.incrementCompletedBookings(agentId);
  },

  /**
   * Increment cancelled booking count.
   */
  async recordCancelledBooking(agentId: string): Promise<void> {
    await agentStatsRepository.incrementCancelledBookings(agentId);
  },

  /**
   * Update verification status (called by identity service).
   */
  async updateVerificationStatus(
    agentId: string,
    identityVerified: boolean,
    bankVerified: boolean
  ): Promise<AgentStats> {
    await agentStatsRepository.updateVerificationStatus(agentId, identityVerified, bankVerified);
    return this.recalculateStats(agentId);
  },

  /**
   * Get badge progress for agent dashboard.
   */
  async getBadgeProgress(agentId: string): Promise<{
    earned: { badge: AgentBadge; earnedAt: Date }[];
    inProgress: { badge: AgentBadge; progress: number; requirements: string }[];
  }> {
    const stats = await agentStatsRepository.findById(agentId);
    if (!stats) {
      return { earned: [], inProgress: [] };
    }

    const allEvaluations = badgeEngine.evaluateAllBadges(stats);
    const earned = allEvaluations
      .filter(e => e.earned)
      .map(e => ({
        badge: e.badge,
        earnedAt: new Date(), // Would come from badge history in production
      }));

    const inProgress = allEvaluations
      .filter(e => !e.earned)
      .map(e => {
        // Calculate progress percentage
        const reqs = Object.values(e.requirements);
        const metCount = reqs.filter(r => r.met).length;
        const progress = reqs.length > 0 ? (metCount / reqs.length) * 100 : 0;

        return {
          badge: e.badge,
          progress,
          requirements: e.reason,
        };
      });

    return { earned, inProgress };
  },

  /**
   * Get trust level progress for agent dashboard.
   */
  async getTrustLevelProgress(agentId: string): Promise<{
    currentLevel: TrustLevel;
    nextLevel: TrustLevel | null;
    progress: Record<string, { required: unknown; actual: unknown; progress: number }>;
  }> {
    const stats = await agentStatsRepository.findById(agentId);
    if (!stats) {
      return {
        currentLevel: TrustLevel.LEVEL_1,
        nextLevel: TrustLevel.LEVEL_2,
        progress: {},
      };
    }

    const levelProgress = trustLevelEngine.getProgressToNextLevel(stats, stats.trustLevel);

    return {
      currentLevel: stats.trustLevel,
      nextLevel: levelProgress.nextLevel,
      progress: levelProgress.requirements,
    };
  },
};
