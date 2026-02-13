/**
 * Messaging Service - TypeScript Type Definitions
 *
 * Core types for the messaging domain.
 */

// =============================================================================
// ENUMS
// =============================================================================

export const ConversationState = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
  DISPUTED: 'DISPUTED',
} as const;

export type ConversationState =
  (typeof ConversationState)[keyof typeof ConversationState];

export const ParticipantType = {
  USER: 'USER',
  AGENT: 'AGENT',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM',
} as const;

export type ParticipantType =
  (typeof ParticipantType)[keyof typeof ParticipantType];

export const MessageType = {
  TEXT: 'TEXT',
  SYSTEM: 'SYSTEM',
  ATTACHMENT: 'ATTACHMENT',
  ITINERARY_PREVIEW: 'ITINERARY_PREVIEW',
  PAYMENT_CONFIRMATION: 'PAYMENT_CONFIRMATION',
  CONTACT_REVEAL: 'CONTACT_REVEAL',
  BOOKING_UPDATE: 'BOOKING_UPDATE',
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const AuditAction = {
  CONVERSATION_CREATED: 'CONVERSATION_CREATED',
  STATE_CHANGED: 'STATE_CHANGED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_EDITED: 'MESSAGE_EDITED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  CONTACTS_REVEALED: 'CONTACTS_REVEALED',
  PARTICIPANT_JOINED: 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT: 'PARTICIPANT_LEFT',
  ARCHIVED: 'ARCHIVED',
  MARKED_DISPUTED: 'MARKED_DISPUTED',
  EVIDENCE_EXPORTED: 'EVIDENCE_EXPORTED',
  ADMIN_ACTION: 'ADMIN_ACTION',
  CONTENT_MASKED: 'CONTENT_MASKED',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface Conversation {
  id: string;
  bookingId: string | null;
  userId: string;
  agentId: string;
  state: ConversationState;
  contactsRevealed: boolean;
  bookingState: string | null;
  createdAt: Date;
  updatedAt: Date;
  contactsRevealedAt: Date | null;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  participantId: string;
  participantType: ParticipantType;
  displayName: string;
  identityRevealed: boolean;
  lastSeenAt: Date | null;
  hasLeft: boolean;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: ParticipantType;
  content: string;
  originalContent: string | null;
  wasMasked: boolean;
  messageType: MessageType;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  editedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
}

export interface MessageReadReceipt {
  id: string;
  messageId: string;
  readById: string;
  readAt: Date;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  reactedById: string;
  emoji: string;
  createdAt: Date;
}

export interface ConversationAuditLog {
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

export interface EvidenceExport {
  id: string;
  conversationId: string;
  requestedById: string;
  requesterType: ParticipantType;
  reason: string;
  storageKey: string;
  contentHash: string;
  encryptionKeyId: string;
  createdAt: Date;
  expiresAt: Date;
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

export interface ConversationWithParticipants extends Conversation {
  participants: ConversationParticipant[];
}

export interface ConversationWithMessages extends Conversation {
  messages: MessageWithDetails[];
  participants: ConversationParticipant[];
}

export interface MessageWithDetails extends Message {
  attachments: MessageAttachment[];
  readReceipts: MessageReadReceipt[];
  reactions: MessageReaction[];
}

// =============================================================================
// VIEW MODELS (API Responses)
// =============================================================================

/**
 * Conversation as seen by a user (may have masked data)
 */
export interface ConversationView {
  id: string;
  bookingId: string | null;
  state: ConversationState;
  contactsRevealed: boolean;
  createdAt: string;
  updatedAt: string;
  participants: ParticipantView[];
  lastMessage: MessageView | null;
  unreadCount: number;
}

/**
 * Participant as seen by other participants
 */
export interface ParticipantView {
  id: string;
  participantType: ParticipantType;
  displayName: string;
  /** Only shown if identity is revealed */
  fullName?: string;
  /** Only shown if identity is revealed */
  photoUrl?: string;
  /** Only shown if contacts are revealed */
  email?: string;
  /** Only shown if contacts are revealed */
  phone?: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

/**
 * Message as seen by participants (content may be masked)
 */
export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: ParticipantType;
  senderDisplayName: string;
  content: string;
  wasMasked: boolean;
  messageType: MessageType;
  attachments: AttachmentView[];
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  readBy: string[];
  reactions: ReactionView[];
}

export interface AttachmentView {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  thumbnailUrl: string | null;
}

export interface ReactionView {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

// =============================================================================
// IDENTITY CONTEXT (from Identity Service)
// =============================================================================

export interface IdentityContext {
  userId: string;
  userType: ParticipantType;
  displayName: string;
  fullName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  isVerified: boolean;
}

// =============================================================================
// BOOKING STATE (from Booking Service)
// =============================================================================

export const BookingState = {
  /** Initial state, no payment */
  INQUIRY: 'INQUIRY',
  /** Agent has submitted proposal */
  PROPOSED: 'PROPOSED',
  /** User has accepted proposal */
  ACCEPTED: 'ACCEPTED',
  /** Payment initiated */
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  /** Payment completed */
  PAID: 'PAID',
  /** Booking confirmed by agent */
  CONFIRMED: 'CONFIRMED',
  /** Travel completed */
  COMPLETED: 'COMPLETED',
  /** Booking cancelled */
  CANCELLED: 'CANCELLED',
  /** Dispute in progress */
  DISPUTED: 'DISPUTED',
  /** Refund issued */
  REFUNDED: 'REFUNDED',
} as const;

export type BookingState = (typeof BookingState)[keyof typeof BookingState];

export interface BookingContext {
  bookingId: string;
  state: BookingState;
  userId: string;
  agentId: string;
  /** Whether payment has been completed */
  isPaid: boolean;
  /** Whether agent has confirmed */
  isConfirmed: boolean;
}

// =============================================================================
// MASKING
// =============================================================================

export interface MaskingResult {
  maskedContent: string;
  wasMasked: boolean;
  maskedPatterns: MaskedPattern[];
}

export interface MaskedPattern {
  type: 'email' | 'phone' | 'url' | 'social';
  original: string;
  masked: string;
  startIndex: number;
  endIndex: number;
}

// =============================================================================
// PAGINATION
// =============================================================================

export interface PaginationParams {
  cursor?: string;
  limit: number;
  direction: 'forward' | 'backward';
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  previousCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}
