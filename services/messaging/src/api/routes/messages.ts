/**
 * Messaging Service - Message Routes
 *
 * API endpoints for sending and managing messages.
 * BUSINESS RULE: No direct contact pre-payment (content is masked).
 * BUSINESS RULE: All messages are auditable.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  getMessagesSchema,
  getMessageSchema,
  markMessagesReadSchema,
  addReactionSchema,
  removeReactionSchema,
  adminDeleteMessageSchema,
} from '../schemas';
import { Errors } from '../errors';
import type { MessageService } from '../../services/message.service';
import type { AuthMiddleware } from '../../middleware/auth';

export function createMessageRoutes(
  messageService: MessageService,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  /**
   * POST /messages
   * Send a new message to a conversation.
   * Content will be automatically masked if contacts are not revealed.
   */
  router.post(
    '/',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = sendMessageSchema.parse(req.body);
        const actor = req.user!;

        const message = await messageService.sendMessage(
          input,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        );

        res.status(201).json({ data: message });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /messages
   * Get messages in a conversation with pagination.
   */
  router.get(
    '/',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = getMessagesSchema.parse(req.query);
        const actor = req.user!;

        const result = await messageService.getMessages(
          input.conversationId,
          actor.userId,
          input.pagination
        );

        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /messages/:messageId
   * Get a specific message.
   */
  router.get(
    '/:messageId',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { messageId } = getMessageSchema.parse(req.params);
        const actor = req.user!;

        const message = await messageService.getMessage(messageId, actor.userId);

        if (!message) {
          throw Errors.MESSAGE_NOT_FOUND(messageId);
        }

        res.json({ data: message });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PATCH /messages/:messageId
   * Edit a message (only sender can edit, within time limit).
   */
  router.patch(
    '/:messageId',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { messageId } = getMessageSchema.parse(req.params);
        const input = editMessageSchema.parse({ ...req.body, messageId });
        const actor = req.user!;

        const message = await messageService.editMessage(
          input,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        );

        res.json({ data: message });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * DELETE /messages/:messageId
   * Soft delete a message (for audit trail).
   */
  router.delete(
    '/:messageId',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { messageId } = getMessageSchema.parse(req.params);
        const input = deleteMessageSchema.parse({ ...req.body, messageId });
        const actor = req.user!;

        await messageService.deleteMessage(
          input,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        );

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /messages/read
   * Mark messages as read.
   */
  router.post(
    '/read',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = markMessagesReadSchema.parse(req.body);
        const actor = req.user!;

        await messageService.markMessagesRead(
          input.conversationId,
          input.messageIds,
          actor.userId
        );

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /messages/:messageId/reactions
   * Add a reaction to a message.
   */
  router.post(
    '/:messageId/reactions',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { messageId } = getMessageSchema.parse(req.params);
        const input = addReactionSchema.parse({ ...req.body, messageId });
        const actor = req.user!;

        await messageService.addReaction(
          input.messageId,
          input.emoji,
          actor.userId
        );

        res.status(201).send();
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * DELETE /messages/:messageId/reactions/:emoji
   * Remove a reaction from a message.
   */
  router.delete(
    '/:messageId/reactions/:emoji',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = removeReactionSchema.parse(req.params);
        const actor = req.user!;

        await messageService.removeReaction(
          params.messageId,
          params.emoji,
          actor.userId
        );

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  // ==========================================================================
  // ADMIN ROUTES
  // ==========================================================================

  /**
   * DELETE /messages/:messageId/admin
   * Admin delete a message.
   * BUSINESS RULE: All admin actions require reason and are audit-logged.
   */
  router.delete(
    '/:messageId/admin',
    authMiddleware.requireAuth,
    authMiddleware.requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { messageId } = getMessageSchema.parse(req.params);
        const input = adminDeleteMessageSchema.parse({ ...req.body, messageId });
        const actor = req.user!;

        if (!input.reason) {
          throw Errors.ADMIN_REASON_REQUIRED();
        }

        await messageService.adminDeleteMessage(
          input,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        );

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
