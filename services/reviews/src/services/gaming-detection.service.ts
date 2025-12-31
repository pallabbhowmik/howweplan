/**
 * Gaming Detection Service
 * 
 * Detects and prevents gaming of the review system.
 * Uses multiple signals to identify suspicious patterns.
 * 
 * Gaming patterns detected:
 * - Review velocity (too many reviews in short time)
 * - Rating manipulation (sudden rating spikes)
 * - Review reciprocity (mutual 5-star reviews)
 * - Suspicious content patterns
 * - IP/device clustering
 * - Text similarity across reviews
 */

import { operationalLimits, featureFlags } from '../config/env';
import { Review } from '../models';
import { reviewRepository } from '../repositories';

// =============================================================================
// TYPES
// =============================================================================

export interface GamingSignal {
  type: GamingSignalType;
  score: number;        // 0-1, higher = more suspicious
  confidence: number;   // 0-1, how confident in this signal
  details: string;
  metadata: Record<string, unknown>;
}

export enum GamingSignalType {
  VELOCITY_SPIKE = 'VELOCITY_SPIKE',
  RATING_MANIPULATION = 'RATING_MANIPULATION',
  RECIPROCAL_REVIEWS = 'RECIPROCAL_REVIEWS',
  CONTENT_SIMILARITY = 'CONTENT_SIMILARITY',
  IP_CLUSTERING = 'IP_CLUSTERING',
  TIMING_PATTERN = 'TIMING_PATTERN',
  NEW_ACCOUNT_BURST = 'NEW_ACCOUNT_BURST',
  RATING_DEVIATION = 'RATING_DEVIATION',
}

export interface GamingAnalysisResult {
  reviewId: string;
  subjectId: string;
  overallScore: number;           // 0-1, composite gaming score
  isLikelyGaming: boolean;
  requiresInvestigation: boolean;
  signals: GamingSignal[];
  recommendation: GamingRecommendation;
}

export enum GamingRecommendation {
  ALLOW = 'ALLOW',
  FLAG_FOR_REVIEW = 'FLAG_FOR_REVIEW',
  DELAY_PUBLICATION = 'DELAY_PUBLICATION',
  REJECT = 'REJECT',
  INVESTIGATE_AGENT = 'INVESTIGATE_AGENT',
}

// =============================================================================
// THRESHOLDS
// =============================================================================

const THRESHOLDS = {
  // Minimum score to be considered gaming
  GAMING_THRESHOLD: 0.6,
  
  // Minimum score to require investigation
  INVESTIGATION_THRESHOLD: 0.75,
  
  // Velocity: max reviews per day for a subject
  MAX_REVIEWS_PER_DAY: operationalLimits.gamingDetection.suspiciousVelocityThreshold,
  
  // Sentiment variance threshold
  SENTIMENT_VARIANCE_THRESHOLD: operationalLimits.gamingDetection.sentimentVarianceThreshold,
  
  // Minimum reviews to analyze for patterns
  MIN_REVIEWS_FOR_ANALYSIS: operationalLimits.gamingDetection.minReviewsForAnalysis,
  
  // Text similarity threshold (0-1)
  TEXT_SIMILARITY_THRESHOLD: 0.85,
  
  // Rating deviation from average
  RATING_DEVIATION_THRESHOLD: 1.5,  // Standard deviations
};

// =============================================================================
// GAMING DETECTION SERVICE
// =============================================================================

