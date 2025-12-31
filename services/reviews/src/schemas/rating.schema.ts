/**
 * Rating API Schemas
 * 
 * Input/output validation schemas for rating and score-related API endpoints.
 */

import { z } from 'zod';
import { ReliabilityTier, ScoreVisibility } from '../models';

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Get agent's public rating
 */
export const GetAgentRatingParamsSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
});

export type GetAgentRatingParams = z.infer<typeof GetAgentRatingParamsSchema>;

/**
 * Admin: Get agent's internal metrics
 */
export const GetAgentMetricsParamsSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
});

export type GetAgentMetricsParams = z.infer<typeof GetAgentMetricsParamsSchema>;

/**
 * Admin: Override agent's tier
 */
export const OverrideAgentTierRequestSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
  newTier: z.nativeEnum(ReliabilityTier),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
  expiresAt: z.coerce.date().optional(),  // Optional: auto-revert after date
});

export type OverrideAgentTierRequest = z.infer<typeof OverrideAgentTierRequestSchema>;

/**
 * Admin: Adjust agent's score
 */
export const AdjustAgentScoreRequestSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
  adjustment: z.number().min(-2).max(2),  // Max +/- 2 point adjustment
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
  component: z.enum(['REVIEW', 'COMPLETION', 'RESPONSE', 'DISPUTE']).optional(),
});

export type AdjustAgentScoreRequest = z.infer<typeof AdjustAgentScoreRequestSchema>;

/**
 * Admin: Change score visibility
 */
export const ChangeScoreVisibilityRequestSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
  visibility: z.nativeEnum(ScoreVisibility),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export type ChangeScoreVisibilityRequest = z.infer<typeof ChangeScoreVisibilityRequestSchema>;

/**
 * Get leaderboard / top agents
 */
export const GetTopAgentsQuerySchema = z.object({
  tier: z.nativeEnum(ReliabilityTier).optional(),
  specialty: z.string().optional(),  // e.g., "Europe", "Adventure"
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type GetTopAgentsQuery = z.infer<typeof GetTopAgentsQuerySchema>;

/**
 * Get score history
 */
export const GetScoreHistoryQuerySchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

export type GetScoreHistoryQuery = z.infer<typeof GetScoreHistoryQuerySchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Public agent rating (visible to travelers)
 */
export const PublicAgentRatingResponseSchema = z.object({
  agentId: z.string().uuid(),
  overallRating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  reliabilityTier: z.nativeEnum(ReliabilityTier),
  tierBadge: z.object({
    name: z.string(),
    icon: z.string(),
    color: z.string(),
  }),
  categoryRatings: z.object({
    communication: z.number().min(0).max(5).nullable(),
    accuracy: z.number().min(0).max(5).nullable(),
    value: z.number().min(0).max(5).nullable(),
    responsiveness: z.number().min(0).max(5).nullable(),
  }),
  responseTime: z.string().nullable(),
  highlightStats: z.object({
    completedTrips: z.number().int().nonnegative(),
    repeatTravelers: z.number().int().nonnegative(),
    yearsActive: z.number().nonnegative(),
  }),
  lastUpdatedAt: z.date(),
});

export type PublicAgentRatingResponse = z.infer<typeof PublicAgentRatingResponseSchema>;

/**
 * Admin: Internal agent metrics
 */
export const InternalAgentMetricsResponseSchema = z.object({
  agentId: z.string().uuid(),
  
  // Scores
  internalScore: z.number().min(0).max(5),
  publicScore: z.number().min(0).max(5),
  reliabilityTier: z.nativeEnum(ReliabilityTier),
  visibility: z.nativeEnum(ScoreVisibility),
  
  // Score breakdown
  breakdown: z.object({
    reviewScore: z.number(),
    reviewCount: z.number(),
    completionRate: z.number(),
    completedBookings: z.number(),
    acceptedBookings: z.number(),
    responseRate: z.number(),
    averageResponseTimeMinutes: z.number(),
    disputeRate: z.number(),
    disputeCount: z.number(),
  }),
  
  // Gaming indicators
  gamingRiskScore: z.number(),
  isUnderInvestigation: z.boolean(),
  investigationReason: z.string().nullable(),
  
  // Financial metrics
  financialMetrics: z.object({
    totalRevenue: z.number(),
    averageBookingValue: z.number(),
    platformCommissionEarned: z.number(),
    refundRate: z.number(),
    cancellationRate: z.number(),
  }),
  
  // Risk indicators
  riskIndicators: z.object({
    offPlatformLeakageRisk: z.number(),
    pricingAnomalyScore: z.number(),
  }),
  
  // Review breakdown
  reviewStats: z.object({
    total: z.number(),
    positive: z.number(),
    neutral: z.number(),
    negative: z.number(),
  }),
  
  // Timestamps
  lastReviewAt: z.date().nullable(),
  lastActiveAt: z.date().nullable(),
  scoreCalculatedAt: z.date(),
});

export type InternalAgentMetricsResponse = z.infer<typeof InternalAgentMetricsResponseSchema>;

/**
 * Score history entry
 */
export const ScoreHistoryEntryResponseSchema = z.object({
  calculatedAt: z.date(),
  internalScore: z.number(),
  publicScore: z.number(),
  reliabilityTier: z.nativeEnum(ReliabilityTier),
  triggeredBy: z.string(),
  changeFromPrevious: z.number().nullable(),
});

export type ScoreHistoryEntryResponse = z.infer<typeof ScoreHistoryEntryResponseSchema>;

/**
 * Top agents list entry
 */
export const TopAgentEntryResponseSchema = z.object({
  rank: z.number().int().positive(),
  agentId: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
  overallRating: z.number(),
  reviewCount: z.number(),
  reliabilityTier: z.nativeEnum(ReliabilityTier),
  specialties: z.array(z.string()),
});

export type TopAgentEntryResponse = z.infer<typeof TopAgentEntryResponseSchema>;

// =============================================================================
// TIER BADGE DEFINITIONS
// =============================================================================

export const TIER_BADGES: Record<ReliabilityTier, { name: string; icon: string; color: string }> = {
  [ReliabilityTier.NEW]: { name: 'New Agent', icon: '🌱', color: '#9CA3AF' },
  [ReliabilityTier.BRONZE]: { name: 'Bronze', icon: '🥉', color: '#CD7F32' },
  [ReliabilityTier.SILVER]: { name: 'Silver', icon: '🥈', color: '#C0C0C0' },
  [ReliabilityTier.GOLD]: { name: 'Gold', icon: '🥇', color: '#FFD700' },
  [ReliabilityTier.PLATINUM]: { name: 'Platinum', icon: '💎', color: '#E5E4E2' },
  [ReliabilityTier.SUSPENDED]: { name: 'Suspended', icon: '⚠️', color: '#EF4444' },
};
