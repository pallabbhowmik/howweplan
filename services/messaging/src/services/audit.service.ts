/**
 * Messaging Service - Audit Service
 *
 * Handles audit logging for all messaging operations.
 * BUSINESS RULE: Every state change MUST emit an audit event.
 * BUSINESS RULE: All messages are auditable.
 */

import { randomUUID } from 'crypto';
import { config } from '../env';
import { getEventBus, createBaseEvent, EMITTED_EVENT_TYPES } from '../events';
import type {
  AuditAction,
  ParticipantType,
  ConversationState,
  MessageType,
} from '../types';
import type { ActorContext } from '../api/schemas';

// =============================================================================
// AUDIT LOG INTERFACE
// =============================================================================

export interface AuditLogEntry {
  id: string;
  conversationId: string;
  action: AuditAction;
  actorId: string;
  actorType: ParticipantType;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// =============================================================================
// AUDIT SERVICE
// =============================================================================

export class AuditService {
  /**
   * Logs a conversation creation.
   */
  async logConversationCreated(
    conversationId: string,
    bookingId: string | null,
    userId: string,
    agentId: string,
    actor: ActorContext
  ): Promise<void> {
    if (!config.observability.auditEnabled) return;

    const eventBus = await getEventBus();

    await eventBus.publish({
      ...createBaseEvent(EMITTED_EVENT_TYPES.CONVERSATION_CREATED),
      eventType: 'messaging.conversation.created',
      payload: {
        conversationId,
        bookingId,
        userId,
        agentId,
        state: 'ACTIVE' as ConversationState,
        createdAt: new Date().toISOString(),
      },
    });

    await this.writeAuditLog({
      conversationId,
      action: 'CONVERSATION_CREATED',
      actor,
      newState: { bookingId, userId, agentId, state: 'ACTIVE' },
    });
  }

  /**
   * Logs a conversation state change.
   */
  async logStateChanged(
    conversationId: string,
    previousState: ConversationState,
    newState: ConversationState,
    actor: ActorContext,
    reason?: string
  ): Promise<void> {
    if (!config.observability.auditEnabled) return;

    const eventBus = await getEventBus();

    await eventBus.publish({
      ...createBaseEvent(EMITTED_EVENT_TYPES.CONVERSATION_STATE_CHANGED),
      eventType: 'messaging.conversation.state_changed',
      payload: {
        conversationId,
        previousState,
        newState,
        changedBy: actor.actorId,
        changedByType: actor.actorType,
        reason,
      },
    });

    await this.writeAuditLog({
      conversationId,
      action: 'STATE_CHANGED',
      actor,
      previousState: { state: previousState },
      newState: { state: newState },
      reason,
    });
  }

