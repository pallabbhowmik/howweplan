/**
 * Ratings API Routes
 * 
 * HTTP endpoints for agent ratings and scores.
 */

import { Hono, Context, Next } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { scoreCalculatorService } from '../services';
import { agentScoreRepository, auditRepository } from '../repositories';
import { ReliabilityTier, ScoreVisibility, AuditEventType, AuditActorType, createAuditEvent, validateAdminAuditEvent } from '../models';
import {
  GetAgentRatingParamsSchema,
  OverrideAgentTierRequestSchema,
  AdjustAgentScoreRequestSchema,
  ChangeScoreVisibilityRequestSchema,
  GetScoreHistoryQuerySchema,
  GetTopAgentsQuerySchema,
  TIER_BADGES,
} from '../schemas';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface AuthContext {
  userId: string;
  userType: 'TRAVELER' | 'AGENT' | 'ADMIN';
}

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

function getAuthContext(c: Context): AuthContext | null {
  const userId = c.req.header('x-user-id');
  const userType = c.req.header('x-user-type') as 'TRAVELER' | 'AGENT' | 'ADMIN' | undefined;

  if (!userId || !userType) return null;
  return { userId, userType };
}

async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const auth = getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
}

async function requireAdmin(c: Context, next: Next): Promise<Response | void> {
  const auth = getAuthContext(c);
  if (!auth || auth.userType !== 'ADMIN') {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }
  await next();
}

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

const publicRoutes = new Hono();

/**
 * GET /ratings/agent/:agentId
 * Get public rating for an agent
 */
publicRoutes.get(
  '/agent/:agentId',
  zValidator('param', GetAgentRatingParamsSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');

    const publicRating = await scoreCalculatorService.getPublicRating(agentId);

    if (!publicRating) {
      // Return minimal info if no public rating available
      return c.json({
        agentId,
        overallRating: null,
        reviewCount: 0,
        reliabilityTier: ReliabilityTier.NEW,
        tierBadge: TIER_BADGES[ReliabilityTier.NEW],
        categoryRatings: {
          communication: null,
          accuracy: null,
          value: null,
          responsiveness: null,
        },
        responseTime: null,
        highlightStats: {
          completedTrips: 0,
          repeatTravelers: 0,
          yearsActive: 0,
        },
        lastUpdatedAt: new Date(),
      });
    }

    return c.json({
      ...publicRating,
      tierBadge: TIER_BADGES[publicRating.reliabilityTier],
      highlightStats: {
        completedTrips: 0,  // Would be populated from booking data
        repeatTravelers: 0,
        yearsActive: 0,
      },
    });
  }
);

/**
 * GET /ratings/top-agents
 * Get top rated agents
 */
publicRoutes.get(
  '/top-agents',
  zValidator('query', GetTopAgentsQuerySchema),
  async (c) => {
    const { tier, limit } = c.req.valid('query');

    const topAgents = await agentScoreRepository.getTopAgents({ tier, limit });

    const result = topAgents.map((score, index) => ({
      rank: index + 1,
      agentId: score.agentId,
      displayName: 'Agent',  // Would be fetched from users service
      avatarUrl: null,
      overallRating: score.publicScore,
      reviewCount: score.totalReviews,
      reliabilityTier: score.reliabilityTier,
      tierBadge: TIER_BADGES[score.reliabilityTier],
      specialties: [],  // Would be fetched from agent profile
    }));

    return c.json({ topAgents: result });
  }
);

/**
 * GET /ratings/tiers
 * Get information about reliability tiers
 */
publicRoutes.get('/tiers', (c) => {
  const tiers = Object.entries(TIER_BADGES).map(([tier, badge]) => ({
    tier,
    ...badge,
    requirements: getTierRequirements(tier as ReliabilityTier),
  }));

  return c.json({ tiers });
});

// =============================================================================
// AGENT ROUTES
// =============================================================================

const agentRoutes = new Hono();

agentRoutes.use('*', requireAuth);

