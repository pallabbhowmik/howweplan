/**
 * Data Transfer Objects (DTOs) for Dispute Service API
 * 
 * These DTOs define the shape of data coming into and going out
 * of the service. They are separate from domain types to allow
 * for API versioning and transformation.
 */

import { z } from 'zod';
import {
  DisputeCategory,
  DisputeState,
  EvidenceType,
  ResolutionType,
  SUBJECTIVE_COMPLAINT_CATEGORIES,
} from './domain.js';

// =============================================================================
// INPUT DTOs (Request bodies)
// =============================================================================

/**
 * DTO for creating a new dispute.
 */
export const DisputeCreateDTOSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  category: z.enum([
    'service_not_provided',
    'service_significantly_different',
    'safety_concern',
    'unauthorized_charges',
    'cancellation_policy',
    'agent_misconduct',
    'other',
  ] as const satisfies readonly DisputeCategory[]),
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be at most 5000 characters'),
});

export type DisputeCreateDTO = z.infer<typeof DisputeCreateDTOSchema>;

/**
 * DTO for submitting evidence.
 */
export const EvidenceSubmitDTOSchema = z.object({
  disputeId: z.string().uuid('Invalid dispute ID format'),
  type: z.enum([
    'photo',
    'document',
    'screenshot',
    'communication_log',
    'receipt',
    'video',
    'written_statement',
  ] as const satisfies readonly EvidenceType[]),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url('Invalid file URL'),
  fileSizeBytes: z.number().positive().max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
  mimeType: z.string().refine(
    (val) => ['image/jpeg', 'image/png', 'application/pdf'].includes(val),
    'Invalid MIME type. Allowed: jpeg, png, pdf'
  ),
  description: z.string().max(1000).optional(),
});

export type EvidenceSubmitDTO = z.infer<typeof EvidenceSubmitDTOSchema>;

/**
 * DTO for agent response to a dispute.
 */
export const AgentResponseDTOSchema = z.object({
  disputeId: z.string().uuid('Invalid dispute ID format'),
  response: z.string()
    .min(50, 'Response must be at least 50 characters')
    .max(5000, 'Response must be at most 5000 characters'),
  acceptsResponsibility: z.boolean(),
  proposedResolution: z.string().max(2000).optional(),
  evidenceIds: z.array(z.string().uuid()).optional().default([]),
});

export type AgentResponseDTO = z.infer<typeof AgentResponseDTOSchema>;

/**
 * DTO for admin arbitration decision.
 * CRITICAL: Admin reason is MANDATORY per business rules.
 */
export const AdminDecisionDTOSchema = z.object({
  disputeId: z.string().uuid('Invalid dispute ID format'),
  resolution: z.enum([
    'full_refund',
    'partial_refund',
    'credit_issued',
    'no_refund_objective',
    'no_refund_subjective',
  ] as const satisfies readonly Exclude<ResolutionType, 'withdrawn'>[]),
  refundAmount: z.number().nonnegative().optional(),
  reason: z.string()
    .min(20, 'Admin reason is mandatory and must be at least 20 characters')
    .max(2000, 'Reason must be at most 2000 characters'),
  internalNotes: z.string().max(5000).optional(),
}).refine(
  (data) => {
    // If partial refund, amount is required
    if (data.resolution === 'partial_refund') {
      return data.refundAmount !== undefined && data.refundAmount > 0;
    }
    return true;
  },
  { message: 'Refund amount is required for partial refunds', path: ['refundAmount'] }
);

export type AdminDecisionDTO = z.infer<typeof AdminDecisionDTOSchema>;

/**
 * DTO for admin escalation.
 */
export const AdminEscalateDTOSchema = z.object({
  disputeId: z.string().uuid('Invalid dispute ID format'),
  reason: z.string()
    .min(20, 'Escalation reason is mandatory and must be at least 20 characters')
    .max(2000, 'Reason must be at most 2000 characters'),
  priority: z.enum(['high', 'critical']),
});

export type AdminEscalateDTO = z.infer<typeof AdminEscalateDTOSchema>;

/**
 * DTO for admin adding notes.
 */
export const AdminNoteDTOSchema = z.object({
  disputeId: z.string().uuid('Invalid dispute ID format'),
  note: z.string()
    .min(10, 'Note must be at least 10 characters')
    .max(2000, 'Note must be at most 2000 characters'),
  isInternal: z.boolean().default(true),
});

export type AdminNoteDTO = z.infer<typeof AdminNoteDTOSchema>;

/**
 * DTO for traveler withdrawing a dispute.
 */
