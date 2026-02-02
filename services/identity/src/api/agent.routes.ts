/**
 * Agent API routes.
 * Handles agent profile and verification management.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  AuthenticatedRequest,
  requireAuth,
  blockSuspended,
  requireAgent,
  validateBody,
  validateParams,
} from '../middleware/index.js';
import {
  getAgentProfile,
  updateAgentProfile,
  submitVerification,
} from '../services/agent.service.js';
import { EventContext } from '../events/index.js';
import { IdentityError, AgentProfileNotFoundError } from '../services/errors.js';
import {
  updateAgentProfileRequestSchema,
  submitVerificationRequestSchema,
  uuidSchema,
} from '../types/api.schemas.js';
import { UserRole, PublicAgentIdentity, FullAgentIdentity, AgentVerificationStatus } from '../types/identity.types.js';
import { getUserById } from '../services/user.service.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an event context from the request.
 */
function createEventContext(req: Request): EventContext {
  const authReq = req as AuthenticatedRequest;
  return {
    correlationId: authReq.correlationId ?? 'unknown',
    actorId: authReq.identity?.sub ?? null,
    actorRole: authReq.identity?.role ?? 'SYSTEM',
  };
}

/**
 * Sends a success response.
 */
function sendSuccess<T>(res: Response, data: T, correlationId: string, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Sends an error response.
 */
function sendError(res: Response, error: IdentityError, correlationId: string): void {
  res.status(error.statusCode).json({
    success: false,
    error: error.toJSON(),
    requestId: correlationId,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAM SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const agentIdParamSchema = z.object({
  agentId: uuidSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /agents/me/profile
 * Get the current agent's profile.
 */
router.get(
  '/me/profile',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const profile = await getAgentProfile(authReq.identity.sub);

      if (!profile) {
        throw new AgentProfileNotFoundError(authReq.identity.sub);
      }

      sendSuccess(
        res,
        {
          userId: profile.userId,
          verificationStatus: profile.verificationStatus,
          verificationSubmittedAt: profile.verificationSubmittedAt?.toISOString() ?? null,
          verificationCompletedAt: profile.verificationCompletedAt?.toISOString() ?? null,
          verificationRejectedReason: profile.verificationRejectedReason,
          businessName: profile.businessName,
          bio: profile.bio,
          specialties: profile.specialties,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * PATCH /agents/me/profile
 * Update the current agent's profile.
 */
router.patch(
  '/me/profile',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(updateAgentProfileRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof updateAgentProfileRequestSchema>;

    try {
      const eventContext = createEventContext(req);
      const profile = await updateAgentProfile(authReq.identity.sub, body, eventContext);

      sendSuccess(
        res,
        {
          userId: profile.userId,
          verificationStatus: profile.verificationStatus,
          businessName: profile.businessName,
          bio: profile.bio,
          specialties: profile.specialties,
          updatedAt: profile.updatedAt.toISOString(),
        },
        authReq.correlationId
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * POST /agents/me/verification
 * Submit verification documents.
 */
router.post(
  '/me/verification',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(submitVerificationRequestSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as z.infer<typeof submitVerificationRequestSchema>;

    try {
      const eventContext = createEventContext(req);
      const profile = await submitVerification(
        authReq.identity.sub,
        body.documentType,
        body.documentUrl,
        body.additionalNotes,
        eventContext
      );

      sendSuccess(
        res,
        {
          userId: profile.userId,
          verificationStatus: profile.verificationStatus,
          verificationSubmittedAt: profile.verificationSubmittedAt?.toISOString() ?? null,
        },
        authReq.correlationId,
        201
      );
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * GET /agents/:agentId/profile
 * Get agent info by their agent profile ID (from agents table).
 * This endpoint is used when the caller has an agent profile ID
 * (e.g., from itineraries/proposals) rather than a user ID.
 */
router.get(
  '/:agentId/profile',
  requireAuth,
  validateParams(agentIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { agentId } = req.params as z.infer<typeof agentIdParamSchema>;

    try {
      const { getAgentByProfileId } = await import('../services/agent.service.js');
      const agentInfo = await getAgentByProfileId(agentId);

      if (!agentInfo) {
        throw new AgentProfileNotFoundError(agentId);
      }

      sendSuccess(res, agentInfo, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * GET /agents/:agentId/public
 * Get public agent identity (first name + photo only).
 * Per business rules: agents are semi-blind pre-confirmation.
 */
router.get(
  '/:agentId/public',
  requireAuth,
  validateParams(agentIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { agentId } = req.params as z.infer<typeof agentIdParamSchema>;

    try {
      const user = await getUserById(agentId);

      if (!user || user.role !== UserRole.AGENT) {
        throw new AgentProfileNotFoundError(agentId);
      }

      const publicIdentity: PublicAgentIdentity = {
        firstName: user.firstName,
        photoUrl: user.photoUrl,
      };

      sendSuccess(res, publicIdentity, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

/**
 * GET /agents/:agentId/full
 * Get full agent identity.
 * Per business rules: full identity revealed after agent confirmation and BEFORE payment.
 * This endpoint should be called by other services after confirming business rules are met.
 */
router.get(
  '/:agentId/full',
  requireAuth,
  validateParams(agentIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { agentId } = req.params as z.infer<typeof agentIdParamSchema>;

    try {
      const user = await getUserById(agentId);

      if (!user || user.role !== UserRole.AGENT) {
        throw new AgentProfileNotFoundError(agentId);
      }

      const profile = await getAgentProfile(agentId);

      // Only verified agents can have full identity revealed
      if (!profile || profile.verificationStatus !== AgentVerificationStatus.VERIFIED) {
        throw new AgentProfileNotFoundError(agentId);
      }

      const fullIdentity: FullAgentIdentity = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        photoUrl: user.photoUrl,
        businessName: profile.businessName,
        bio: profile.bio,
        specialties: profile.specialties,
      };

      sendSuccess(res, fullIdentity, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      throw error;
    }
  }
);

export { router as agentRouter };
