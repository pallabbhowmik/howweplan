/**
 * Message Entity
 * Represents a chat message between users and agents
 * 
 * Constitution rule enforced:
 * - Rule 12: Platform chat is mandatory before payment
 */

export type MessageType = 'text' | 'image' | 'file' | 'itinerary_link' | 'system';

export type MessageSender = 'user' | 'agent' | 'system';

export interface MessageAttachment {
  readonly id: string;
  readonly type: 'image' | 'pdf' | 'document';
  readonly url: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
}

export interface Message {
  readonly id: string;
  readonly conversationId: string;
  readonly senderId: string;
  readonly senderType: MessageSender;
  readonly type: MessageType;
  readonly content: string;
  readonly attachments: readonly MessageAttachment[];
  readonly replyToMessageId: string | null;
  readonly isRead: boolean;
  readonly readAt: Date | null;
  readonly isEdited: boolean;
  readonly editedAt: Date | null;
  readonly isDeleted: boolean;
  readonly deletedAt: Date | null;
  readonly metadata: Record<string, string>;
  readonly createdAt: Date;
}

/**
 * Conversation thread between user and agent
 */
export interface Conversation {
  readonly id: string;
  readonly requestId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly lastMessageAt: Date | null;
  readonly lastMessagePreview: string | null;
  readonly unreadCountUser: number;
  readonly unreadCountAgent: number;
  readonly isActive: boolean;
  readonly chatRequirementMet: boolean; // Constitution rule 12
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * System message templates for automated notifications
 */
export type SystemMessageTemplate =
  | 'agent_matched'
  | 'agent_confirmed'
  | 'itinerary_submitted'
  | 'payment_received'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'dispute_opened'
  | 'dispute_resolved';