/**
 * GET /ratings/my
 * Get current agent's own rating details
 */
agentRoutes.get('/my', async (c) => {
  const auth = getAuthContext(c)!;

  if (auth.userType !== 'AGENT') {
    return c.json({ error: 'Only agents can access their own ratings' }, 403);
  }

  const score = await agentScoreRepository.findByAgentId(auth.userId);

  if (!score) {
    return c.json({
      message: 'No rating data available yet',
      reliabilityTier: ReliabilityTier.NEW,
      totalReviews: 0,
    });
  }

  // Return more details than public view, but not full internal metrics
  return c.json({
    publicScore: score.publicScore,
    reliabilityTier: score.reliabilityTier,
    tierBadge: TIER_BADGES[score.reliabilityTier],
    visibility: score.visibility,
    visibilityReason: score.visibilityReason,
    totalReviews: score.totalReviews,
    positiveReviews: score.positiveReviews,
    neutralReviews: score.neutralReviews,
    negativeReviews: score.negativeReviews,
    breakdown: {
      reviewScore: score.breakdown.reviewScore,
      completionRate: score.breakdown.completionRate,
      responseRate: score.breakdown.responseRate,
      disputeRate: score.breakdown.disputeRate,
    },
    lastReviewAt: score.lastReviewAt,
    calculatedAt: score.calculatedAt,
  });
});

/**
 * GET /ratings/my/history
 * Get agent's score history
 */
agentRoutes.get(
  '/my/history',
  zValidator('query', z.object({
    limit: z.coerce.number().positive().max(100).default(30),
  })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { limit } = c.req.valid('query');

    if (auth.userType !== 'AGENT') {
      return c.json({ error: 'Only agents can access their own history' }, 403);
    }

    const history = await agentScoreRepository.getHistory(auth.userId, { limit });

    return c.json({
      history: history.map(entry => ({
        calculatedAt: entry.calculatedAt,
        publicScore: entry.publicScore,
        reliabilityTier: entry.reliabilityTier,
        triggeredBy: entry.triggeredBy,
      })),
    });
  }
);

// =============================================================================
// ADMIN ROUTES
// =============================================================================

const adminRoutes = new Hono();

adminRoutes.use('*', requireAdmin);

/**
 * GET /ratings/admin/agent/:agentId
 * Get full internal metrics for an agent (admin view)
 */
adminRoutes.get(
  '/agent/:agentId',
  zValidator('param', GetAgentRatingParamsSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');

    const score = await agentScoreRepository.findByAgentId(agentId);

    if (!score) {
      return c.json({ error: 'No score data found for agent' }, 404);
    }

    // Get audit trail
    const auditTrail = await auditRepository.getAgentScoreAuditTrail(agentId);

    return c.json({
      score,
      auditTrail,
    });
  }
);

/**
 * GET /ratings/admin/agent/:agentId/history
 * Get full score history for an agent
 */
adminRoutes.get(
  '/agent/:agentId/history',
  zValidator('param', GetAgentRatingParamsSchema),
  zValidator('query', GetScoreHistoryQuerySchema.omit({ agentId: true })),
  async (c) => {
    const { agentId } = c.req.valid('param');
    const { fromDate, toDate, limit } = c.req.valid('query');

    const history = await agentScoreRepository.getHistory(agentId, {
      fromDate,
      toDate,
      limit,
    });

    return c.json({ history });
  }
);

/**
 * POST /ratings/admin/agent/:agentId/adjust
 * Manually adjust an agent's score
 */
