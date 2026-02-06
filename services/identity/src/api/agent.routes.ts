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
import * as indiaVerification from '../services/india-verification.service.js';
import { 
  IndiaDocumentType, 
  DOCUMENT_TYPE_INFO, 
  MINIMUM_REQUIRED_DOCUMENTS,
  DocumentCategory,
} from '../types/india-verification.types.js';
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
function sendError(res: Response, error: IdentityError | Error, correlationId: string): void {
  const statusCode = error instanceof IdentityError ? error.statusCode : 500;
  const errorData =
    error instanceof IdentityError
      ? error.toJSON()
      : { code: 'INTERNAL_ERROR', message: error.message };

  res.status(statusCode).json({
    success: false,
    error: errorData,
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
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
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// BATCH ENDPOINT - Optimized for multiple agent lookups
// ─────────────────────────────────────────────────────────────────────────────

const batchAgentsSchema = z.object({
  agentIds: z.array(uuidSchema).min(1).max(50),
});

/**
 * POST /agents/batch
 * Get multiple agent profiles in a single request.
 * 
 * This batch endpoint reduces N+1 API calls when fetching multiple agents.
 * Time complexity: O(n) with single database round trip using IN clause.
 * 
 * Request body: { agentIds: string[] }
 * Response: { agents: Record<string, AgentProfile>, notFound: string[] }
 */
router.post(
  '/batch',
  requireAuth,
  validateBody(batchAgentsSchema),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { agentIds } = req.body as z.infer<typeof batchAgentsSchema>;

    try {
      const { getAgentsByProfileIds } = await import('../services/agent.service.js');
      const { agents, notFound } = await getAgentsByProfileIds(agentIds);

      sendSuccess(res, { agents, notFound }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT VERIFICATION ROUTES (India Compliance)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /agents/me/verification/documents
 * Get all uploaded documents for the current agent.
 */
router.get(
  '/me/verification/documents',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const documents = await indiaVerification.getDocuments(authReq.identity.sub);
      const progress = await indiaVerification.getVerificationProgress(authReq.identity.sub);
      
      sendSuccess(res, { documents, progress }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * GET /agents/me/verification/document-types
 * Get all available document types with metadata.
 */
router.get(
  '/me/verification/document-types',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    // Group document types by category
    const groupedTypes: Record<DocumentCategory, typeof DOCUMENT_TYPE_INFO[IndiaDocumentType][]> = {
      [DocumentCategory.IDENTITY]: [],
      [DocumentCategory.BUSINESS]: [],
      [DocumentCategory.PROFESSIONAL]: [],
      [DocumentCategory.FINANCIAL]: [],
      [DocumentCategory.ADDRESS]: [],
      [DocumentCategory.ADDITIONAL]: [],
    };

    for (const [, info] of Object.entries(DOCUMENT_TYPE_INFO)) {
      groupedTypes[info.category].push(info);
    }

    sendSuccess(res, {
      documentTypes: DOCUMENT_TYPE_INFO,
      groupedTypes,
      requiredDocuments: MINIMUM_REQUIRED_DOCUMENTS,
    }, authReq.correlationId);
  }
);

/**
 * POST /agents/me/verification/documents
 * Upload a verification document.
 */
router.post(
  '/me/verification/documents',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(z.object({
    documentType: z.string(),
    documentUrl: z.string().url(),
    fileName: z.string(),
    fileSize: z.number().positive(),
    mimeType: z.string(),
    extractedData: z.record(z.string()).optional(),
  })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body;

    try {
      // Validate document type
      if (!DOCUMENT_TYPE_INFO[body.documentType as IndiaDocumentType]) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_DOCUMENT_TYPE', message: 'Invalid document type' },
          requestId: authReq.correlationId,
        });
        return;
      }

      const document = await indiaVerification.uploadDocument(
        authReq.identity.sub,
        body.documentType as IndiaDocumentType,
        body.documentUrl,
        body.fileName,
        body.fileSize,
        body.mimeType,
        body.extractedData
      );

      sendSuccess(res, document, authReq.correlationId, 201);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      console.error('Document upload error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: error instanceof Error ? error.message : 'Upload failed' },
        requestId: authReq.correlationId,
      });
    }
  }
);

/**
 * DELETE /agents/me/verification/documents/:documentId
 * Delete a verification document (only if not approved).
 */
router.delete(
  '/me/verification/documents/:documentId',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateParams(z.object({ documentId: z.string().uuid() })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { documentId } = req.params as { documentId: string };

    try {
      await indiaVerification.deleteDocument(authReq.identity!.sub, documentId);
      sendSuccess(res, { deleted: true }, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      res.status(400).json({
        success: false,
        error: { code: 'DELETE_FAILED', message: error instanceof Error ? error.message : 'Delete failed' },
        requestId: authReq.correlationId,
      });
    }
  }
);

/**
 * POST /agents/me/verification/submit
 * Submit all documents for review.
 */
router.post(
  '/me/verification/submit',
  requireAuth,
  requireAgent,
  blockSuspended,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const eventContext = createEventContext(req);
      await indiaVerification.submitForReview(authReq.identity.sub, eventContext);
      
      const progress = await indiaVerification.getVerificationProgress(authReq.identity.sub);
      sendSuccess(res, { submitted: true, progress }, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      res.status(400).json({
        success: false,
        error: { code: 'SUBMIT_FAILED', message: error instanceof Error ? error.message : 'Submit failed' },
        requestId: authReq.correlationId,
      });
    }
  }
);

/**
 * GET /agents/me/verification/comments
 * Get all verification comments/notifications.
 */
router.get(
  '/me/verification/comments',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const comments = await indiaVerification.getAllComments(authReq.identity.sub);
      const unreadCount = comments.filter(c => !c.isRead).length;
      
      sendSuccess(res, { comments, unreadCount }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * GET /agents/me/verification/comments/unread
 * Get unread verification comments/notifications.
 */
router.get(
  '/me/verification/comments/unread',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const comments = await indiaVerification.getUnreadComments(authReq.identity.sub);
      
      sendSuccess(res, { comments, count: comments.length }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * POST /agents/me/verification/comments/:commentId/read
 * Mark a comment as read.
 */
router.post(
  '/me/verification/comments/:commentId/read',
  requireAuth,
  requireAgent,
  validateParams(z.object({ commentId: z.string().uuid() })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { commentId } = req.params as { commentId: string };

    try {
      await indiaVerification.markCommentAsRead(authReq.identity!.sub, commentId);
      sendSuccess(res, { marked: true }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * POST /agents/me/verification/comments/read-all
 * Mark all comments as read.
 */
router.post(
  '/me/verification/comments/read-all',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      await indiaVerification.markAllCommentsAsRead(authReq.identity.sub);
      sendSuccess(res, { marked: true }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * GET /agents/me/verification/profile
 * Get verification profile with business info.
 */
router.get(
  '/me/verification/profile',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      // First get or create verification profile
      const { getAgentIdForUser } = await import('../services/agent.service.js');
      const agentId = await getAgentIdForUser(authReq.identity.sub);
      
      if (!agentId) {
        res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent profile not found' },
          requestId: authReq.correlationId,
        });
        return;
      }

      const profile = await indiaVerification.getOrCreateVerificationProfile(authReq.identity.sub, agentId);
      sendSuccess(res, profile, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

/**
 * PATCH /agents/me/verification/profile
 * Update verification profile business info.
 */
router.patch(
  '/me/verification/profile',
  requireAuth,
  requireAgent,
  blockSuspended,
  validateBody(z.object({
    businessType: z.enum(['INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'LLP', 'PUBLIC_LIMITED']).optional(),
    businessName: z.string().max(255).optional(),
    businessAddress: z.string().max(500).optional(),
    businessCity: z.string().max(100).optional(),
    businessState: z.string().max(100).optional(),
    businessPincode: z.string().max(10).optional(),
    primaryPhone: z.string().max(20).optional(),
    secondaryPhone: z.string().max(20).optional(),
    whatsappNumber: z.string().max(20).optional(),
    businessEmail: z.string().email().max(255).optional(),
    websiteUrl: z.string().url().max(255).optional(),
    panNumber: z.string().length(10).optional(),
    gstin: z.string().length(15).optional(),
    iataNumber: z.string().max(20).optional(),
  })),
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      const profile = await indiaVerification.updateBusinessInfo(authReq.identity.sub, req.body);
      sendSuccess(res, profile, authReq.correlationId);
    } catch (error) {
      if (error instanceof IdentityError) {
        sendError(res, error, authReq.correlationId);
        return;
      }
      res.status(400).json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: error instanceof Error ? error.message : 'Update failed' },
        requestId: authReq.correlationId,
      });
    }
  }
);

/**
 * POST /agents/me/verification/first-login-shown
 * Mark first login verification prompt as shown.
 */
router.post(
  '/me/verification/first-login-shown',
  requireAuth,
  requireAgent,
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    try {
      await indiaVerification.markFirstLoginPromptShown(authReq.identity.sub);
      sendSuccess(res, { marked: true }, authReq.correlationId);
    } catch (error) {
      sendError(res, error instanceof Error ? error : new Error(String(error)), authReq.correlationId);
    }
  }
);

export { router as agentRouter };
