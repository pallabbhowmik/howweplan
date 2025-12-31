/**
 * Messaging Service - Conversation Service
 *
 * Core business logic for conversation management.
 * BUSINESS RULE: Platform chat is mandatory before payment.
 * BUSINESS RULE: Full contact details released ONLY after payment.
 */

import { randomUUID } from 'crypto';
import { auditService } from './audit.service';
import { rateLimitService } from './ratelimit.service';
import { Errors } from '../api/errors';
import type {
  Conversation,
  ConversationState,
  ConversationView,
  ParticipantView,
  ParticipantType,
  PaginationParams,
  PaginatedResult,
} from '../types';
import type {
  CreateConversationInput,
  ActorContext,
  AdminUpdateConversationInput,
  BookingStateWebhookInput,
} from '../api/schemas';

// =============================================================================
// CONVERSATION SERVICE
// =============================================================================

export class ConversationService {
  /**
   * Creates a new conversation between a user and agent.
   */
  async createConversation(
    input: CreateConversationInput,
    actor: ActorContext
  ): Promise<ConversationView> {
    // Check rate limit
    await rateLimitService.checkConversationRateLimit(actor.actorId);

    const conversationId = randomUUID();
    const now = new Date();

    const conversation: Conversation = {
      id: conversationId,
      bookingId: input.bookingId ?? null,
      userId: input.userId,
      agentId: input.agentId,
      state: 'ACTIVE',
      contactsRevealed: false,
      bookingState: null,
      createdAt: now,
      updatedAt: now,
      contactsRevealedAt: null,
    };

    // Database insert would go here
    // await prisma.conversation.create({ data: conversation });

    // Audit log
    await auditService.logConversationCreated(
      conversationId,
      input.bookingId ?? null,
      input.userId,
      input.agentId,
      actor
    );

    return this.toConversationView(conversation, actor.actorId);
  }

  /**
   * Gets a conversation by ID with visibility rules applied.
   */
  async getConversation(
    _conversationId: string,
    requesterId: string
  ): Promise<ConversationView | null> {
    // Database fetch would go here
    // const conversation = await prisma.conversation.findUnique({
    //   where: { id: conversationId },
    //   include: { participants: true, messages: { take: 1, orderBy: { createdAt: 'desc' } } }
    // });

    // Placeholder - in production, fetch from database
    const conversation: Conversation | null = null;

    if (!conversation) {
      return null;
    }

    // Use type assertion since TypeScript narrows to 'never' after null check with placeholder
    const currentConversation = conversation as Conversation;

    // Verify requester is a participant
    if (
      currentConversation.userId !== requesterId &&
      currentConversation.agentId !== requesterId
    ) {
      throw Errors.NOT_PARTICIPANT();
    }

    return this.toConversationView(currentConversation, requesterId);
  }

  /**
   * Lists conversations for a user with filters.
   */
  async listConversations(
    _filters: {
      userId?: string;
      agentId?: string;
      bookingId?: string;
      state?: ConversationState;
    },
    _pagination?: PaginationParams
  ): Promise<PaginatedResult<ConversationView>> {
    // Database query would go here
    // const conversations = await prisma.conversation.findMany({
    //   where: filters,
    //   orderBy: { updatedAt: 'desc' },
    //   take: pagination?.limit ?? 50,
    //   cursor: pagination?.cursor ? { id: pagination.cursor } : undefined,
    // });

    // Placeholder
    return {
      items: [],
      nextCursor: null,
      previousCursor: null,
      hasMore: false,
    };
  }

  /**
   * Updates conversation state.
   */
  async updateConversationState(
    conversationId: string,
    newState: ConversationState,
    actor: ActorContext,
    reason?: string
  ): Promise<ConversationView> {
    // Fetch current conversation
    // const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });

    // Placeholder - in production, fetch from database
    // For now, throw not found to satisfy type checker
    const conversation: Conversation | null = null;

    if (!conversation) {
      throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    }

    // At this point TypeScript knows conversation is Conversation (not null)
    const currentConversation = conversation as Conversation;

    // Validate state transition
    this.validateStateTransition(currentConversation.state, newState, actor.actorType);

    const previousState = currentConversation.state;

    // Update in database
    // await prisma.conversation.update({
    //   where: { id: conversationId },
    //   data: { state: newState, updatedAt: new Date() }
    // });

    // Audit log
    await auditService.logStateChanged(
      conversationId,
      previousState,
      newState,
      actor,
      reason
    );

    return this.toConversationView(
      { ...currentConversation, state: newState },
      actor.actorId
    );
  }

  /**
   * Gets participants with visibility rules applied.
   * BUSINESS RULE: Agents are semi-blind pre-confirmation (first name + photo only).
   * BUSINESS RULE: Full agent identity revealed ONLY after agent confirmation.
   * BUSINESS RULE: Full contact details released ONLY after payment.
   */
  async getParticipants(
    conversationId: string,
    _requesterId: string
  ): Promise<ParticipantView[]> {
    // Fetch conversation with participants
    // const conversation = await prisma.conversation.findUnique({
    //   where: { id: conversationId },
    //   include: { participants: true }
    // });

    // Placeholder - in production, fetch from database and identity service
    const conversation: Conversation | null = null;

    if (!conversation) {
      throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    }

    // Build participant views with visibility rules
    const participants: ParticipantView[] = [];

    // Apply visibility rules based on booking state and contacts revealed
    // This is a placeholder - actual implementation would fetch from identity service

    return participants;
  }

