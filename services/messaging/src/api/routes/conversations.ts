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
import { getServiceSupabaseClient } from '../../db/supabase';

export function createConversationRoutes(
  conversationService: ConversationService,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  /**
   * POST /conversations
   * Create a new conversation between a user and agent.
   * 
   * Note: agentId can be either:
   * - The agent's user_id (from users table) - for authorization
   * - The agent's profile id (from agents table) - for database storage
   * 
   * We handle both cases by looking up the agent profile.
   */
  router.post(
    '/',
    authMiddleware.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = createConversationSchema.parse(req.body);
        const actor = req.user!;
        const supabase = getServiceSupabaseClient();

        // Look up the agent to get both profile ID and user ID
        // First try to find by user_id (if caller passed the agent's user account ID)
        let agentProfileId = input.agentId;
        let agentUserId = input.agentId;

        const { data: agentByUserId } = await supabase
          .from('agents')
          .select('id, user_id')
          .eq('user_id', input.agentId)
          .maybeSingle();

        if (agentByUserId) {
          // Caller passed the agent's user_id, get the profile ID
          agentProfileId = agentByUserId.id;
          agentUserId = agentByUserId.user_id;
        } else {
          // Try to find by profile ID
          const { data: agentByProfileId } = await supabase
            .from('agents')
            .select('id, user_id')
            .eq('id', input.agentId)
            .maybeSingle();

          if (agentByProfileId) {
            agentProfileId = agentByProfileId.id;
            agentUserId = agentByProfileId.user_id;
          } else {
            throw Errors.FORBIDDEN('Agent not found');
          }
        }

        // Verify actor is either the user or the agent in the conversation
        if (actor.userId !== input.userId && actor.userId !== agentUserId) {
          throw Errors.FORBIDDEN('You can only create conversations you are part of');
        }

        // Create conversation with the agent profile ID (for foreign key)
        const conversationInput = {
          ...input,
          agentId: agentProfileId,
        };

        const conversation = await conversationService.createConversation(
          conversationInput,
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

        // For agents, resolve profile ID from user ID to match conversations.agent_id
        let agentProfileId: string | undefined;
        if (actor.userType === 'AGENT') {
          const supabase = getServiceSupabaseClient();
          const { data: agentRow } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', actor.userId)
            .maybeSingle();
          agentProfileId = agentRow?.id;
        }

        // Users can only list their own conversations
        const filters = {
          ...input,
          userId: actor.userType === 'USER' ? actor.userId : input.userId,
          agentId: actor.userType === 'AGENT' ? agentProfileId ?? actor.userId : input.agentId,
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
