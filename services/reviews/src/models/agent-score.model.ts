/**
 * Agent Score Model
 * 
 * Internal reliability and reputation scoring for agents.
 * These scores are used for ranking and internal metrics.
 * Public ratings are derived but simplified versions.
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

export enum ScoreVisibility {
  INTERNAL_ONLY = 'INTERNAL_ONLY',     // Only for platform analytics
  ADMIN_VISIBLE = 'ADMIN_VISIBLE',     // Visible to admins
  PUBLIC = 'PUBLIC',                   // Visible to travelers
}

export enum ReliabilityTier {
  NEW = 'NEW',                 // < 3 completed bookings
  BRONZE = 'BRONZE',           // 3-10 bookings, score >= 3.0
  SILVER = 'SILVER',           // 11-50 bookings, score >= 3.5
  GOLD = 'GOLD',               // 51-200 bookings, score >= 4.0
  PLATINUM = 'PLATINUM',       // 200+ bookings, score >= 4.5
  SUSPENDED = 'SUSPENDED',     // Account issues
}

// =============================================================================
// SCORE COMPONENTS
// =============================================================================

export const ScoreBreakdownSchema = z.object({
  // Weighted average of review ratings (40% weight)
  reviewScore: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  reviewWeight: z.number().min(0).max(1),
  
  // Completion rate - bookings completed vs accepted (25% weight)
  completionRate: z.number().min(0).max(1),
  completedBookings: z.number().int().nonnegative(),
  acceptedBookings: z.number().int().nonnegative(),
  completionWeight: z.number().min(0).max(1),
  
  // Response rate and time (20% weight)
  responseRate: z.number().min(0).max(1),
  averageResponseTimeMinutes: z.number().nonnegative(),
  responseWeight: z.number().min(0).max(1),
  
  // Dispute rate - lower is better (15% weight)
  disputeRate: z.number().min(0).max(1),
  disputeCount: z.number().int().nonnegative(),
  disputeWeight: z.number().min(0).max(1),
});

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

// =============================================================================
// AGENT SCORE MODEL
// =============================================================================

export const AgentScoreSchema = z.object({
  // Identity
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  
  // Composite scores
  internalScore: z.number().min(0).max(5),       // Full precision internal score
  publicScore: z.number().min(0).max(5),         // Rounded for public display
  reliabilityTier: z.nativeEnum(ReliabilityTier),
  
  // Score components
  breakdown: ScoreBreakdownSchema,
  
  // Gaming indicators
  gamingRiskScore: z.number().min(0).max(1),     // 0 = no risk, 1 = high risk
  isUnderInvestigation: z.boolean(),
  investigationReason: z.string().nullable(),
  
  // Time-based factors
  lastReviewAt: z.date().nullable(),
  scoreDecayApplied: z.number().min(0).max(1),   // How much decay has been applied
  
  // Visibility
  visibility: z.nativeEnum(ScoreVisibility),
  visibilityReason: z.string().nullable(),
  
  // Statistics
  totalBookings: z.number().int().nonnegative(),
  totalReviews: z.number().int().nonnegative(),
  positiveReviews: z.number().int().nonnegative(),  // 4-5 stars
  neutralReviews: z.number().int().nonnegative(),   // 3 stars
  negativeReviews: z.number().int().nonnegative(),  // 1-2 stars
  
  // Audit
  calculatedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AgentScore = z.infer<typeof AgentScoreSchema>;

// =============================================================================
// PUBLIC RATING (EXPOSED TO TRAVELERS)
// =============================================================================

export const PublicAgentRatingSchema = z.object({
  agentId: z.string().uuid(),
  overallRating: z.number().min(0).max(5),          // Rounded to 0.5
  reviewCount: z.number().int().nonnegative(),
  reliabilityTier: z.nativeEnum(ReliabilityTier),
  
  // Only show if enough data
  communicationRating: z.number().min(0).max(5).nullable(),
  accuracyRating: z.number().min(0).max(5).nullable(),
  valueRating: z.number().min(0).max(5).nullable(),
  responsivenessRating: z.number().min(0).max(5).nullable(),
  
  // Response metrics (public)
  averageResponseTime: z.string().nullable(),       // "Usually responds within 2 hours"
  
  // Metadata
  lastUpdatedAt: z.date(),
});

export type PublicAgentRating = z.infer<typeof PublicAgentRatingSchema>;

// =============================================================================
// INTERNAL METRICS (ADMIN ONLY)
// =============================================================================

export const InternalAgentMetricsSchema = z.object({
  agentId: z.string().uuid(),
  
  // All AgentScore fields
  score: AgentScoreSchema,
  
  // Additional internal metrics
  cancellationRate: z.number().min(0).max(1),
  refundRate: z.number().min(0).max(1),
  averageBookingValue: z.number().nonnegative(),
  totalRevenue: z.number().nonnegative(),
  platformCommissionEarned: z.number().nonnegative(),
  
  // Risk indicators
  offPlatformLeakageRisk: z.number().min(0).max(1),
  pricingAnomalyScore: z.number().min(0).max(1),
  
  // Engagement
  profileCompleteness: z.number().min(0).max(1),
  lastActiveAt: z.date().nullable(),
  averageDaysToComplete: z.number().nonnegative(),
});

export type InternalAgentMetrics = z.infer<typeof InternalAgentMetricsSchema>;

// =============================================================================
// SCORE HISTORY
// =============================================================================

export const ScoreHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  internalScore: z.number().min(0).max(5),
  publicScore: z.number().min(0).max(5),
  reliabilityTier: z.nativeEnum(ReliabilityTier),
  breakdown: ScoreBreakdownSchema,
  triggeredBy: z.string(),  // Event or action that triggered recalculation
  calculatedAt: z.date(),
});

export type ScoreHistoryEntry = z.infer<typeof ScoreHistoryEntrySchema>;

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createInitialAgentScore(agentId: string): AgentScore {
  const now = new Date();
  
  return {
    id: crypto.randomUUID(),
    agentId,
    internalScore: 0,
    publicScore: 0,
    reliabilityTier: ReliabilityTier.NEW,
    breakdown: {
      reviewScore: 0,
      reviewCount: 0,
      reviewWeight: 0.4,
      completionRate: 0,
      completedBookings: 0,
      acceptedBookings: 0,
      completionWeight: 0.25,
      responseRate: 0,
      averageResponseTimeMinutes: 0,
      responseWeight: 0.2,
      disputeRate: 0,
      disputeCount: 0,
      disputeWeight: 0.15,
    },
    gamingRiskScore: 0,
    isUnderInvestigation: false,
    investigationReason: null,
    lastReviewAt: null,
    scoreDecayApplied: 0,
    visibility: ScoreVisibility.INTERNAL_ONLY,
    visibilityReason: 'Insufficient reviews for public display',
    totalBookings: 0,
    totalReviews: 0,
    positiveReviews: 0,
    neutralReviews: 0,
    negativeReviews: 0,
    calculatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// TIER CALCULATION
// =============================================================================

export function calculateReliabilityTier(
  completedBookings: number,
  internalScore: number,
  isSuspended: boolean
): ReliabilityTier {
  if (isSuspended) return ReliabilityTier.SUSPENDED;
  if (completedBookings < 3) return ReliabilityTier.NEW;
  if (completedBookings >= 200 && internalScore >= 4.5) return ReliabilityTier.PLATINUM;
  if (completedBookings >= 51 && internalScore >= 4.0) return ReliabilityTier.GOLD;
  if (completedBookings >= 11 && internalScore >= 3.5) return ReliabilityTier.SILVER;
  if (internalScore >= 3.0) return ReliabilityTier.BRONZE;
  return ReliabilityTier.NEW;
}

// =============================================================================
// SCORE ROUNDING FOR PUBLIC DISPLAY
// =============================================================================

export function roundToHalf(score: number): number {
  return Math.round(score * 2) / 2;
}

export function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `Usually responds within ${Math.round(minutes)} minutes`;
  if (minutes < 120) return 'Usually responds within an hour';
  if (minutes < 240) return 'Usually responds within a few hours';
  if (minutes < 1440) return 'Usually responds within a day';
  return 'Response time varies';
}