  /**
   * Logs a message sent event.
   */
  async logMessageSent(
    messageId: string,
    conversationId: string,
    bookingId: string | null,
    senderId: string,
    senderType: ParticipantType,
    messageType: MessageType,
    wasMasked: boolean,
    contentHash: string,
    attachmentCount: number
  ): Promise<void> {
    if (!config.observability.auditEnabled) return;

    const eventBus = await getEventBus();

    await eventBus.publish({
      ...createBaseEvent(EMITTED_EVENT_TYPES.MESSAGE_SENT),
      eventType: 'messaging.message.sent',
      payload: {
        messageId,
        conversationId,
        bookingId,
        senderId,
        senderType,
        messageType,
        wasMasked,
        contentHash,
        hasAttachments: attachmentCount > 0,
        attachmentCount,
        sentAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Logs content masking.
   */
  async logContentMasked(
    messageId: string,
    conversationId: string,
    senderId: string,
    maskedTypes: ('email' | 'phone' | 'url' | 'social')[],
    maskedCount: number,
    actor: ActorContext
  ): Promise<void> {
    if (!config.observability.auditEnabled) return;

    const eventBus = await getEventBus();

    await eventBus.publish({
      ...createBaseEvent(EMITTED_EVENT_TYPES.CONTENT_MASKED),
      eventType: 'messaging.content.masked',
      payload: {
        messageId,
        conversationId,
        senderId,
        maskedTypes,
        maskedCount,
        maskedAt: new Date().toISOString(),
      },
    });

    await this.writeAuditLog({
      conversationId,
      action: 'CONTENT_MASKED',
      actor,
      metadata: { messageId, maskedTypes, maskedCount },
    });
  }

  /**
   * Logs contacts revealed event.
   */
  async logContactsRevealed(
    conversationId: string,
    bookingId: string,
    userId: string,
    agentId: string,
    triggerState: string
  ): Promise<void> {
    if (!config.observability.auditEnabled) return;

    const eventBus = await getEventBus();

    await eventBus.publish({
      ...createBaseEvent(EMITTED_EVENT_TYPES.CONTACTS_REVEALED),
      eventType: 'messaging.contacts.revealed',
      payload: {
        conversationId,
        bookingId,
        userId,
        agentId,
        revealedAt: new Date().toISOString(),
        triggerState,
      },
    });

    await this.writeAuditLog({
      conversationId,
      action: 'CONTACTS_REVEALED',
      actor: {
        actorId: 'SYSTEM',
        actorType: 'SYSTEM',
      },
      metadata: { bookingId, triggerState },
    });
  }

  /**
   * Logs evidence export.
   */
  async logEvidenceExported(
    exportId: string,
    conversationId: string,
    bookingId: string | null,
    contentHash: string,
    messageCount: number,
    expiresAt: Date,
    actor: ActorContext,
    reason: string
  ): Promise<void> {
    if (!config.observability.auditEnabled) return;

    const eventBus = await getEventBus();

    await eventBus.publish({
      ...createBaseEvent(EMITTED_EVENT_TYPES.EVIDENCE_EXPORTED),
      eventType: 'messaging.evidence.exported',
      payload: {
        exportId,
        conversationId,
        bookingId,
        requestedBy: actor.actorId,
        requestedByType: actor.actorType,
        reason,
        contentHash,
        messageCount,
        exportedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });

    await this.writeAuditLog({
      conversationId,
      action: 'EVIDENCE_EXPORTED',
      actor,
      reason,
      metadata: { exportId, messageCount },
    });
  }

  /**
   * Logs admin action.
   */
  async logAdminAction(
    conversationId: string,
    targetType: 'conversation' | 'message' | 'participant',
    targetId: string,
    actor: ActorContext,
    reason: string,
    previousState: Record<string, unknown> | null,
    newState: Record<string, unknown> | null
  ): Promise<void> {
    if (!config.observability.auditEnabled) return;

    const eventBus = await getEventBus();

    await eventBus.publish({
      ...createBaseEvent(EMITTED_EVENT_TYPES.ADMIN_ACTION),
      eventType: 'messaging.admin.action',
      payload: {
        action: 'ADMIN_ACTION',
        targetType,
        targetId,
        adminId: actor.actorId,
        reason,
        previousState,
        newState,
        metadata: null,
      },
    });

    await this.writeAuditLog({
      conversationId,
      action: 'ADMIN_ACTION',
      actor,
      reason,
      previousState,
      newState,
      metadata: { targetType, targetId },
    });
  }

  /**
   * Logs messages read event (read receipts).
   * Tracks when users read messages for conversation history.
   */
  async logMessagesRead(
    conversationId: string,
    messageIds: string[],
    readById: string,
    readAt: Date
  ): Promise<void> {
    if (!config.observability.auditEnabled) return;

    const eventBus = await getEventBus();

    await eventBus.publish({
      ...createBaseEvent(EMITTED_EVENT_TYPES.MESSAGE_SENT), // Using closest event type
      eventType: 'messaging.messages.read',
      payload: {
        conversationId,
        messageIds,
        readById,
        messageCount: messageIds.length,
        readAt: readAt.toISOString(),
      },
    });

    // Note: Read receipts are high-volume, so we don't write individual audit logs
    // The event bus emission is sufficient for real-time tracking
    if (config.isDevelopment) {
      console.info('[ReadReceipt]', {
        conversationId,
        readById,
        messageCount: messageIds.length,
        readAt: readAt.toISOString(),
      });
    }
  }

  /**
   * Writes an audit log entry to the database.
   */
  private async writeAuditLog(params: {
    conversationId: string;
    action: AuditAction;
    actor: ActorContext;
    previousState?: Record<string, unknown> | null;
    newState?: Record<string, unknown> | null;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const entry: AuditLogEntry = {
      id: randomUUID(),
      conversationId: params.conversationId,
      action: params.action,
      actorId: params.actor.actorId,
      actorType: params.actor.actorType,
      previousState: params.previousState ?? null,
      newState: params.newState ?? null,
      reason: params.reason ?? null,
      metadata: params.metadata ?? null,
      ipAddress: params.actor.ipAddress ?? null,
      userAgent: params.actor.userAgent ?? null,
      createdAt: new Date(),
    };

    // In production, this would write to the database
    // For now, log to console in development
    if (config.isDevelopment) {
      console.info('[Audit]', JSON.stringify(entry, null, 2));
    }

    // Database write would go here:
    // await prisma.conversationAuditLog.create({ data: entry });
  }
}

// Singleton instance
export const auditService = new AuditService();
