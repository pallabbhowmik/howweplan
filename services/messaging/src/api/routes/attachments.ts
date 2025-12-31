/**
 * Messaging Service - Attachment Routes
 *
 * API endpoints for file attachments in messages.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  uploadAttachmentSchema,
  getAttachmentSchema,
} from '../schemas';
import { Errors } from '../errors';
import { config } from '../../env';
import type { AttachmentService } from '../../services/attachment.service';
import type { AuthMiddleware } from '../../middleware/auth';

export function createAttachmentRoutes(
  attachmentService: AttachmentService,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  /**
   * POST /attachments/presigned-url
   * Get a presigned URL for uploading an attachment.
   */
  router.post(
    '/presigned-url',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = uploadAttachmentSchema.parse(req.body);
        const actor = req.user!;

        // Validate file size
        if (input.sizeBytes > config.limits.maxAttachmentSize) {
          throw Errors.ATTACHMENT_TOO_LARGE(config.limits.maxAttachmentSize);
        }

        // Validate file type
        if (!config.limits.allowedAttachmentTypes.includes(input.mimeType)) {
          throw Errors.ATTACHMENT_TYPE_NOT_ALLOWED(
            input.mimeType,
            config.limits.allowedAttachmentTypes
          );
        }

        const result = await attachmentService.createPresignedUploadUrl(
          input,
          actor.userId
        );

        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /attachments/:attachmentId/confirm
   * Confirm an attachment upload has completed.
   */
  router.post(
    '/:attachmentId/confirm',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { attachmentId } = getAttachmentSchema.parse(req.params);
        const actor = req.user!;

        const attachment = await attachmentService.confirmUpload(
          attachmentId,
          actor.userId
        );

        res.json({ data: attachment });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /attachments/:attachmentId
   * Get attachment metadata and download URL.
   */
  router.get(
    '/:attachmentId',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { attachmentId } = getAttachmentSchema.parse(req.params);
        const actor = req.user!;

        const attachment = await attachmentService.getAttachment(
          attachmentId,
          actor.userId
        );

        if (!attachment) {
          throw Errors.ATTACHMENT_NOT_FOUND(attachmentId);
        }

        res.json({ data: attachment });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /attachments/:attachmentId/download
   * Get a presigned download URL for an attachment.
   */
  router.get(
    '/:attachmentId/download',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { attachmentId } = getAttachmentSchema.parse(req.params);
        const actor = req.user!;

        const url = await attachmentService.getDownloadUrl(
          attachmentId,
          actor.userId
        );

        res.json({ data: { url } });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
