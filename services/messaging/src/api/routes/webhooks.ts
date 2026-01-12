/**
 * Messaging Service - Internal Webhook Routes
 *
 * Endpoints for internal service-to-service communication.
 * These are called by other services (Booking, Identity, Dispute).
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  bookingStateWebhookSchema,
  revealContactsWebhookSchema,
} from '../schemas';
import type { ConversationService } from '../../services/conversation.service';
import type { AuthMiddleware } from '../../middleware/auth';

export function createWebhookRoutes(
  conversationService: ConversationService,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  /**
   * POST /webhooks/booking-state
   * Called by Booking Service when booking state changes.
   * Used to determine when to reveal contacts.
   */
  router.post(
    '/booking-state',
    authMiddleware.requireInternalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = bookingStateWebhookSchema.parse(req.body);

        await conversationService.handleBookingStateChange(input);

        res.status(200).json({ success: true });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /webhooks/reveal-contacts
   * Called to explicitly reveal contacts in a conversation.
   * BUSINESS RULE: Full contact details released ONLY after payment.
   */
  router.post(
    '/reveal-contacts',
    authMiddleware.requireInternalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = revealContactsWebhookSchema.parse(req.body);

        await conversationService.revealContacts(
          input.conversationId,
          input.bookingId,
          input.triggerState
        );

        res.status(200).json({ success: true });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /webhooks/dispute-created
   * Called by Dispute Service when a dispute is created.
   * Marks the conversation as disputed.
   */
  router.post(
    '/dispute-created',
    authMiddleware.requireInternalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { disputeId, bookingId, reason } = req.body;

        await conversationService.markAsDisputed(bookingId, disputeId, reason);

        res.status(200).json({ success: true });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /webhooks/dispute-resolved
   * Called by Dispute Service when a dispute is resolved.
   * Updates the conversation state accordingly.
   */
  router.post(
    '/dispute-resolved',
    authMiddleware.requireInternalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { disputeId, bookingId, resolution } = req.body;

        await conversationService.handleDisputeResolution(
          bookingId,
          disputeId,
          resolution
        );

        res.status(200).json({ success: true });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /webhooks/match-accepted
   * Called by Matching Service when an agent accepts a match.
   * Creates a conversation between the user and agent.
   */
  router.post(
    '/match-accepted',
    authMiddleware.requireInternalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { userId, agentId, requestId, matchId } = req.body;

        if (!userId || !agentId) {
          res.status(400).json({ error: 'Missing userId or agentId' });
          return;
        }

        const conversation = await conversationService.createConversation(
          {
            userId,
            agentId,
            bookingId: null,
          },
          {
            actorId: 'SYSTEM',
            actorType: 'ADMIN',
            ipAddress: req.ip,
            userAgent: 'matching-service',
          }
        );

        console.log(`[Webhook] Created conversation ${conversation.id} for match ${matchId} (user: ${userId}, agent: ${agentId})`);

        res.status(201).json({ 
          success: true, 
          data: { conversationId: conversation.id } 
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
