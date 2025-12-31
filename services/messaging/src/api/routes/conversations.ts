/**
 * Messaging Service - Conversation Routes
 *
 * API endpoints for conversation management.
 * BUSINESS RULE: Platform chat is mandatory before payment.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  createConversationSchema,
  updateConversationStateSchema,
  getConversationSchema,
  listConversationsSchema,
  adminUpdateConversationSchema,
} from '../schemas';
import { Errors } from '../errors';
import type { ConversationService } from '../../services/conversation.service';
import type { AuthMiddleware } from '../../middleware/auth';

export function createConversationRoutes(
  conversationService: ConversationService,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  /**
   * POST /conversations
   * Create a new conversation between a user and agent.
   */
  router.post(
    '/',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = createConversationSchema.parse(req.body);
        const actor = req.user!;

        // Verify actor is either the user or agent in the conversation
        if (actor.userId !== input.userId && actor.userId !== input.agentId) {
          throw Errors.FORBIDDEN('You can only create conversations you are part of');
        }

        const conversation = await conversationService.createConversation(
          input,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        );

        res.status(201).json({ data: conversation });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /conversations
   * List conversations for the authenticated user.
   */
  router.get(
    '/',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = listConversationsSchema.parse(req.query);
        const actor = req.user!;

        // Users can only list their own conversations
        const filters = {
          ...input,
          userId: actor.userType === 'USER' ? actor.userId : input.userId,
          agentId: actor.userType === 'AGENT' ? actor.userId : input.agentId,
        };

        const result = await conversationService.listConversations(
          filters,
          input.pagination
        );

        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /conversations/:conversationId
   * Get a specific conversation.
   */
  router.get(
    '/:conversationId',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { conversationId } = getConversationSchema.parse(req.params);
        const actor = req.user!;

        const conversation = await conversationService.getConversation(
          conversationId,
          actor.userId
        );

        if (!conversation) {
          throw Errors.CONVERSATION_NOT_FOUND(conversationId);
        }

        res.json({ data: conversation });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PATCH /conversations/:conversationId/state
   * Update conversation state (close, pause, etc.)
   */
  router.patch(
    '/:conversationId/state',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { conversationId } = getConversationSchema.parse(req.params);
        const input = updateConversationStateSchema.parse(req.body);
        const actor = req.user!;

        const conversation = await conversationService.updateConversationState(
          conversationId,
          input.state,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
          input.reason
        );

        res.json({ data: conversation });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /conversations/:conversationId/participants
   * Get participants in a conversation (with visibility rules applied).
   */
  router.get(
    '/:conversationId/participants',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { conversationId } = getConversationSchema.parse(req.params);
        const actor = req.user!;

        const participants = await conversationService.getParticipants(
          conversationId,
          actor.userId
        );

        res.json({ data: participants });
      } catch (error) {
        next(error);
      }
    }
  );

  // ==========================================================================
  // ADMIN ROUTES
  // ==========================================================================

  /**
   * PATCH /conversations/:conversationId/admin
   * Admin update to a conversation.
   * BUSINESS RULE: All admin actions require reason and are audit-logged.
   */
  router.patch(
    '/:conversationId/admin',
    authMiddleware.requireAuth,
    authMiddleware.requireAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { conversationId } = getConversationSchema.parse(req.params);
        const input = adminUpdateConversationSchema.parse({
          ...req.body,
          conversationId,
        });
        const actor = req.user!;

        if (!input.reason) {
          throw Errors.ADMIN_REASON_REQUIRED();
        }

        const conversation = await conversationService.adminUpdateConversation(
          input,
          {
            actorId: actor.userId,
            actorType: actor.userType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          }
        );

        res.json({ data: conversation });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: 'USER' | 'AGENT' | 'ADMIN';
        email: string;
      };
    }
  }
}