export const DisputeWithdrawDTOSchema = z.object({
  disputeId: z.string().uuid('Invalid dispute ID format'),
  reason: z.string()
    .min(10, 'Withdrawal reason must be at least 10 characters')
    .max(1000, 'Withdrawal reason must be at most 1000 characters'),
});

export type DisputeWithdrawDTO = z.infer<typeof DisputeWithdrawDTOSchema>;

// =============================================================================
// OUTPUT DTOs (Response bodies)
// =============================================================================

/**
 * Public dispute view for travelers.
 */
export interface DisputePublicDTO {
  id: string;
  bookingId: string;
  category: DisputeCategory;
  state: DisputeState;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  agentResponseDeadline: string | null;
  hasAgentResponse: boolean;
  resolution: {
    type: ResolutionType;
    refundAmount: number | null;
    currency: string;
    reason: string;
    resolvedAt: string;
  } | null;
}

/**
 * Agent view of a dispute (limited info).
 */
export interface DisputeAgentDTO {
  id: string;
  bookingId: string;
  category: DisputeCategory;
  state: DisputeState;
  title: string;
  description: string;
  createdAt: string;
  responseDeadline: string | null;
  travelerFirstName: string;
  hasSubmittedResponse: boolean;
}

/**
 * Admin view of a dispute (full details).
 */
export interface DisputeAdminDTO {
  id: string;
  bookingId: string;
  travelerId: string;
  agentId: string;
  category: DisputeCategory;
  state: DisputeState;
  title: string;
  description: string;
  isSubjectiveComplaint: boolean;
  bookingAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  agentResponseDeadline: string | null;
  adminAssignedId: string | null;
  adminAssignedAt: string | null;
  evidenceCount: number;
  hasAgentResponse: boolean;
  resolution: {
    type: ResolutionType;
    refundAmount: number | null;
    currency: string;
    adminId: string;
    reason: string;
    internalNotes: string | null;
    resolvedAt: string;
  } | null;
  metadata: {
    bookingStartDate: string;
    bookingEndDate: string;
    destination: string;
    disputeOpenedWithinWindow: boolean;
  };
}

/**
 * Evidence view DTO.
 */
export interface EvidenceDTO {
  id: string;
  disputeId: string;
  type: EvidenceType;
  source: 'traveler' | 'agent' | 'admin';
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  description: string | null;
  createdAt: string;
  isVerified: boolean;
}

/**
 * Agent response view DTO.
 */
export interface AgentResponseViewDTO {
  id: string;
  disputeId: string;
  response: string;
  acceptsResponsibility: boolean;
  proposedResolution: string | null;
  createdAt: string;
  evidence: EvidenceDTO[];
}

/**
 * Arbitration history entry DTO.
 */
export interface ArbitrationEntryDTO {
  id: string;
  action: string;
  adminId: string;
  adminName: string;
  reason: string;
  createdAt: string;
}

/**
 * Dispute list item for pagination.
 */
export interface DisputeListItemDTO {
  id: string;
  bookingId: string;
  category: DisputeCategory;
  state: DisputeState;
  title: string;
  createdAt: string;
  updatedAt: string;
  isHighPriority: boolean;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedDTO<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// =============================================================================
// QUERY DTOs (URL parameters)
// =============================================================================

/**
 * Query parameters for listing disputes.
 */
export const DisputeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  state: z.enum([
    'pending_evidence',
    'evidence_submitted',
    'agent_responded',
    'under_admin_review',
    'escalated',
    'resolved_refund',
    'resolved_partial',
    'resolved_denied',
    'closed_withdrawn',
    'closed_expired',
  ] as const satisfies readonly DisputeState[]).optional(),
  category: z.enum([
    'service_not_provided',
    'service_significantly_different',
    'safety_concern',
    'unauthorized_charges',
    'cancellation_policy',
    'agent_misconduct',
    'other',
  ] as const satisfies readonly DisputeCategory[]).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'state']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type DisputeListQuery = z.infer<typeof DisputeListQuerySchema>;

/**
 * Admin queue query parameters.
 */
export const AdminQueueQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  assignedToMe: z.coerce.boolean().optional(),
  unassigned: z.coerce.boolean().optional(),
  priority: z.enum(['all', 'high', 'escalated']).default('all'),
  state: z.enum([
    'evidence_submitted',
    'agent_responded',
    'under_admin_review',
    'escalated',
  ]).optional(),
});

export type AdminQueueQuery = z.infer<typeof AdminQueueQuerySchema>;
