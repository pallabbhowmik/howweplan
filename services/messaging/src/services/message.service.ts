/**
 * Messaging Service - Message Service
 *
 * Core business logic for sending and managing messages.
 * BUSINESS RULE: No direct contact pre-payment (content is masked).
 * BUSINESS RULE: All messages are auditable.
 */

import { randomUUID, createHash } from 'crypto';
import { config } from '../env';
import { getServiceSupabaseClient } from '../db/supabase';
import { contentMaskingService } from './masking.service';
import { auditService } from './audit.service';
import { rateLimitService } from './ratelimit.service';
import { Errors } from '../api/errors';
import type {
  Message,
  MessageView,
  PaginationParams,
  PaginatedResult,
} from '../types';
import type {
  SendMessageInput,
  EditMessageInput,
  DeleteMessageInput,
  AdminDeleteMessageInput,
  ActorContext,
} from '../api/schemas';

// =============================================================================
// MESSAGE SERVICE
// =============================================================================

export class MessageService {
  private async isAgentUserForConversation(
    supabase: ReturnType<typeof getServiceSupabaseClient>,
    agentProfileId: string,
    actorId: string
  ): Promise<boolean> {
    const { data } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentProfileId)
      .eq('user_id', actorId)
      .maybeSingle();
    return Boolean(data);
  }

  /**
   * Sends a new message to a conversation.
   * Content will be automatically masked if contacts are not revealed.
   */
  async sendMessage(
    input: SendMessageInput,
    actor: ActorContext
  ): Promise<MessageView> {
    // Check rate limit
    await rateLimitService.checkMessageRateLimit(actor.actorId);

    // Validate message length
    if (input.content.length > config.limits.maxMessageLength) {
      throw Errors.VALIDATION_ERROR({
        content: `Message exceeds maximum length of ${config.limits.maxMessageLength} characters`,
      });
    }

    // Validate attachments count
    if (
      input.attachmentIds &&
      input.attachmentIds.length > config.limits.maxAttachments
    ) {
      throw Errors.TOO_MANY_ATTACHMENTS(config.limits.maxAttachments);
    }

    const supabase = getServiceSupabaseClient();

    const { data: convoRow, error: convoErr } = await supabase
      .from('conversations')
      .select('id, booking_id, user_id, agent_id, state, contacts_revealed')
      .eq('id', input.conversationId)
      .maybeSingle();

    if (convoErr) {
      throw Errors.INTERNAL_ERROR('Failed to load conversation');
    }

    if (!convoRow) {
      throw Errors.CONVERSATION_NOT_FOUND(input.conversationId);
    }

    const conversation = {
      id: String(convoRow.id),
      state: String((convoRow as any).state) as 'ACTIVE' | 'PAUSED' | 'CLOSED',
      contactsRevealed: Boolean((convoRow as any).contacts_revealed),
      bookingId: (convoRow as any).booking_id ? String((convoRow as any).booking_id) : null,
      userId: String((convoRow as any).user_id),
      agentId: String((convoRow as any).agent_id),
    };

    // Verify actor is a participant
    if (
      actor.actorId !== conversation.userId &&
      actor.actorId !== conversation.agentId
    ) {
      const isAgentUser = await this.isAgentUserForConversation(
        supabase,
        conversation.agentId,
        actor.actorId
      );
      if (!isAgentUser) {
        throw Errors.NOT_PARTICIPANT();
      }
    }

    // Check conversation is active
    if (conversation.state !== 'ACTIVE') {
      throw Errors.CONVERSATION_CLOSED();
    }

    // Apply content masking if contacts not revealed
    const maskResult = contentMaskingService.maskContent(
      input.content,
      conversation.contactsRevealed
    );

    const messageId = randomUUID();
    const now = new Date();

    // Calculate content hash for audit
    const contentHash = createHash('sha256')
      .update(input.content)
      .digest('hex');

    // Persist message to current DB schema (messages table).
    const senderTypeDb = actor.actorType.toLowerCase();
    const contentTypeDb =
      (input.messageType ?? 'TEXT') === 'SYSTEM' ? 'system' : 'text';

    const { data: inserted, error: insertErr } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        conversation_id: input.conversationId,
        sender_id: actor.actorId,
        sender_type: senderTypeDb,
        content: maskResult.maskedContent,
        content_type: contentTypeDb,
        is_read: false,
        created_at: now.toISOString(),
      })
      .select('id, conversation_id, sender_id, sender_type, content, is_read, created_at')
      .single();

    if (insertErr) {
      throw Errors.INTERNAL_ERROR('Failed to send message');
    }

    // Best-effort bump conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: now.toISOString() })
      .eq('id', input.conversationId);

    const message: Message = {
      id: String(inserted.id),
      conversationId: String((inserted as any).conversation_id),
      senderId: String((inserted as any).sender_id ?? actor.actorId),
      senderType: actor.actorType,
      content: String((inserted as any).content ?? ''),
      originalContent: null,
      wasMasked: maskResult.wasMasked,
      messageType: input.messageType ?? 'TEXT',
      metadata: input.metadata ?? null,
      createdAt: new Date(String((inserted as any).created_at)),
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };

    // Audit log
    await auditService.logMessageSent(
      messageId,
      input.conversationId,
      conversation.bookingId,
      actor.actorId,
      actor.actorType,
      input.messageType ?? 'TEXT',
      maskResult.wasMasked,
      contentHash,
      input.attachmentIds?.length ?? 0
    );

    // If content was masked, log that separately
    if (maskResult.wasMasked) {
      const maskedTypes = maskResult.maskedPatterns.map((p) => p.type);
      await auditService.logContentMasked(
        messageId,
        input.conversationId,
        actor.actorId,
        maskedTypes,
        maskResult.maskedPatterns.length,
        actor
      );
    }

    return this.toMessageView(message, actor.actorId);
  }

  /**
   * Gets messages in a conversation with pagination.
   */
  async getMessages(
    conversationId: string,
    requesterId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<MessageView>> {
    const supabase = getServiceSupabaseClient();

    const { data: convoRow, error: convoErr } = await supabase
      .from('conversations')
      .select('id, user_id, agent_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convoErr) {
      throw Errors.INTERNAL_ERROR('Failed to load conversation');
    }

    if (!convoRow) {
      throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    }

    const userId = String((convoRow as any).user_id);
    const agentId = String((convoRow as any).agent_id);
    if (requesterId !== userId && requesterId !== agentId) {
      const isAgentUser = await this.isAgentUserForConversation(
        supabase,
        agentId,
        requesterId
      );
      if (!isAgentUser) {
        throw Errors.NOT_PARTICIPANT();
      }
    }

    const limit = pagination?.limit ?? 50;
    const { data: rows, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, sender_type, content, is_read, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw Errors.INTERNAL_ERROR('Failed to load messages');
    }

    const items: MessageView[] = (rows ?? []).map((row: any) => {
      const senderTypeLower = String(row.sender_type ?? '').toLowerCase();
      const senderType =
        senderTypeLower === 'agent'
          ? 'AGENT'
          : senderTypeLower === 'system'
            ? 'SYSTEM'
            : 'USER';

      return {
        id: String(row.id),
        conversationId: String(row.conversation_id),
        senderId: String(row.sender_id ?? ''),
        senderType,
        senderDisplayName: '',
        content: String(row.content ?? ''),
        wasMasked: false,
        messageType: 'TEXT',
        attachments: [],
        createdAt: new Date(String(row.created_at)).toISOString(),
        editedAt: null,
        isDeleted: false,
        readBy: Boolean(row.is_read) ? ['*'] : [],
        reactions: [],
      };
    });

    return {
      items,
      nextCursor: null,
      previousCursor: null,
      hasMore: false,
    };
  }

  /**
   * Gets a single message by ID.
   */
  async getMessage(
    messageId: string,
    requesterId: string
  ): Promise<MessageView | null> {
    const supabase = getServiceSupabaseClient();

    const { data: row, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, sender_type, content, is_read, created_at')
      .eq('id', messageId)
      .maybeSingle();

    if (error) {
      throw Errors.INTERNAL_ERROR('Failed to load message');
    }

    if (!row) return null;

    // Participant check via conversation
    const { data: convoRow } = await supabase
      .from('conversations')
      .select('user_id, agent_id')
      .eq('id', (row as any).conversation_id)
      .maybeSingle();

    if (convoRow) {
      const userId = String((convoRow as any).user_id);
      const agentId = String((convoRow as any).agent_id);
      if (requesterId !== userId && requesterId !== agentId) {
        throw Errors.NOT_PARTICIPANT();
      }
    }

    const senderTypeLower = String((row as any).sender_type ?? '').toLowerCase();
    const senderType =
      senderTypeLower === 'agent'
        ? 'AGENT'
        : senderTypeLower === 'system'
          ? 'SYSTEM'
          : 'USER';

    return {
      id: String((row as any).id),
      conversationId: String((row as any).conversation_id),
      senderId: String((row as any).sender_id ?? ''),
      senderType,
      senderDisplayName: '',
      content: String((row as any).content ?? ''),
      wasMasked: false,
      messageType: 'TEXT',
      attachments: [],
      createdAt: new Date(String((row as any).created_at)).toISOString(),
      editedAt: null,
      isDeleted: false,
      readBy: Boolean((row as any).is_read) ? ['*'] : [],
      reactions: [],
    };
  }

  /**
   * Edits a message (only sender can edit, within time limit).
   */
  async editMessage(
    input: EditMessageInput,
    actor: ActorContext
  ): Promise<MessageView> {
    // Placeholder
    const message: Message | null = null;

    if (!message) {
      throw Errors.MESSAGE_NOT_FOUND(input.messageId);
    }

    // Use type assertion since TypeScript narrows to 'never' after null check with placeholder
    const currentMessage = message as Message;

    // Verify sender
    if (currentMessage.senderId !== actor.actorId) {
      throw Errors.CANNOT_EDIT_MESSAGE('Only the sender can edit a message');
    }

    // Check edit time limit (e.g., 15 minutes)
    const editWindowMs = 15 * 60 * 1000;
    if (Date.now() - currentMessage.createdAt.getTime() > editWindowMs) {
      throw Errors.CANNOT_EDIT_MESSAGE('Edit window has expired');
    }

    // Can't edit deleted messages
    if (currentMessage.isDeleted) {
      throw Errors.CANNOT_EDIT_MESSAGE('Message has been deleted');
    }

    // Placeholder return
    return this.toMessageView(currentMessage, actor.actorId);
  }

  /**
   * Soft deletes a message (preserves for audit trail).
   */
  async deleteMessage(
    input: DeleteMessageInput,
    actor: ActorContext
  ): Promise<void> {
    const message: Message | null = null;

    if (!message) {
      throw Errors.MESSAGE_NOT_FOUND(input.messageId);
    }

    // Use type assertion since TypeScript narrows to 'never' after null check with placeholder
    const currentMessage = message as Message;

    // Verify sender or admin
    if (currentMessage.senderId !== actor.actorId && actor.actorType !== 'ADMIN') {
      throw Errors.CANNOT_DELETE_MESSAGE('Only the sender can delete a message');
    }

    // Audit log would be handled by the event
  }

  /**
   * Admin delete a message.
   * BUSINESS RULE: All admin actions require reason and are audit-logged.
   */
  async adminDeleteMessage(
    input: AdminDeleteMessageInput,
    actor: ActorContext
  ): Promise<void> {
    const message: Message | null = null;

    if (!message) {
      throw Errors.MESSAGE_NOT_FOUND(input.messageId);
    }

    // Use type assertion since TypeScript narrows to 'never' after null check with placeholder
    const currentMessage = message as Message;

    // Audit admin action
    await auditService.logAdminAction(
      currentMessage.conversationId,
      'message',
      input.messageId,
      actor,
      input.reason,
      { content: '[REDACTED]', isDeleted: false },
      { content: '[REDACTED]', isDeleted: true }
    );
  }

  /**
   * Marks messages as read.
   * Creates read receipts and emits events for real-time updates.
   * Idempotent - safe to call multiple times with the same messages.
   */
  async markMessagesRead(
    conversationId: string,
    messageIds: string[],
    readById: string
  ): Promise<{ markedCount: number }> {
    if (!config.features.readReceipts) {
      return { markedCount: 0 };
    }

    if (messageIds.length === 0) {
      return { markedCount: 0 };
    }

    const supabase = getServiceSupabaseClient();

    // Validate participant
    const { data: convoRow, error: convoErr } = await supabase
      .from('conversations')
      .select('id, user_id, agent_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convoErr) {
      throw Errors.INTERNAL_ERROR('Failed to load conversation');
    }

    if (!convoRow) {
      throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    }

    const userId = String((convoRow as any).user_id);
    const agentId = String((convoRow as any).agent_id);
    if (readById !== userId && readById !== agentId) {
      const isAgentUser = await this.isAgentUserForConversation(
        supabase,
        agentId,
        readById
      );
      if (!isAgentUser) {
        throw Errors.NOT_PARTICIPANT();
      }
    }

    const now = new Date();

    const { data: updated, error: updateErr } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', messageIds)
      .eq('conversation_id', conversationId)
      .select('id');

    if (updateErr) {
      throw Errors.INTERNAL_ERROR('Failed to mark messages read');
    }

    const markedCount = (updated ?? []).length;

    // Audit log for read receipts
    await auditService.logMessagesRead(
      conversationId,
      messageIds,
      readById,
      now
    );

    // Emit event for real-time updates via WebSocket
    // await eventPublisher.publish({
    //   eventType: 'messages.read',
    //   conversationId,
    //   messageIds,
    //   readById,
    //   readAt: now.toISOString()
    // });

    return { markedCount };
  }

  /**
   * Gets unread message count for a user in a conversation.
   */
  async getUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<number> {
    if (!config.features.readReceipts) {
      return 0;
    }

    const supabase = getServiceSupabaseClient();

    const { data: convoRow, error: convoErr } = await supabase
      .from('conversations')
      .select('user_id, agent_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convoErr) {
      throw Errors.INTERNAL_ERROR('Failed to load conversation');
    }

    if (!convoRow) {
      throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    }

    const convoUserId = String((convoRow as any).user_id);
    const convoAgentId = String((convoRow as any).agent_id);
    if (userId !== convoUserId && userId !== convoAgentId) {
      throw Errors.NOT_PARTICIPANT();
    }

    const otherSenderType = userId === convoUserId ? 'agent' : 'user';
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .eq('sender_type', otherSenderType);

    if (error) {
      throw Errors.INTERNAL_ERROR('Failed to compute unread count');
    }

    return count ?? 0;
  }

  /**
   * Gets the last read message ID for a user in a conversation.
   */
  async getLastReadMessageId(
    conversationId: string,
    userId: string
  ): Promise<string | null> {
    if (!config.features.readReceipts) {
      return null;
    }

    const supabase = getServiceSupabaseClient();

    const { data: convoRow, error: convoErr } = await supabase
      .from('conversations')
      .select('user_id, agent_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convoErr) {
      throw Errors.INTERNAL_ERROR('Failed to load conversation');
    }

    if (!convoRow) {
      throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    }

    const convoUserId = String((convoRow as any).user_id);
    const convoAgentId = String((convoRow as any).agent_id);
    if (userId !== convoUserId && userId !== convoAgentId) {
      throw Errors.NOT_PARTICIPANT();
    }

    const otherSenderType = userId === convoUserId ? 'agent' : 'user';
    const { data: rows, error } = await supabase
      .from('messages')
      .select('id, created_at')
      .eq('conversation_id', conversationId)
      .eq('is_read', true)
      .eq('sender_type', otherSenderType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw Errors.INTERNAL_ERROR('Failed to load read status');
    }

    const row = rows?.[0];
    return row?.id ? String((row as any).id) : null;
  }

  /**
   * Marks all messages in a conversation as read up to a specific message.
   * More efficient than marking individual messages.
   */
  async markAllReadUpTo(
    conversationId: string,
    upToMessageId: string,
    readById: string
  ): Promise<{ markedCount: number }> {
    if (!config.features.readReceipts) {
      return { markedCount: 0 };
    }

    const supabase = getServiceSupabaseClient();

    const { data: convoRow, error: convoErr } = await supabase
      .from('conversations')
      .select('user_id, agent_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (convoErr) {
      throw Errors.INTERNAL_ERROR('Failed to load conversation');
    }

    if (!convoRow) {
      throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    }

    const convoUserId = String((convoRow as any).user_id);
    const convoAgentId = String((convoRow as any).agent_id);
    
    // Check if actor is a participant - either the user directly or an agent (by user_id lookup)
    let isParticipant = readById === convoUserId || readById === convoAgentId;
    let otherSenderType: 'agent' | 'user' = readById === convoUserId ? 'agent' : 'user';
    
    if (!isParticipant) {
      // Check if readById is an agent user whose profile ID matches convoAgentId
      const isAgentUser = await this.isAgentUserForConversation(supabase, convoAgentId, readById);
      if (isAgentUser) {
        isParticipant = true;
        otherSenderType = 'user'; // Agent is reading, so other sender is user
      }
    }
    
    if (!isParticipant) {
      throw Errors.NOT_PARTICIPANT();
    }

    const { data: target, error: targetErr } = await supabase
      .from('messages')
      .select('id, conversation_id, created_at')
      .eq('id', upToMessageId)
      .maybeSingle();

    if (targetErr) {
      throw Errors.INTERNAL_ERROR('Failed to load target message');
    }

    if (!target || String((target as any).conversation_id) !== conversationId) {
      throw Errors.MESSAGE_NOT_FOUND(upToMessageId);
    }

    const targetCreatedAt = String((target as any).created_at);

    const { data: updated, error: updateErr } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', otherSenderType)
      .eq('is_read', false)
      .lte('created_at', targetCreatedAt)
      .select('id');

    if (updateErr) {
      throw Errors.INTERNAL_ERROR('Failed to mark messages read');
    }

    return { markedCount: (updated ?? []).length };
  }

  /**
   * Adds a reaction to a message.
   */
  async addReaction(
    _messageId: string,
    _emoji: string,
    _reactedById: string
  ): Promise<void> {
    if (!config.features.reactions) {
      throw Errors.FORBIDDEN('Reactions are not enabled');
    }
  }

  /**
   * Removes a reaction from a message.
   */
  async removeReaction(
    _messageId: string,
    _emoji: string,
    _reactedById: string
  ): Promise<void> {
    if (!config.features.reactions) {
      return;
    }
  }

  /**
   * Converts internal message to view model.
   */
  private toMessageView(message: Message, _requesterId: string): MessageView {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderType: message.senderType,
      senderDisplayName: '', // Would be populated from participant data
      content: message.content,
      wasMasked: message.wasMasked,
      messageType: message.messageType,
      attachments: [], // Would be populated from database
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString() ?? null,
      isDeleted: message.isDeleted,
      readBy: [], // Would be populated from read receipts
      reactions: [], // Would be aggregated from reactions
    };
  }
}

// Singleton instance
export const messageService = new MessageService();
