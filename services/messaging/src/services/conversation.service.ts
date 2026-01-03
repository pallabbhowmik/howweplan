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
import { getServiceSupabaseClient } from '../db/supabase';
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

    const supabase = getServiceSupabaseClient();

    // Prefer existing conversation if it already exists for this booking/user/agent.
    // (Local DB schema may not enforce uniqueness.)
    if (input.bookingId) {
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('booking_id', input.bookingId)
        .eq('user_id', input.userId)
        .eq('agent_id', input.agentId)
        .maybeSingle();

      if (existing) {
        return this.toConversationView(this.fromDbConversation(existing), actor.actorId);
      }
    }

    const conversationId = randomUUID();
    const now = new Date();

    const insertPayload = {
      id: conversationId,
      booking_id: input.bookingId ?? null,
      user_id: input.userId,
      agent_id: input.agentId,
      state: 'ACTIVE',
      contacts_revealed: false,
      booking_state: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      contacts_revealed_at: null,
    };

    const { data: inserted, error } = await supabase
      .from('conversations')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      throw Errors.INTERNAL_ERROR('Failed to create conversation');
    }

    const conversation = this.fromDbConversation(inserted);

    // Audit log
    await auditService.logConversationCreated(
      conversation.id,
      conversation.bookingId,
      conversation.userId,
      conversation.agentId,
      actor
    );

    return this.toConversationView(conversation, actor.actorId);
  }

  /**
   * Gets a conversation by ID with visibility rules applied.
   */
  async getConversation(
    conversationId: string,
    requesterId: string
  ): Promise<ConversationView | null> {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (error) {
      throw Errors.INTERNAL_ERROR('Failed to load conversation');
    }

    if (!data) return null;

    const currentConversation = this.fromDbConversation(data);

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
    filters: {
      userId?: string;
      agentId?: string;
      bookingId?: string;
      state?: ConversationState;
    },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ConversationView>> {
    const supabase = getServiceSupabaseClient();

    const limit = pagination?.limit ?? 50;

    let query = supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.agentId) query = query.eq('agent_id', filters.agentId);
    if (filters.bookingId) query = query.eq('booking_id', filters.bookingId);
    if (filters.state) query = query.eq('state', filters.state);

    const { data, error } = await query;
    if (error) {
      throw Errors.INTERNAL_ERROR('Failed to list conversations');
    }

    const conversations = (data ?? []).map((row) => this.fromDbConversation(row));

    // Enrich with last message + unread count from messages table.
    const conversationIds = conversations.map((c) => c.id);
    const unreadByConversation = new Map<string, number>();
    const lastMessageByConversation = new Map<string, any>();

    if (conversationIds.length > 0) {
      const { data: messages, error: messagesErr } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, sender_type, content, is_read, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (messagesErr) {
        throw Errors.INTERNAL_ERROR('Failed to load conversation messages');
      }

      // Infer requester type from filters (best-effort)
      const requesterIsUser = Boolean(filters.userId && !filters.agentId);
      const otherSenderType = requesterIsUser ? 'agent' : 'user';

      for (const m of messages ?? []) {
        const cid = (m as any).conversation_id as string;
        if (!lastMessageByConversation.has(cid)) lastMessageByConversation.set(cid, m);

        const senderType = String((m as any).sender_type ?? '').toLowerCase();
        const isRead = Boolean((m as any).is_read);
        if (senderType === otherSenderType && !isRead) {
          unreadByConversation.set(cid, (unreadByConversation.get(cid) ?? 0) + 1);
        }
      }
    }

    const items: ConversationView[] = conversations.map((c) => {
      const last = lastMessageByConversation.get(c.id) ?? null;
      return {
        id: c.id,
        bookingId: c.bookingId,
        state: c.state,
        contactsRevealed: c.contactsRevealed,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        participants: [
          {
            id: c.userId,
            participantType: 'USER',
            displayName: '',
            isOnline: false,
            lastSeenAt: null,
          },
          {
            id: c.agentId,
            participantType: 'AGENT',
            displayName: '',
            isOnline: false,
            lastSeenAt: null,
          },
        ],
        lastMessage: last
          ? {
              id: String(last.id),
              conversationId: String(last.conversation_id),
              senderId: String(last.sender_id ?? ''),
              senderType:
                String(last.sender_type ?? '').toLowerCase() === 'agent'
                  ? 'AGENT'
                  : String(last.sender_type ?? '').toLowerCase() === 'system'
                    ? 'SYSTEM'
                    : 'USER',
              senderDisplayName: '',
              content: String(last.content ?? ''),
              wasMasked: false,
              messageType: 'TEXT',
              attachments: [],
              createdAt: new Date(String(last.created_at)).toISOString(),
              editedAt: null,
              isDeleted: false,
              readBy: Boolean(last.is_read) ? ['*'] : [],
              reactions: [],
            }
          : null,
        unreadCount: unreadByConversation.get(c.id) ?? 0,
      };
    });

    return {
      items,
      nextCursor: null,
      previousCursor: null,
      hasMore: false,
    };
  }

  private fromDbConversation(row: any): Conversation {
    return {
      id: String(row.id),
      bookingId: row.booking_id ? String(row.booking_id) : null,
      userId: String(row.user_id),
      agentId: String(row.agent_id),
      state: String(row.state) as ConversationState,
      contactsRevealed: Boolean(row.contacts_revealed),
      bookingState: row.booking_state ? String(row.booking_state) : null,
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      contactsRevealedAt: row.contacts_revealed_at
        ? new Date(String(row.contacts_revealed_at))
        : null,
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