adminRoutes.post(
  '/agent/:agentId/adjust',
  zValidator('param', GetAgentRatingParamsSchema),
  zValidator('json', AdjustAgentScoreRequestSchema.omit({ agentId: true })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { agentId } = c.req.valid('param');
    const { adjustment, reason, component } = c.req.valid('json');

    const previousScore = await agentScoreRepository.findByAgentId(agentId);

    if (!previousScore) {
      return c.json({ error: 'No score data found for agent' }, 404);
    }

    const updatedScore = await scoreCalculatorService.adjustScore(
      agentId,
      adjustment,
      component
    );

    // Record audit event
    const auditEvent = createAuditEvent({
      eventType: AuditEventType.ADMIN_SCORE_ADJUSTMENT,
      actorType: AuditActorType.ADMIN,
      actorId: auth.userId,
      targetType: 'AGENT_SCORE',
      targetId: previousScore.id,
      agentId,
      previousState: { internalScore: previousScore.internalScore },
      newState: { internalScore: updatedScore.internalScore },
      adminReason: reason,
      metadata: { adjustment, component },
    });

    validateAdminAuditEvent(auditEvent);
    await auditRepository.record(auditEvent);

    return c.json(updatedScore);
  }
);

/**
 * POST /ratings/admin/agent/:agentId/tier-override
 * Override an agent's reliability tier
 */
adminRoutes.post(
  '/agent/:agentId/tier-override',
  zValidator('param', GetAgentRatingParamsSchema),
  zValidator('json', OverrideAgentTierRequestSchema.omit({ agentId: true })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { agentId } = c.req.valid('param');
    const { newTier, reason } = c.req.valid('json');

    const previousScore = await agentScoreRepository.findByAgentId(agentId);

    if (!previousScore) {
      return c.json({ error: 'No score data found for agent' }, 404);
    }

    const updatedScore = await scoreCalculatorService.overrideTier(agentId, newTier);

    // Record audit events
    const auditEvent = createAuditEvent({
      eventType: AuditEventType.ADMIN_TIER_OVERRIDE,
      actorType: AuditActorType.ADMIN,
      actorId: auth.userId,
      targetType: 'AGENT_SCORE',
      targetId: previousScore.id,
      agentId,
      previousState: { reliabilityTier: previousScore.reliabilityTier },
      newState: { reliabilityTier: newTier },
      adminReason: reason,
    });

    validateAdminAuditEvent(auditEvent);
    await auditRepository.record(auditEvent);

    // Also emit tier changed event
    await auditRepository.record(createAuditEvent({
      eventType: AuditEventType.AGENT_TIER_CHANGED,
      actorType: AuditActorType.ADMIN,
      actorId: auth.userId,
      targetType: 'AGENT_SCORE',
      targetId: previousScore.id,
      agentId,
      previousState: { tier: previousScore.reliabilityTier },
      newState: { tier: newTier },
      adminReason: reason,
    }));

    return c.json(updatedScore);
  }
);

/**
 * POST /ratings/admin/agent/:agentId/visibility
 * Change score visibility
 */
adminRoutes.post(
  '/agent/:agentId/visibility',
  zValidator('param', GetAgentRatingParamsSchema),
  zValidator('json', ChangeScoreVisibilityRequestSchema.omit({ agentId: true })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { agentId } = c.req.valid('param');
    const { visibility, reason } = c.req.valid('json');

    const previousScore = await agentScoreRepository.findByAgentId(agentId);

    if (!previousScore) {
      return c.json({ error: 'No score data found for agent' }, 404);
    }

    const updatedScore = await agentScoreRepository.updateVisibility(
      agentId,
      visibility,
      reason
    );

    // Record audit event
    const auditEvent = createAuditEvent({
      eventType: AuditEventType.AGENT_VISIBILITY_CHANGED,
      actorType: AuditActorType.ADMIN,
      actorId: auth.userId,
      targetType: 'AGENT_SCORE',
      targetId: previousScore.id,
      agentId,
      previousState: { visibility: previousScore.visibility },
      newState: { visibility },
      adminReason: reason,
    });

    validateAdminAuditEvent(auditEvent);
    await auditRepository.record(auditEvent);

    return c.json(updatedScore);
  }
);

/**
 * GET /ratings/admin/under-investigation
 * Get agents currently under investigation
 */
