/**
 * Messaging Service - Event Contracts
 *
 * Defines all events emitted and consumed by the messaging service.
 * Events are the ONLY mechanism for inter-service communication.
 *
 * ARCHITECTURE RULE: Modules communicate ONLY via shared contracts and event bus.
 */

import {
  AuditAction,
  ConversationState,
  MessageType,
  ParticipantType,
} from '../types';

// =============================================================================
// EVENT BASE
// =============================================================================

/**
 * Base structure for all events in the system.
 * Every event MUST include these fields for audit and tracing.
 */
export interface BaseEvent {
  /** Unique event ID (UUID v4) */
  eventId: string;
  /** Event type identifier */
  eventType: string;
  /** ISO 8601 timestamp when event was created */
  timestamp: string;
  /** Service that emitted the event */
  source: string;
  /** Correlation ID for distributed tracing */
  correlationId: string;
  /** Causation ID (eventId of the event that caused this one) */
  causationId?: string;
  /** Schema version for backward compatibility */
  version: number;
}

// =============================================================================
// EVENTS EMITTED BY MESSAGING SERVICE
// =============================================================================

/**
 * Emitted when a new conversation is created.
 */
export interface ConversationCreatedEvent extends BaseEvent {
  eventType: 'messaging.conversation.created';
  payload: {
    conversationId: string;
    bookingId: string | null;
    userId: string;
    agentId: string;
    state: ConversationState;
    createdAt: string;
  };
}

/**
 * Emitted when conversation state changes.
 */
export interface ConversationStateChangedEvent extends BaseEvent {
  eventType: 'messaging.conversation.state_changed';
  payload: {
    conversationId: string;
    previousState: ConversationState;
    newState: ConversationState;
    changedBy: string;
    changedByType: ParticipantType;
    reason?: string;
  };
}

/**
 * Emitted when a message is sent.
 * BUSINESS RULE: All messages are auditable.
 */
export interface MessageSentEvent extends BaseEvent {
  eventType: 'messaging.message.sent';
  payload: {
    messageId: string;
    conversationId: string;
    bookingId: string | null;
    senderId: string;
    senderType: ParticipantType;
    messageType: MessageType;
    /** Whether content was masked before storage */
    wasMasked: boolean;
    /** Content hash for integrity verification (not the actual content) */
    contentHash: string;
    hasAttachments: boolean;
    attachmentCount: number;
    sentAt: string;
  };
}

/**
 * Emitted when a message is edited.
 */
export interface MessageEditedEvent extends BaseEvent {
  eventType: 'messaging.message.edited';
  payload: {
    messageId: string;
    conversationId: string;
    editedBy: string;
    editedAt: string;
    /** Hash of new content */
    newContentHash: string;
  };
}

/**
 * Emitted when a message is deleted.
 */
export interface MessageDeletedEvent extends BaseEvent {
  eventType: 'messaging.message.deleted';
  payload: {
    messageId: string;
    conversationId: string;
    deletedBy: string;
    deletedByType: ParticipantType;
    deletedAt: string;
    reason?: string;
  };
}

/**
 * Emitted when contact details are revealed (after payment).
 * BUSINESS RULE: Full contact details released ONLY after payment.
 */
export interface ContactsRevealedEvent extends BaseEvent {
  eventType: 'messaging.contacts.revealed';
  payload: {
    conversationId: string;
    bookingId: string;
    userId: string;
    agentId: string;
    revealedAt: string;
    /** The booking state that triggered the reveal */
    triggerState: string;
  };
}

/**
 * Emitted when content is masked in a message.
 * BUSINESS RULE: No direct contact pre-payment.
 */
export interface ContentMaskedEvent extends BaseEvent {
  eventType: 'messaging.content.masked';
  payload: {
    messageId: string;
    conversationId: string;
    senderId: string;
    /** Types of patterns that were masked */
    maskedTypes: ('email' | 'phone' | 'url' | 'social')[];
    /** Number of patterns masked */
    maskedCount: number;
    maskedAt: string;
  };
}

/**
 * Emitted when a participant joins a conversation.
 */
export interface ParticipantJoinedEvent extends BaseEvent {
  eventType: 'messaging.participant.joined';
  payload: {
    conversationId: string;
    participantId: string;
    participantType: ParticipantType;
    displayName: string;
    joinedAt: string;
  };
}

/**
 * Emitted when a participant leaves a conversation.
 */
export interface ParticipantLeftEvent extends BaseEvent {
  eventType: 'messaging.participant.left';
  payload: {
    conversationId: string;
    participantId: string;
    participantType: ParticipantType;
    leftAt: string;
    reason?: string;
  };
}

/**
 * Emitted when a conversation is marked as disputed.
 */
export interface ConversationDisputedEvent extends BaseEvent {
  eventType: 'messaging.conversation.disputed';
  payload: {
    conversationId: string;
    bookingId: string;
    disputeId: string;
    disputedBy: string;
    disputedByType: ParticipantType;
    reason: string;
    disputedAt: string;
  };
}

/**
 * Emitted when evidence is exported for a dispute.
 */
