/**
 * Messaging Service - Evidence Export Routes
 *
 * API endpoints for exporting conversation evidence for disputes.
 * BUSINESS RULE: Message retention for disputes.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  exportEvidenceSchema,
  getEvidenceExportSchema,
  adminExportEvidenceSchema,
  getConversationSchema,
} from '../schemas';
import { Errors } from '../errors';
import type { EvidenceService } from '../../services/evidence.service';
import type { AuthMiddleware } from '../../middleware/auth';

export function createEvidenceRoutes(
  evidenceService: EvidenceService,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  /**
   * POST /evidence/export
   * Request an evidence export for a conversation.
   * Available to participants and admins.
   */
  router.post(
    '/export',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = exportEvidenceSchema.parse(req.body);
        const actor = req.user!;

        const exportRecord = await evidenceService.createExport(
          input,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        );

        res.status(201).json({ data: exportRecord });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /evidence/export/:exportId
   * Get an evidence export by ID.
   */
  router.get(
    '/export/:exportId',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { exportId } = getEvidenceExportSchema.parse({
          exportId: req.params['exportId'],
        });
        const actor = req.user!;

        const exportRecord = await evidenceService.getExport(
          exportId,
          actor.userId
        );

        if (!exportRecord) {
          throw Errors.EXPORT_NOT_FOUND(exportId);
        }

        res.json({ data: exportRecord });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /evidence/export/:exportId/download
   * Download an evidence export.
   */
  router.get(
    '/export/:exportId/download',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { exportId } = getEvidenceExportSchema.parse({
          exportId: req.params['exportId'],
        });
        const actor = req.user!;

        const downloadUrl = await evidenceService.getExportDownloadUrl(
          exportId,
          actor.userId
        );

        res.json({ data: { url: downloadUrl } });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /evidence/conversation/:conversationId
   * List all evidence exports for a conversation.
   */
  router.get(
    '/conversation/:conversationId',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { conversationId } = getConversationSchema.parse(req.params);
        const actor = req.user!;

        const exports = await evidenceService.listExportsForConversation(
          conversationId,
          actor.userId
        );

        res.json({ data: exports });
      } catch (error) {
        next(error);
      }
    }
  );

  // ==========================================================================
  // ADMIN ROUTES
  // ==========================================================================

  /**
   * POST /evidence/admin/export
   * Admin evidence export (includes original unmasked content).
   * BUSINESS RULE: All admin actions require reason and are audit-logged.
   */
  router.post(
    '/admin/export',
    authMiddleware.requireAuth,
    authMiddleware.requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = adminExportEvidenceSchema.parse(req.body);
        const actor = req.user!;

        if (!input.reason) {
          throw Errors.ADMIN_REASON_REQUIRED();
        }

        const exportRecord = await evidenceService.createAdminExport(
          input,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        );

        res.status(201).json({ data: exportRecord });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