adminRoutes.get('/under-investigation', async (c) => {
  const agents = await agentScoreRepository.findUnderInvestigation();

  return c.json({
    agents: agents.map(score => ({
      agentId: score.agentId,
      gamingRiskScore: score.gamingRiskScore,
      investigationReason: score.investigationReason,
      currentTier: score.reliabilityTier,
      totalReviews: score.totalReviews,
    })),
  });
});

/**
 * POST /ratings/admin/agent/:agentId/investigate
 * Start investigation on an agent
 */
adminRoutes.post(
  '/agent/:agentId/investigate',
  zValidator('param', GetAgentRatingParamsSchema),
  zValidator('json', z.object({
    reason: z.string().min(10).max(500),
  })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { agentId } = c.req.valid('param');
    const { reason } = c.req.valid('json');

    const updatedScore = await agentScoreRepository.startInvestigation(agentId, reason);

    // Record audit event
    const auditEvent = createAuditEvent({
      eventType: AuditEventType.GAMING_INVESTIGATION_STARTED,
      actorType: AuditActorType.ADMIN,
      actorId: auth.userId,
      targetType: 'AGENT_SCORE',
      targetId: updatedScore.id,
      agentId,
      newState: { isUnderInvestigation: true },
      adminReason: reason,
    });

    validateAdminAuditEvent(auditEvent);
    await auditRepository.record(auditEvent);

    return c.json(updatedScore);
  }
);

/**
 * POST /ratings/admin/agent/:agentId/end-investigation
 * End investigation on an agent
 */
adminRoutes.post(
  '/agent/:agentId/end-investigation',
  zValidator('param', GetAgentRatingParamsSchema),
  zValidator('json', z.object({
    outcome: z.enum(['CLEARED', 'WARNED', 'SUSPENDED']),
    reason: z.string().min(10).max(500),
  })),
  async (c) => {
    const auth = getAuthContext(c)!;
    const { agentId } = c.req.valid('param');
    const { outcome, reason } = c.req.valid('json');

    const previousScore = await agentScoreRepository.findByAgentId(agentId);

    if (!previousScore) {
      return c.json({ error: 'No score data found for agent' }, 404);
    }

    let updatedScore = await agentScoreRepository.endInvestigation(agentId);

    // If suspended, update tier
    if (outcome === 'SUSPENDED') {
      updatedScore = await agentScoreRepository.update(agentId, {
        reliabilityTier: ReliabilityTier.SUSPENDED,
        visibility: ScoreVisibility.INTERNAL_ONLY,
        visibilityReason: 'Account suspended due to gaming investigation',
      });
    }

    // Record audit event
    const auditEvent = createAuditEvent({
      eventType: AuditEventType.GAMING_INVESTIGATION_COMPLETED,
      actorType: AuditActorType.ADMIN,
      actorId: auth.userId,
      targetType: 'AGENT_SCORE',
      targetId: previousScore.id,
      agentId,
      previousState: { isUnderInvestigation: true },
      newState: { isUnderInvestigation: false, outcome },
      adminReason: reason,
      metadata: { outcome },
    });

    validateAdminAuditEvent(auditEvent);
    await auditRepository.record(auditEvent);

    return c.json(updatedScore);
  }
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getTierRequirements(tier: ReliabilityTier): string {
  switch (tier) {
    case ReliabilityTier.NEW:
      return 'New agents with fewer than 3 completed bookings';
    case ReliabilityTier.BRONZE:
      return '3+ bookings with rating ≥ 3.0';
    case ReliabilityTier.SILVER:
      return '11+ bookings with rating ≥ 3.5';
    case ReliabilityTier.GOLD:
      return '51+ bookings with rating ≥ 4.0';
    case ReliabilityTier.PLATINUM:
      return '200+ bookings with rating ≥ 4.5';
    case ReliabilityTier.SUSPENDED:
      return 'Account under review';
    default:
      return '';
  }
}

// =============================================================================
// EXPORT COMBINED ROUTER
// =============================================================================

export const ratingsApi = new Hono()
  .route('/public', publicRoutes)
  .route('/agent', agentRoutes)
  .route('/admin', adminRoutes);
