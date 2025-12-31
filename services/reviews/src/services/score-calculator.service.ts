/**
 * Score Calculator Service
 * 
 * Calculates and maintains agent reliability scores.
 * Scores are composite values based on multiple factors:
 * - Review ratings (40%)
 * - Booking completion rate (25%)
 * - Response rate and time (20%)
 * - Dispute rate (15%)
 * 
 * Scores decay over time if no new reviews are received.
 */

import { operationalLimits } from '../config/env';
import {
  AgentScore,
  ScoreBreakdown,
  ReliabilityTier,
  ScoreVisibility,
  ScoreHistoryEntry,
  calculateReliabilityTier,
  roundToHalf,
  PublicAgentRating,
  formatResponseTime,
} from '../models';
import { agentScoreRepository, reviewRepository } from '../repositories';

// =============================================================================
// TYPES
// =============================================================================

export interface ScoreCalculationInput {
  agentId: string;
  
  // From reviews
  reviewStats: {
    totalReviews: number;
    averageRating: number;
    ratingsByCategory: {
      communication?: number;
      accuracy?: number;
      value?: number;
      responsiveness?: number;
    };
  };
  
  // From bookings (passed via event or API)
  bookingStats: {
    completedBookings: number;
    acceptedBookings: number;
    cancelledBookings: number;
  };
  
  // From messaging (passed via event or API)
  responseStats: {
    totalMessages: number;
    respondedMessages: number;
    averageResponseTimeMinutes: number;
  };
  
  // From disputes (passed via event or API)
  disputeStats: {
    totalDisputes: number;
    disputesAgainstAgent: number;
    resolvedInAgentFavor: number;
  };
}

export interface ScoreRecalculationResult {
  previousScore: AgentScore | null;
  newScore: AgentScore;
  tierChanged: boolean;
  previousTier: ReliabilityTier | null;
  visibilityChanged: boolean;
  historyEntry: ScoreHistoryEntry;
}

// =============================================================================
// WEIGHT CONFIGURATION
// =============================================================================

const SCORE_WEIGHTS = {
  review: 0.40,
  completion: 0.25,
  response: 0.20,
  dispute: 0.15,
};

// =============================================================================
// SCORE CALCULATOR SERVICE
// =============================================================================

