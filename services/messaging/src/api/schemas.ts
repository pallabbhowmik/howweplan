/**
 * Messaging Service - API Request/Response Schemas
 *
 * Zod schemas for validating all API inputs.
 * ARCHITECTURE RULE: Validate all inputs, even from internal services.
 */

import { z } from 'zod';
import {
  ConversationState,
  MessageType,
  ParticipantType,
} from '../types';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const actorContextSchema = z.object({
  actorId: uuidSchema,
  actorType: z.nativeEnum(ParticipantType),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
});

// =============================================================================
// CONVERSATION SCHEMAS
// =============================================================================

export const createConversationSchema = z.object({
  bookingId: uuidSchema.nullable().optional(),
  userId: uuidSchema,
  agentId: uuidSchema,
});

export const updateConversationStateSchema = z.object({
  state: z.nativeEnum(ConversationState),
  reason: z.string().min(1).max(500).optional(),
});

export const getConversationSchema = z.object({
  conversationId: uuidSchema,
});

export const listConversationsSchema = z.object({
  userId: uuidSchema.optional(),
  agentId: uuidSchema.optional(),
  bookingId: uuidSchema.optional(),
  state: z.nativeEnum(ConversationState).optional(),
  pagination: paginationSchema.optional(),
});

// =============================================================================
// MESSAGE SCHEMAS
// =============================================================================

export const sendMessageSchema = z.object({
  conversationId: uuidSchema,
  content: z.string().min(1).max(5000),
  messageType: z.nativeEnum(MessageType).default('TEXT'),
  metadata: z.record(z.unknown()).optional(),
  attachmentIds: z.array(uuidSchema).max(5).optional(),
});

export const editMessageSchema = z.object({
  messageId: uuidSchema,
  content: z.string().min(1).max(5000),
});

export const deleteMessageSchema = z.object({
  messageId: uuidSchema,
  reason: z.string().min(1).max(500).optional(),
});

export const getMessagesSchema = z.object({
  conversationId: uuidSchema,
  pagination: paginationSchema.optional(),
});

export const getMessageSchema = z.object({
  messageId: uuidSchema,
});

// =============================================================================
// READ RECEIPT SCHEMAS
// =============================================================================

export const markMessagesReadSchema = z.object({
  conversationId: uuidSchema,
  messageIds: z.array(uuidSchema).min(1).max(100),
});

// =============================================================================
// REACTION SCHEMAS
// =============================================================================

export const addReactionSchema = z.object({
  messageId: uuidSchema,
  emoji: z.string().min(1).max(10),
});

export const removeReactionSchema = z.object({
  messageId: uuidSchema,
  emoji: z.string().min(1).max(10),
});

// =============================================================================
// ATTACHMENT SCHEMAS
// =============================================================================

export const uploadAttachmentSchema = z.object({
  conversationId: uuidSchema,
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

export const getAttachmentSchema = z.object({
  attachmentId: uuidSchema,
});

// =============================================================================
// EVIDENCE EXPORT SCHEMAS
// =============================================================================

export const exportEvidenceSchema = z.object({
  conversationId: uuidSchema,
  reason: z.string().min(10).max(1000),
  includeAttachments: z.boolean().default(true),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
});

export const getEvidenceExportSchema = z.object({
  exportId: uuidSchema,
});

// =============================================================================
// ADMIN SCHEMAS
// =============================================================================

export const adminUpdateConversationSchema = z.object({
  conversationId: uuidSchema,
  state: z.nativeEnum(ConversationState).optional(),
  contactsRevealed: z.boolean().optional(),
  /** Required for all admin actions */
  reason: z.string().min(10).max(1000),
});

export const adminDeleteMessageSchema = z.object({
  messageId: uuidSchema,
  /** Required for all admin actions */
  reason: z.string().min(10).max(1000),
});

export const adminExportEvidenceSchema = z.object({
  conversationId: uuidSchema,
  /** Required for all admin actions */
  reason: z.string().min(10).max(1000),
  includeOriginalContent: z.boolean().default(false),
});

// =============================================================================
// WEBHOOK SCHEMAS (Internal Service Communication)
// =============================================================================

export const bookingStateWebhookSchema = z.object({
  bookingId: uuidSchema,
  userId: uuidSchema,
  agentId: uuidSchema,
  previousState: z.string(),
  newState: z.string(),
  isPaid: z.boolean(),
  isConfirmed: z.boolean(),
  timestamp: z.string().datetime(),
});

export const revealContactsWebhookSchema = z.object({
  conversationId: uuidSchema,
  bookingId: uuidSchema,
  triggerState: z.string(),
  timestamp: z.string().datetime(),
});

// =============================================================================
// TYPING INDICATOR SCHEMAS
// =============================================================================

export const typingIndicatorSchema = z.object({
  conversationId: uuidSchema,
  isTyping: z.boolean(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationStateInput = z.infer<typeof updateConversationStateSchema>;
export type GetConversationInput = z.infer<typeof getConversationSchema>;
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type GetMessageInput = z.infer<typeof getMessageSchema>;

export type MarkMessagesReadInput = z.infer<typeof markMessagesReadSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type RemoveReactionInput = z.infer<typeof removeReactionSchema>;

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;
export type GetAttachmentInput = z.infer<typeof getAttachmentSchema>;

export type ExportEvidenceInput = z.infer<typeof exportEvidenceSchema>;
export type GetEvidenceExportInput = z.infer<typeof getEvidenceExportSchema>;

export type AdminUpdateConversationInput = z.infer<typeof adminUpdateConversationSchema>;
export type AdminDeleteMessageInput = z.infer<typeof adminDeleteMessageSchema>;
export type AdminExportEvidenceInput = z.infer<typeof adminExportEvidenceSchema>;

export type BookingStateWebhookInput = z.infer<typeof bookingStateWebhookSchema>;
export type RevealContactsWebhookInput = z.infer<typeof revealContactsWebhookSchema>;

export type TypingIndicatorInput = z.infer<typeof typingIndicatorSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ActorContext = z.infer<typeof actorContextSchema>;
