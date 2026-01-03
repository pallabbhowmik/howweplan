/**
 * Messaging Service - Message Service
 *
 * Core business logic for sending and managing messages.
 * BUSINESS RULE: No direct contact pre-payment (content is masked).
 * BUSINESS RULE: All messages are auditable.
 */

import { randomUUID, createHash } from 'crypto';
import { config } from '../env';
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

    // Fetch conversation to check state and contacts status
    // const conversation = await prisma.conversation.findUnique({
    //   where: { id: input.conversationId }
    // });

    // Placeholder
    const conversation = {
      id: input.conversationId,
      state: 'ACTIVE' as const,
      contactsRevealed: false,
      bookingId: null as string | null,
      userId: '',
      agentId: '',
    };

    // Verify actor is a participant
    if (
      actor.actorId !== conversation.userId &&
      actor.actorId !== conversation.agentId
    ) {
      throw Errors.NOT_PARTICIPANT();
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

    const message: Message = {
      id: messageId,
      conversationId: input.conversationId,
      senderId: actor.actorId,
      senderType: actor.actorType,
      content: maskResult.maskedContent,
      originalContent: maskResult.wasMasked ? input.content : null, // Encrypted in production
      wasMasked: maskResult.wasMasked,
      messageType: input.messageType ?? 'TEXT',
      metadata: input.metadata ?? null,
      createdAt: now,
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };

    // Database insert would go here
    // await prisma.message.create({ data: message });

    // Link attachments if provided
    // if (input.attachmentIds) {
    //   await prisma.messageAttachment.updateMany({
    //     where: { id: { in: input.attachmentIds } },
    //     data: { messageId }
    //   });
    // }

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
    _conversationId: string,
    _requesterId: string,
    _pagination?: PaginationParams
  ): Promise<PaginatedResult<MessageView>> {
    // Verify requester is a participant
    // const conversation = await prisma.conversation.findUnique({
    //   where: { id: conversationId }
    // });

    // Database query would go here
    // const messages = await prisma.message.findMany({
    //   where: { conversationId, isDeleted: false },
    //   orderBy: { createdAt: 'desc' },
    //   take: pagination?.limit ?? 50,
    //   cursor: pagination?.cursor ? { id: pagination.cursor } : undefined,
    //   include: { attachments: true, readReceipts: true, reactions: true }
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
   * Gets a single message by ID.
   */
  async getMessage(
    _messageId: string,
    _requesterId: string
  ): Promise<MessageView | null> {
    // Database fetch would go here
    // const message = await prisma.message.findUnique({
    //   where: { id: messageId },
    //   include: { attachments: true, readReceipts: true, reactions: true, conversation: true }
    // });

    // Placeholder
    return null;
  }

  /**
   * Edits a message (only sender can edit, within time limit).
   */
  async editMessage(
    input: EditMessageInput,
    actor: ActorContext
  ): Promise<MessageView> {
    // Fetch message
    // const message = await prisma.message.findUnique({
    //   where: { id: input.messageId },
    //   include: { conversation: true }
    // });

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

    // Apply masking to new content
    // const conversation = message.conversation;
    // const maskResult = contentMaskingService.maskContent(
    //   input.content,
    //   conversation.contactsRevealed
    // );

    // Update message
    // await prisma.message.update({
    //   where: { id: input.messageId },
    //   data: {
    //     content: maskResult.maskedContent,
    //     originalContent: maskResult.wasMasked ? input.content : null,
    //     wasMasked: maskResult.wasMasked,
    //     editedAt: new Date()
    //   }
    // });

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
    // Fetch message
    // const message = await prisma.message.findUnique({
    //   where: { id: input.messageId },
    //   include: { conversation: true }
    // });

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

    // Soft delete
    // await prisma.message.update({
    //   where: { id: input.messageId },
    //   data: {
    //     isDeleted: true,
    //     deletedAt: new Date(),
    //     deletedBy: actor.actorId
    //   }
    // });

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
    // Fetch message
    // const message = await prisma.message.findUnique({
    //   where: { id: input.messageId },
    //   include: { conversation: true }
    // });

    const message: Message | null = null;

    if (!message) {
      throw Errors.MESSAGE_NOT_FOUND(input.messageId);
    }

    // Use type assertion since TypeScript narrows to 'never' after null check with placeholder
    const currentMessage = message as Message;

    // Soft delete
    // await prisma.message.update({
    //   where: { id: input.messageId },
    //   data: {
    //     isDeleted: true,
    //     deletedAt: new Date(),
    //     deletedBy: actor.actorId
    //   }
    // });

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

    // Validate all messages belong to the conversation and reader is a participant
    // const conversation = await prisma.conversation.findUnique({
    //   where: { id: conversationId }
    // });
    // 
    // if (!conversation) {
    //   throw Errors.CONVERSATION_NOT_FOUND(conversationId);
    // }
    // 
    // if (conversation.userId !== readById && conversation.agentId !== readById) {
    //   throw Errors.NOT_PARTICIPANT();
    // }

    const now = new Date();

    // Create read receipts (idempotent - skipDuplicates)
    // const result = await prisma.messageReadReceipt.createMany({
    //   data: messageIds.map(messageId => ({
    //     id: crypto.randomUUID(),
    //     messageId,
    //     readById,
    //     readAt: now
    //   })),
    //   skipDuplicates: true
    // });

    // Placeholder count
    const markedCount = messageIds.length;

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
    _conversationId: string,
    _userId: string
  ): Promise<number> {
    if (!config.features.readReceipts) {
      return 0;
    }

    // Count messages not sent by user and not read by user
    // const unreadCount = await prisma.message.count({
    //   where: {
    //     conversationId,
    //     senderId: { not: userId },
    //     isDeleted: false,
    //     readReceipts: {
    //       none: {
    //         readById: userId
    //       }
    //     }
    //   }
    // });

    // Placeholder
    return 0;
  }

  /**
   * Gets the last read message ID for a user in a conversation.
   */
  async getLastReadMessageId(
    _conversationId: string,
    _userId: string
  ): Promise<string | null> {
    if (!config.features.readReceipts) {
      return null;
    }

    // Get the most recent read receipt for this user in this conversation
    // const lastReceipt = await prisma.messageReadReceipt.findFirst({
    //   where: {
    //     readById: userId,
    //     message: {
    //       conversationId
    //     }
    //   },
    //   orderBy: {
    //     readAt: 'desc'
    //   },
    //   include: {
    //     message: true
    //   }
    // });

    // Placeholder
    return null;
  }

  /**
   * Marks all messages in a conversation as read up to a specific message.
   * More efficient than marking individual messages.
   */
  async markAllReadUpTo(
    _conversationId: string,
    _upToMessageId: string,
    _readById: string
  ): Promise<{ markedCount: number }> {
    if (!config.features.readReceipts) {
      return { markedCount: 0 };
    }

    // Get the timestamp of the target message
    // const targetMessage = await prisma.message.findUnique({
    //   where: { id: upToMessageId }
    // });
    // 
    // if (!targetMessage || targetMessage.conversationId !== conversationId) {
    //   throw Errors.MESSAGE_NOT_FOUND(upToMessageId);
    // }

    // Get all unread messages up to and including this one
    // const unreadMessages = await prisma.message.findMany({
    //   where: {
    //     conversationId,
    //     senderId: { not: readById },
    //     isDeleted: false,
    //     createdAt: { lte: targetMessage.createdAt },
    //     readReceipts: {
    //       none: {
    //         readById
    //       }
    //     }
    //   },
    //   select: { id: true }
    // });
    // 
    // const messageIds = unreadMessages.map(m => m.id);
    // return this.markMessagesRead(conversationId, messageIds, readById);

    // Placeholder
    return { markedCount: 0 };
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

    // Create reaction
    // await prisma.messageReaction.create({
    //   data: {
    //     messageId,
    //     reactedById,
    //     emoji
    //   }
    // });
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

    // Delete reaction
    // await prisma.messageReaction.delete({
    //   where: {
    //     messageId_reactedById_emoji: {
    //       messageId,
    //       reactedById,
    //       emoji
    //     }
    //   }
    // });
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