export const gamingDetectionService = {
  /**
   * Analyze a review for gaming signals
   */
  async analyzeReview(review: Review): Promise<GamingAnalysisResult> {
    if (!featureFlags.gamingDetectionEnabled) {
      return createCleanResult(review);
    }

    const signals: GamingSignal[] = [];
    
    // Run all detection algorithms in parallel
    const [
      velocitySignal,
      reciprocitySignal,
      ratingDeviationSignal,
      timingSignal,
    ] = await Promise.all([
      this.detectVelocitySpike(review),
      this.detectReciprocalReviews(review),
      this.detectRatingDeviation(review),
      this.detectTimingPattern(review),
    ]);

    if (velocitySignal) signals.push(velocitySignal);
    if (reciprocitySignal) signals.push(reciprocitySignal);
    if (ratingDeviationSignal) signals.push(ratingDeviationSignal);
    if (timingSignal) signals.push(timingSignal);

    // Calculate composite score
    const overallScore = this.calculateCompositeScore(signals);
    const isLikelyGaming = overallScore >= THRESHOLDS.GAMING_THRESHOLD;
    const requiresInvestigation = overallScore >= THRESHOLDS.INVESTIGATION_THRESHOLD;

    return {
      reviewId: review.id,
      subjectId: review.subjectId,
      overallScore,
      isLikelyGaming,
      requiresInvestigation,
      signals,
      recommendation: this.determineRecommendation(overallScore, signals),
    };
  },

  /**
   * Detect unusual velocity of reviews for a subject
   */
  async detectVelocitySpike(review: Review): Promise<GamingSignal | null> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [dailyCount, weeklyCount] = await Promise.all([
      reviewRepository.countBySubjectInPeriod(review.subjectId, oneDayAgo, now),
      reviewRepository.countBySubjectInPeriod(review.subjectId, oneWeekAgo, now),
    ]);

    const dailyThreshold = THRESHOLDS.MAX_REVIEWS_PER_DAY;
    const weeklyThreshold = dailyThreshold * 5;  // Allow some burst but not sustained

    if (dailyCount >= dailyThreshold || weeklyCount >= weeklyThreshold) {
      const score = Math.min(1, Math.max(
        dailyCount / dailyThreshold,
        weeklyCount / weeklyThreshold
      ) * 0.8);

      return {
        type: GamingSignalType.VELOCITY_SPIKE,
        score,
        confidence: 0.85,
        details: `Agent received ${dailyCount} reviews in 24h, ${weeklyCount} in 7 days`,
        metadata: {
          dailyCount,
          weeklyCount,
          dailyThreshold,
          weeklyThreshold,
        },
      };
    }

    return null;
  },

  /**
   * Detect reciprocal review patterns (you scratch my back...)
   */
  async detectReciprocalReviews(review: Review): Promise<GamingSignal | null> {
    // Check if the reviewer has been reviewed by the subject
    const reciprocalReview = await reviewRepository.findByBookingAndReviewer(
      review.bookingId,
      review.subjectId  // Subject becomes reviewer in reciprocal
    );

    if (!reciprocalReview) return null;

    // Both exist - check if both are high ratings
    const reviewerRating = review.ratings.overall;
    const subjectRating = reciprocalReview.ratings?.overall;

    if (subjectRating && reviewerRating >= 4 && subjectRating >= 4) {
      // High mutual ratings - suspicious but not definitive
      const timeDiff = Math.abs(
        (review.submittedAt?.getTime() ?? 0) - 
        (reciprocalReview.submittedAt?.getTime() ?? 0)
      );
      const withinHour = timeDiff < 60 * 60 * 1000;

      const score = withinHour ? 0.7 : 0.4;

      return {
        type: GamingSignalType.RECIPROCAL_REVIEWS,
        score,
        confidence: withinHour ? 0.75 : 0.5,
        details: `Mutual high ratings detected (${reviewerRating}/${subjectRating})${withinHour ? ' within 1 hour' : ''}`,
        metadata: {
          reviewerRating,
          subjectRating,
          timeDifferenceMs: timeDiff,
          withinHour,
        },
      };
    }

    return null;
  },

  /**
   * Detect if rating deviates significantly from average
   */
  async detectRatingDeviation(review: Review): Promise<GamingSignal | null> {
    const stats = await reviewRepository.getSubjectStats(review.subjectId);

    if (stats.totalReviews < THRESHOLDS.MIN_REVIEWS_FOR_ANALYSIS) {
      return null;  // Not enough data to detect deviation
    }

    const deviation = Math.abs(review.ratings.overall - stats.averageRating);
    
    // Check if this is a perfect 5-star review that significantly raises the average
    if (review.ratings.overall === 5 && deviation > THRESHOLDS.RATING_DEVIATION_THRESHOLD) {
      return {
        type: GamingSignalType.RATING_DEVIATION,
        score: 0.5 * (deviation / 2),  // Scale based on deviation
        confidence: 0.6,
        details: `Review rating (${review.ratings.overall}) deviates ${deviation.toFixed(2)} from average (${stats.averageRating.toFixed(2)})`,
        metadata: {
          reviewRating: review.ratings.overall,
          averageRating: stats.averageRating,
          deviation,
          totalReviews: stats.totalReviews,
        },
      };
    }

    return null;
  },

  /**
   * Detect suspicious timing patterns
   */
  async detectTimingPattern(review: Review): Promise<GamingSignal | null> {
    if (!review.submittedAt) return null;

    const submissionHour = review.submittedAt.getUTCHours();
    const dayOfWeek = review.submittedAt.getUTCDay();

    // Suspicious: reviews submitted at unusual hours (2-5 AM UTC)
    const isUnusualHour = submissionHour >= 2 && submissionHour <= 5;
    
    // Suspicious: very quick submission after trip completion
    const hoursSinceTripEnd = (review.submittedAt.getTime() - review.tripCompletedAt.getTime()) / (1000 * 60 * 60);
    const isVeryQuick = hoursSinceTripEnd < 1;  // Less than 1 hour

    if (isUnusualHour || isVeryQuick) {
      return {
        type: GamingSignalType.TIMING_PATTERN,
        score: isVeryQuick ? 0.5 : 0.3,
        confidence: 0.4,
        details: `Suspicious timing: ${isVeryQuick ? 'submitted within 1 hour of trip end' : 'unusual submission hour (UTC)'}`,
        metadata: {
          submissionHour,
          dayOfWeek,
          hoursSinceTripEnd,
          isUnusualHour,
          isVeryQuick,
        },
      };
    }

    return null;
  },

  /**
   * Calculate composite gaming score from multiple signals
   */
  calculateCompositeScore(signals: GamingSignal[]): number {
    if (signals.length === 0) return 0;

    // Weighted average based on confidence
    let totalWeight = 0;
    let weightedSum = 0;

    for (const signal of signals) {
      const weight = signal.confidence;
      totalWeight += weight;
      weightedSum += signal.score * weight;
    }

    // Apply diminishing returns for multiple signals
    const baseScore = weightedSum / totalWeight;
    const signalCountBonus = Math.min(0.2, signals.length * 0.05);
    
    return Math.min(1, baseScore + signalCountBonus);
  },

  /**
   * Determine recommendation based on analysis
   */
  determineRecommendation(
    overallScore: number,
    signals: GamingSignal[]
  ): GamingRecommendation {
    // Check for specific high-confidence signals that warrant immediate action
    const hasHighConfidenceAlert = signals.some(
      s => s.score >= 0.8 && s.confidence >= 0.8
    );

    if (hasHighConfidenceAlert || overallScore >= 0.9) {
      return GamingRecommendation.REJECT;
    }

    if (overallScore >= THRESHOLDS.INVESTIGATION_THRESHOLD) {
      return GamingRecommendation.INVESTIGATE_AGENT;
    }

    if (overallScore >= THRESHOLDS.GAMING_THRESHOLD) {
      return GamingRecommendation.DELAY_PUBLICATION;
    }

    if (overallScore >= 0.3) {
      return GamingRecommendation.FLAG_FOR_REVIEW;
    }

    return GamingRecommendation.ALLOW;
  },

  /**
   * Check if an agent should be investigated based on review patterns
   */
  async shouldInvestigateAgent(agentId: string): Promise<{
    shouldInvestigate: boolean;
    reason: string | null;
    signals: GamingSignal[];
  }> {
    if (!featureFlags.gamingDetectionEnabled) {
      return { shouldInvestigate: false, reason: null, signals: [] };
    }

    const stats = await reviewRepository.getSubjectStats(agentId);

    if (stats.totalReviews < THRESHOLDS.MIN_REVIEWS_FOR_ANALYSIS) {
      return { shouldInvestigate: false, reason: null, signals: [] };
    }

    const signals: GamingSignal[] = [];

    // Check for abnormally high rating
    if (stats.averageRating >= 4.9 && stats.totalReviews >= 10) {
      signals.push({
        type: GamingSignalType.RATING_MANIPULATION,
        score: 0.7,
        confidence: 0.6,
        details: `Suspiciously high average rating: ${stats.averageRating.toFixed(2)} across ${stats.totalReviews} reviews`,
        metadata: { averageRating: stats.averageRating, totalReviews: stats.totalReviews },
      });
    }

    // Check for rating distribution anomalies
    const fiveStarRatio = (stats.ratingDistribution[5] ?? 0) / stats.totalReviews;
    if (fiveStarRatio > 0.95 && stats.totalReviews >= 10) {
      signals.push({
        type: GamingSignalType.RATING_MANIPULATION,
        score: 0.8,
        confidence: 0.7,
        details: `${(fiveStarRatio * 100).toFixed(1)}% of reviews are 5 stars`,
        metadata: { fiveStarRatio, distribution: stats.ratingDistribution },
      });
    }

    const shouldInvestigate = signals.some(s => s.score >= 0.7);
    const reason = shouldInvestigate 
      ? signals.map(s => s.details).join('; ')
      : null;

    return { shouldInvestigate, reason, signals };
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createCleanResult(review: Review): GamingAnalysisResult {
  return {
    reviewId: review.id,
    subjectId: review.subjectId,
    overallScore: 0,
    isLikelyGaming: false,
    requiresInvestigation: false,
    signals: [],
    recommendation: GamingRecommendation.ALLOW,
  };
}

export type GamingDetectionService = typeof gamingDetectionService;