export const scoreCalculatorService = {
  /**
   * Calculate or recalculate an agent's score
   */
  async calculateScore(
    input: ScoreCalculationInput,
    triggeredBy: string
  ): Promise<ScoreRecalculationResult> {
    // Get existing score if any
    const previousScore = await agentScoreRepository.findByAgentId(input.agentId);
    
    // Calculate individual component scores
    const breakdown = this.calculateBreakdown(input);
    
    // Calculate composite internal score
    const internalScore = this.calculateCompositeScore(breakdown);
    
    // Apply decay if needed
    const decayFactor = previousScore 
      ? this.calculateDecay(previousScore.lastReviewAt)
      : 0;
    const decayedInternalScore = internalScore * (1 - decayFactor);
    
    // Calculate public score (rounded for display)
    const publicScore = roundToHalf(decayedInternalScore);
    
    // Determine tier
    const isSuspended = previousScore?.reliabilityTier === ReliabilityTier.SUSPENDED;
    const reliabilityTier = calculateReliabilityTier(
      input.bookingStats.completedBookings,
      decayedInternalScore,
      isSuspended
    );
    
    // Determine visibility
    const { visibility, visibilityReason } = this.determineVisibility(
      input.reviewStats.totalReviews,
      previousScore
    );
    
    // Build updated score
    const now = new Date();
    const newScore: AgentScore = {
      id: previousScore?.id ?? crypto.randomUUID(),
      agentId: input.agentId,
      internalScore: decayedInternalScore,
      publicScore,
      reliabilityTier,
      breakdown,
      gamingRiskScore: previousScore?.gamingRiskScore ?? 0,
      isUnderInvestigation: previousScore?.isUnderInvestigation ?? false,
      investigationReason: previousScore?.investigationReason ?? null,
      lastReviewAt: input.reviewStats.totalReviews > (previousScore?.totalReviews ?? 0)
        ? now
        : previousScore?.lastReviewAt ?? null,
      scoreDecayApplied: decayFactor,
      visibility,
      visibilityReason,
      totalBookings: input.bookingStats.completedBookings + input.bookingStats.cancelledBookings,
      totalReviews: input.reviewStats.totalReviews,
      positiveReviews: 0,  // Will be updated from review stats
      neutralReviews: 0,
      negativeReviews: 0,
      calculatedAt: now,
      createdAt: previousScore?.createdAt ?? now,
      updatedAt: now,
    };
    
    // Save score
    await agentScoreRepository.upsert(newScore);
    
    // Create history entry
    const historyEntry: ScoreHistoryEntry = {
      id: crypto.randomUUID(),
      agentId: input.agentId,
      internalScore: newScore.internalScore,
      publicScore: newScore.publicScore,
      reliabilityTier: newScore.reliabilityTier,
      breakdown: newScore.breakdown,
      triggeredBy,
      calculatedAt: now,
    };
    
    await agentScoreRepository.addHistoryEntry(historyEntry);
    
    return {
      previousScore,
      newScore,
      tierChanged: previousScore ? previousScore.reliabilityTier !== reliabilityTier : false,
      previousTier: previousScore?.reliabilityTier ?? null,
      visibilityChanged: previousScore ? previousScore.visibility !== visibility : false,
      historyEntry,
    };
  },

  /**
   * Calculate the breakdown of score components
   */
  calculateBreakdown(input: ScoreCalculationInput): ScoreBreakdown {
    const { reviewStats, bookingStats, responseStats, disputeStats } = input;
    
    // Review score (0-5 scale)
    const reviewScore = reviewStats.totalReviews > 0
      ? reviewStats.averageRating
      : 0;
    
    // Completion rate (0-1 scale)
    const completionRate = bookingStats.acceptedBookings > 0
      ? bookingStats.completedBookings / bookingStats.acceptedBookings
      : 0;
    
    // Response rate (0-1 scale)
    const responseRate = responseStats.totalMessages > 0
      ? responseStats.respondedMessages / responseStats.totalMessages
      : 0;
    
    // Dispute rate (0-1 scale, inverted so lower is better)
    const totalBookings = bookingStats.completedBookings + bookingStats.cancelledBookings;
    const disputeRate = totalBookings > 0
      ? disputeStats.disputesAgainstAgent / totalBookings
      : 0;
    
    return {
      reviewScore,
      reviewCount: reviewStats.totalReviews,
      reviewWeight: SCORE_WEIGHTS.review,
      
      completionRate,
      completedBookings: bookingStats.completedBookings,
      acceptedBookings: bookingStats.acceptedBookings,
      completionWeight: SCORE_WEIGHTS.completion,
      
      responseRate,
      averageResponseTimeMinutes: responseStats.averageResponseTimeMinutes,
      responseWeight: SCORE_WEIGHTS.response,
      
      disputeRate,
      disputeCount: disputeStats.disputesAgainstAgent,
      disputeWeight: SCORE_WEIGHTS.dispute,
    };
  },

  /**
   * Calculate composite score from breakdown
   */
  calculateCompositeScore(breakdown: ScoreBreakdown): number {
    // Normalize all components to 0-5 scale
    const reviewComponent = breakdown.reviewScore * breakdown.reviewWeight;
    
    // Completion rate: 100% = 5, 80% = 4, etc.
    const completionComponent = (breakdown.completionRate * 5) * breakdown.completionWeight;
    
    // Response rate: 100% = 5, 80% = 4, etc.
    const responseComponent = (breakdown.responseRate * 5) * breakdown.responseWeight;
    
    // Dispute rate: 0% = 5, 10% = 4.5, etc. (inverted)
    const disputeComponent = ((1 - breakdown.disputeRate) * 5) * breakdown.disputeWeight;
    
    const composite = reviewComponent + completionComponent + responseComponent + disputeComponent;
    
    // Ensure score is within bounds
    return Math.min(5, Math.max(0, composite));
  },

  /**
   * Calculate score decay based on time since last review
   */
  calculateDecay(lastReviewAt: Date | null): number {
    if (!lastReviewAt) return 0;
    
    const daysSinceLastReview = (Date.now() - lastReviewAt.getTime()) / (1000 * 60 * 60 * 24);
    const decayThreshold = operationalLimits.scoring.decayFactorDays;
    
    if (daysSinceLastReview <= decayThreshold) {
      return 0;
    }
    
    // Linear decay after threshold, max 30% decay
    const excessDays = daysSinceLastReview - decayThreshold;
    const decayRate = 0.001;  // 0.1% per day over threshold
    return Math.min(0.3, excessDays * decayRate);
  },

  /**
   * Determine visibility based on review count and previous state
   */
  determineVisibility(
    reviewCount: number,
    previousScore: AgentScore | null
  ): { visibility: ScoreVisibility; visibilityReason: string | null } {
    const minReviewsForPublic = operationalLimits.scoring.minReviewsForPublic;
    
    // If under investigation, keep internal only
    if (previousScore?.isUnderInvestigation) {
      return {
        visibility: ScoreVisibility.INTERNAL_ONLY,
        visibilityReason: 'Under investigation',
      };
    }
    
    // If not enough reviews, internal only
    if (reviewCount < minReviewsForPublic) {
      return {
        visibility: ScoreVisibility.INTERNAL_ONLY,
        visibilityReason: `Requires at least ${minReviewsForPublic} reviews for public display`,
      };
    }
    
    // Otherwise, public
    return {
      visibility: ScoreVisibility.PUBLIC,
      visibilityReason: null,
    };
  },

  /**
   * Get public-facing rating for an agent
   */
  async getPublicRating(agentId: string): Promise<PublicAgentRating | null> {
    const score = await agentScoreRepository.findByAgentId(agentId);
    
    if (!score || score.visibility !== ScoreVisibility.PUBLIC) {
      return null;
    }
    
    // Get category averages from reviews
    const reviews = await reviewRepository.findPublishedBySubject(agentId, 100);
    const categoryAverages = this.calculateCategoryAverages(reviews);
    
    return {
      agentId,
      overallRating: score.publicScore,
      reviewCount: score.totalReviews,
      reliabilityTier: score.reliabilityTier,
      communicationRating: categoryAverages.communication,
      accuracyRating: categoryAverages.accuracy,
      valueRating: categoryAverages.value,
      responsivenessRating: categoryAverages.responsiveness,
      averageResponseTime: formatResponseTime(score.breakdown.averageResponseTimeMinutes),
      lastUpdatedAt: score.updatedAt,
    };
  },

  /**
   * Calculate category rating averages from reviews
   */
  calculateCategoryAverages(reviews: Array<{ ratings: { communication?: number; accuracy?: number; value?: number; responsiveness?: number } }>): {
    communication: number | null;
    accuracy: number | null;
    value: number | null;
    responsiveness: number | null;
  } {
    const counts = { communication: 0, accuracy: 0, value: 0, responsiveness: 0 };
    const sums = { communication: 0, accuracy: 0, value: 0, responsiveness: 0 };
    
    for (const review of reviews) {
      if (review.ratings.communication) {
        sums.communication += review.ratings.communication;
        counts.communication++;
      }
      if (review.ratings.accuracy) {
        sums.accuracy += review.ratings.accuracy;
        counts.accuracy++;
      }
      if (review.ratings.value) {
        sums.value += review.ratings.value;
        counts.value++;
      }
      if (review.ratings.responsiveness) {
        sums.responsiveness += review.ratings.responsiveness;
        counts.responsiveness++;
      }
    }
    
    const minForDisplay = 3;  // Need at least 3 ratings to show category
    
    return {
      communication: counts.communication >= minForDisplay 
        ? roundToHalf(sums.communication / counts.communication) 
        : null,
      accuracy: counts.accuracy >= minForDisplay 
        ? roundToHalf(sums.accuracy / counts.accuracy) 
        : null,
      value: counts.value >= minForDisplay 
        ? roundToHalf(sums.value / counts.value) 
        : null,
      responsiveness: counts.responsiveness >= minForDisplay 
        ? roundToHalf(sums.responsiveness / counts.responsiveness) 
        : null,
    };
  },

  /**
   * Apply decay to all scores that need it (scheduled job)
   */
  async applyDecayToAllScores(): Promise<number> {
    const decayThreshold = operationalLimits.scoring.decayFactorDays;
    const agentsNeedingDecay = await agentScoreRepository.findAgentsNeedingDecay(decayThreshold);
    
    let updatedCount = 0;
    
    for (const score of agentsNeedingDecay) {
      const newDecay = this.calculateDecay(score.lastReviewAt);
      
      if (newDecay > score.scoreDecayApplied) {
        const decayedInternalScore = score.internalScore * (1 - newDecay);
        const publicScore = roundToHalf(decayedInternalScore);
        
        await agentScoreRepository.update(score.agentId, {
          internalScore: decayedInternalScore,
          publicScore,
          scoreDecayApplied: newDecay,
          calculatedAt: new Date(),
        });
        
        updatedCount++;
      }
    }
    
    return updatedCount;
  },

  /**
   * Admin: Manually adjust an agent's score
   */
  async adjustScore(
    agentId: string,
    adjustment: number,
    _component?: 'REVIEW' | 'COMPLETION' | 'RESPONSE' | 'DISPUTE'
  ): Promise<AgentScore> {
    const currentScore = await agentScoreRepository.findByAgentId(agentId);
    
    if (!currentScore) {
      throw new Error(`No score found for agent ${agentId}`);
    }
    
    // Apply adjustment to internal score
    const newInternalScore = Math.min(5, Math.max(0, currentScore.internalScore + adjustment));
    const newPublicScore = roundToHalf(newInternalScore);
    
    // Recalculate tier based on new score
    const newTier = calculateReliabilityTier(
      currentScore.totalBookings,
      newInternalScore,
      currentScore.reliabilityTier === ReliabilityTier.SUSPENDED
    );
    
    return agentScoreRepository.update(agentId, {
      internalScore: newInternalScore,
      publicScore: newPublicScore,
      reliabilityTier: newTier,
      calculatedAt: new Date(),
    });
  },

  /**
   * Admin: Override an agent's tier
   */
  async overrideTier(
    agentId: string,
    newTier: ReliabilityTier
  ): Promise<AgentScore> {
    const currentScore = await agentScoreRepository.findByAgentId(agentId);
    
    if (!currentScore) {
      throw new Error(`No score found for agent ${agentId}`);
    }
    
    return agentScoreRepository.update(agentId, {
      reliabilityTier: newTier,
      calculatedAt: new Date(),
    });
  },
};

export type ScoreCalculatorService = typeof scoreCalculatorService;
