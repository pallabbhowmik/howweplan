/**
 * Response Time API Routes
 * 
 * HTTP endpoints for agent response time metrics.
 * Safe for public exposure (pre-payment).
 */

import { Hono, Context, Next } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { responseTimeService } from '../services';
import type { ResponseTimeDisplay } from '@tripcomposer/contracts';

// =============================================================================
// SCHEMAS
// =============================================================================

const GetAgentResponseTimeParamsSchema = z.object({
  agentId: z.string().uuid('Invalid agent ID format'),
});

const GetBatchResponseTimeBodySchema = z.object({
  agentIds: z.array(z.string().uuid('Invalid agent ID format')).max(50, 'Maximum 50 agents per request'),
});

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

const responseTimeRoutes = new Hono();

/**
 * GET /response-time/agent/:agentId
 * Get response time metrics for a single agent.
 * 
 * This endpoint is safe for public consumption (pre-payment).
 * Returns aggregate metrics without any identifying information.
 */
responseTimeRoutes.get(
  '/agent/:agentId',
  zValidator('param', GetAgentResponseTimeParamsSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');

    try {
      const metrics = await responseTimeService.getDisplayMetrics(agentId);
      
      return c.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error(`[ResponseTimeAPI] Error getting metrics for agent ${agentId}:`, error);
      return c.json(
        {
          success: false,
          error: 'Failed to retrieve response time metrics',
        },
        500
      );
    }
  }
);

/**
 * POST /response-time/batch
 * Get response time metrics for multiple agents.
 * 
 * Efficient batch endpoint for listing pages.
 * Returns a map of agentId -> metrics.
 */
responseTimeRoutes.post(
  '/batch',
  zValidator('json', GetBatchResponseTimeBodySchema),
  async (c) => {
    const { agentIds } = c.req.valid('json');

    if (agentIds.length === 0) {
      return c.json({
        success: true,
        data: {},
      });
    }

    try {
      const metricsMap = await responseTimeService.getBatchDisplayMetrics(agentIds);
      
      // Convert Map to plain object for JSON response
      const result: Record<string, ResponseTimeDisplay> = {};
      metricsMap.forEach((metrics, agentId) => {
        result[agentId] = metrics;
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[ResponseTimeAPI] Error getting batch metrics:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to retrieve response time metrics',
        },
        500
      );
    }
  }
);

/**
 * GET /response-time/agent/:agentId/detailed
 * Get detailed response time metrics (for agent's own dashboard).
 * 
 * Requires authentication as the agent or admin.
 */
responseTimeRoutes.get(
  '/agent/:agentId/detailed',
  zValidator('param', GetAgentResponseTimeParamsSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');
    const requestUserId = c.req.header('x-user-id');
    const requestUserType = c.req.header('x-user-type');

    // Allow agent to view their own metrics, or admin to view any
    const isOwnMetrics = requestUserId === agentId && requestUserType === 'AGENT';
    const isAdmin = requestUserType === 'ADMIN';

    if (!isOwnMetrics && !isAdmin) {
      return c.json(
        {
          success: false,
          error: 'Forbidden - Can only view your own detailed metrics',
        },
        403
      );
    }

    try {
      const metrics = await responseTimeService.getMetrics(agentId);

      if (!metrics) {
        // Return default metrics for new agents
        return c.json({
          success: true,
          data: {
            agentId,
            totalRequestsReceived: 0,
            totalResponses: 0,
            totalProposals: 0,
            totalDeclined: 0,
            totalExpired: 0,
            responseRate: 0,
            responseTimeP50: null,
            responseTimeP75: null,
            responseTimeP90: null,
            responseTimeAvg: null,
            responseTimeMin: null,
            responseTimeMax: null,
            responseTimeLabel: 'NEW',
            businessHoursP50: null,
            afterHoursP50: null,
            trend: 'STABLE',
            trendChangeMinutes: 0,
            sampleSize: 0,
            lastResponseAt: null,
            lastRecalculatedAt: new Date().toISOString(),
          },
        });
      }

      return c.json({
        success: true,
        data: {
          ...metrics,
          lastResponseAt: metrics.lastResponseAt?.toISOString() || null,
          lastRecalculatedAt: metrics.lastRecalculatedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error(`[ResponseTimeAPI] Error getting detailed metrics for agent ${agentId}:`, error);
      return c.json(
        {
          success: false,
          error: 'Failed to retrieve detailed response time metrics',
        },
        500
      );
    }
  }
);

// =============================================================================
// ADMIN ROUTES
// =============================================================================

const adminRoutes = new Hono();

// Admin middleware
adminRoutes.use('*', async (c, next) => {
  const userType = c.req.header('x-user-type');
  if (userType !== 'ADMIN') {
    return c.json({ success: false, error: 'Forbidden - Admin access required' }, 403);
  }
  return await next();
});

/**
 * POST /response-time/admin/recalculate/:agentId
 * Force recalculation of metrics for an agent.
 */
adminRoutes.post(
  '/recalculate/:agentId',
  zValidator('param', GetAgentResponseTimeParamsSchema),
  async (c) => {
    const { agentId } = c.req.valid('param');

    try {
      const metrics = await responseTimeService.recalculateMetrics(agentId);
      
      return c.json({
        success: true,
        message: 'Metrics recalculated successfully',
        data: {
          agentId: metrics.agentId,
          responseTimeLabel: metrics.responseTimeLabel,
          sampleSize: metrics.sampleSize,
        },
      });
    } catch (error) {
      console.error(`[ResponseTimeAPI] Error recalculating metrics for agent ${agentId}:`, error);
      return c.json(
        {
          success: false,
          error: 'Failed to recalculate metrics',
        },
        500
      );
    }
  }
);

/**
 * POST /response-time/admin/recalculate-batch
 * Force recalculation of metrics for multiple agents.
 */
adminRoutes.post(
  '/recalculate-batch',
  zValidator('json', GetBatchResponseTimeBodySchema),
  async (c) => {
    const { agentIds } = c.req.valid('json');

    let success = 0;
    let failed = 0;

    for (const agentId of agentIds) {
      try {
        await responseTimeService.recalculateMetrics(agentId);
        success++;
      } catch (error) {
        console.error(`[ResponseTimeAPI] Failed to recalculate for agent ${agentId}:`, error);
        failed++;
      }
    }

    return c.json({
      success: true,
      message: `Recalculated metrics for ${success} agents, ${failed} failed`,
      data: { success, failed },
    });
  }
);

// Mount admin routes
responseTimeRoutes.route('/admin', adminRoutes);

// =============================================================================
// EXPORT
// =============================================================================

export { responseTimeRoutes };
export default responseTimeRoutes;