export interface EvidenceExportedEvent extends BaseEvent {
  eventType: 'messaging.evidence.exported';
  payload: {
    exportId: string;
    conversationId: string;
    bookingId: string | null;
    requestedBy: string;
    requestedByType: ParticipantType;
    reason: string;
    /** Hash of exported content for integrity */
    contentHash: string;
    messageCount: number;
    exportedAt: string;
    expiresAt: string;
  };
}

/**
 * Emitted when a conversation is archived.
 */
export interface ConversationArchivedEvent extends BaseEvent {
  eventType: 'messaging.conversation.archived';
  payload: {
    conversationId: string;
    bookingId: string | null;
    archivedAt: string;
    /** Scheduled deletion date based on retention policy */
    scheduledDeletionAt: string;
  };
}

/**
 * Emitted for any admin action on messaging.
 * BUSINESS RULE: All admin actions require reason and are audit-logged.
 */
export interface AdminActionEvent extends BaseEvent {
  eventType: 'messaging.admin.action';
  payload: {
    action: AuditAction;
    targetType: 'conversation' | 'message' | 'participant';
    targetId: string;
    adminId: string;
    /** Required reason for admin action */
    reason: string;
    previousState: Record<string, unknown> | null;
    newState: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
  };
}

// =============================================================================
// EVENTS CONSUMED BY MESSAGING SERVICE
// =============================================================================

/**
 * Consumed from Booking Service when booking state changes.
 * Used to determine when to reveal contacts.
 */
export interface BookingStateChangedEvent extends BaseEvent {
  eventType: 'booking.state.changed';
  payload: {
    bookingId: string;
    userId: string;
    agentId: string;
    previousState: string;
    newState: string;
    /** Whether payment has been completed */
    isPaid: boolean;
    /** Whether agent has confirmed */
    isConfirmed: boolean;
  };
}

/**
 * Consumed from Identity Service when user identity is verified.
 * Used to update display names and visibility.
 */
export interface IdentityVerifiedEvent extends BaseEvent {
  eventType: 'identity.user.verified';
  payload: {
    userId: string;
    userType: 'user' | 'agent';
    displayName: string;
    photoUrl: string | null;
  };
}

/**
 * Consumed from Dispute Service when dispute is created.
 * Used to mark conversation as disputed and prepare evidence.
 */
export interface DisputeCreatedEvent extends BaseEvent {
  eventType: 'dispute.created';
  payload: {
    disputeId: string;
    bookingId: string;
    userId: string;
    agentId: string;
    reason: string;
    createdAt: string;
  };
}

/**
 * Consumed from Dispute Service when dispute is resolved.
 * Used to update conversation state.
 */
export interface DisputeResolvedEvent extends BaseEvent {
  eventType: 'dispute.resolved';
  payload: {
    disputeId: string;
    bookingId: string;
    resolution: 'user_favor' | 'agent_favor' | 'split' | 'dismissed';
    resolvedAt: string;
  };
}

// =============================================================================
// EVENT TYPE UNIONS
// =============================================================================

/**
 * All events emitted by the messaging service.
 */
export type MessagingEmittedEvent =
  | ConversationCreatedEvent
  | ConversationStateChangedEvent
  | MessageSentEvent
  | MessageEditedEvent
  | MessageDeletedEvent
  | ContactsRevealedEvent
  | ContentMaskedEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent
  | ConversationDisputedEvent
  | EvidenceExportedEvent
  | ConversationArchivedEvent
  | AdminActionEvent;

/**
 * All events consumed by the messaging service.
 */
export type MessagingConsumedEvent =
  | BookingStateChangedEvent
  | IdentityVerifiedEvent
  | DisputeCreatedEvent
  | DisputeResolvedEvent;

/**
 * All event types handled by the messaging service.
 */
export type MessagingEvent = MessagingEmittedEvent | MessagingConsumedEvent;

// =============================================================================
// EVENT TYPE CONSTANTS
// =============================================================================

export const EMITTED_EVENT_TYPES = {
  CONVERSATION_CREATED: 'messaging.conversation.created',
  CONVERSATION_STATE_CHANGED: 'messaging.conversation.state_changed',
  MESSAGE_SENT: 'messaging.message.sent',
  MESSAGE_EDITED: 'messaging.message.edited',
  MESSAGE_DELETED: 'messaging.message.deleted',
  CONTACTS_REVEALED: 'messaging.contacts.revealed',
  CONTENT_MASKED: 'messaging.content.masked',
  PARTICIPANT_JOINED: 'messaging.participant.joined',
  PARTICIPANT_LEFT: 'messaging.participant.left',
  CONVERSATION_DISPUTED: 'messaging.conversation.disputed',
  EVIDENCE_EXPORTED: 'messaging.evidence.exported',
  CONVERSATION_ARCHIVED: 'messaging.conversation.archived',
  ADMIN_ACTION: 'messaging.admin.action',
} as const;

export const CONSUMED_EVENT_TYPES = {
  BOOKING_STATE_CHANGED: 'booking.state.changed',
  IDENTITY_VERIFIED: 'identity.user.verified',
  DISPUTE_CREATED: 'dispute.created',
  DISPUTE_RESOLVED: 'dispute.resolved',
} as const;