  /**
   * Handles booking state change from webhook.
   * Determines if contacts should be revealed.
   */
  async handleBookingStateChange(input: BookingStateWebhookInput): Promise<void> {
    // Find conversation for this booking
    // const conversation = await prisma.conversation.findFirst({
    //   where: { bookingId: input.bookingId }
    // });

    // If payment is completed, reveal contacts
    if (input.isPaid && input.isConfirmed) {
      // await this.revealContacts(conversation.id, input.bookingId, input.newState);
    }

    // Update booking state on conversation
    // await prisma.conversation.update({
    //   where: { id: conversation.id },
    //   data: { bookingState: input.newState }
    // });
  }

  /**
   * Reveals contacts in a conversation after payment.
   * BUSINESS RULE: Full contact details released ONLY after payment.
   */
  async revealContacts(
    conversationId: string,
    bookingId: string,
    triggerState: string
  ): Promise<void> {
    // Fetch conversation
    // const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });

    // Placeholder - in production, fetch from database
    const conversation: Conversation | null = null;

    if (!conversation) {
      throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    }

    // Use type assertion since TypeScript narrows to 'never' after null check with placeholder
    const currentConversation = conversation as Conversation;

    if (currentConversation.contactsRevealed) {
      return; // Already revealed
    }

    // Update conversation
    // await prisma.conversation.update({
    //   where: { id: conversationId },
    //   data: {
    //     contactsRevealed: true,
    //     contactsRevealedAt: new Date()
    //   }
    // });

    // Update participant visibility
    // await prisma.conversationParticipant.updateMany({
    //   where: { conversationId },
    //   data: { identityRevealed: true }
    // });

    // Send system message about contact reveal
    // This would create a CONTACT_REVEAL message

    // Audit log
    await auditService.logContactsRevealed(
      conversationId,
      bookingId,
      currentConversation.userId,
      currentConversation.agentId,
      triggerState
    );
  }

  /**
   * Marks a conversation as disputed.
   */
  async markAsDisputed(
    _bookingId: string,
    _disputeId: string,
    _reason: string
  ): Promise<void> {
    // Find and update conversation
    // const conversation = await prisma.conversation.findFirst({
    //   where: { bookingId: _bookingId }
    // });

    // await prisma.conversation.update({
    //   where: { id: conversation.id },
    //   data: { state: 'DISPUTED' }
    // });

    // Audit is handled by the event
  }

  /**
   * Handles dispute resolution.
   */
  async handleDisputeResolution(
    _bookingId: string,
    _disputeId: string,
    _resolution: string
  ): Promise<void> {
    // Update conversation state based on resolution
    // const conversation = await prisma.conversation.findFirst({
    //   where: { bookingId: _bookingId }
    // });

    // const newState = _resolution === 'dismissed' ? 'CLOSED' : 'ARCHIVED';
    // await prisma.conversation.update({
    //   where: { id: conversation.id },
    //   data: { state: newState }
    // });
  }

  /**
   * Admin update to conversation.
   * BUSINESS RULE: All admin actions require reason and are audit-logged.
   */
  async adminUpdateConversation(
    input: AdminUpdateConversationInput,
    actor: ActorContext
  ): Promise<ConversationView> {
    // Fetch current conversation
    // const conversation = await prisma.conversation.findUnique({
    //   where: { id: input.conversationId }
    // });

    const conversation: Conversation | null = null;

    if (!conversation) {
      throw Errors.CONVERSATION_NOT_FOUND(input.conversationId);
    }

    // Use type assertion since TypeScript narrows to 'never' after null check with placeholder
    const currentConversation = conversation as Conversation;

    const previousState = {
      state: currentConversation.state,
      contactsRevealed: currentConversation.contactsRevealed,
    };

    // Apply updates
    const updates: Partial<Conversation> = {};
    if (input.state) updates.state = input.state;
    if (input.contactsRevealed !== undefined) {
      updates.contactsRevealed = input.contactsRevealed;
      if (input.contactsRevealed) {
        updates.contactsRevealedAt = new Date();
      }
    }

    // await prisma.conversation.update({
    //   where: { id: input.conversationId },
    //   data: updates
    // });

    // Audit admin action
    await auditService.logAdminAction(
      input.conversationId,
      'conversation',
      input.conversationId,
      actor,
      input.reason,
      previousState,
      { ...previousState, ...updates }
    );

    return this.toConversationView(
      { ...currentConversation, ...updates } as Conversation,
      actor.actorId
    );
  }

  /**
   * Validates state transitions.
   */
  private validateStateTransition(
    currentState: ConversationState,
    newState: ConversationState,
    actorType: ParticipantType
  ): void {
    const allowedTransitions: Record<ConversationState, ConversationState[]> = {
      ACTIVE: ['PAUSED', 'CLOSED', 'DISPUTED'],
      PAUSED: ['ACTIVE', 'CLOSED'],
      CLOSED: ['ARCHIVED'],
      ARCHIVED: [], // Terminal state
      DISPUTED: ['CLOSED', 'ARCHIVED'], // Only after resolution
    };

    // Admins can make any transition
    if (actorType === 'ADMIN') {
      return;
    }

    const allowed = allowedTransitions[currentState] ?? [];
    if (!allowed.includes(newState)) {
      throw Errors.INVALID_CONVERSATION_STATE(currentState, allowed);
    }
  }

  /**
   * Converts internal conversation to view model.
   */
  private toConversationView(
    conversation: Conversation,
    _requesterId: string
  ): ConversationView {
    return {
      id: conversation.id,
      bookingId: conversation.bookingId,
      state: conversation.state,
      contactsRevealed: conversation.contactsRevealed,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      participants: [], // Would be populated from database
      lastMessage: null, // Would be populated from database
      unreadCount: 0, // Would be calculated from database
    };
  }
}

// Singleton instance
export const conversationService = new ConversationService();
