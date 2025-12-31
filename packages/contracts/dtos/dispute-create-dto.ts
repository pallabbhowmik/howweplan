/**
 * Dispute Create DTO
 * Data transfer object for creating disputes
 * 
 * Constitution rules enforced:
 * - Rule 13: Subjective complaints are NOT refundable
 * - Rule 15: Disputes require admin arbitration
 */

import type { DisputeCategory } from '../entities/dispute';

export interface DisputeCreateDTO {
  readonly bookingId: string;
  readonly category: DisputeCategory;
  readonly title: string;
  readonly description: string;
  readonly requestedRefundAmount: number;
  
  /** Initial evidence */
  readonly evidence: readonly {
    readonly type: 'text' | 'image' | 'document' | 'receipt' | 'communication_log';
    readonly description: string;
    readonly fileBase64: string | null;
    readonly fileName: string | null;
    readonly content: string | null;
  }[];
}

/**
 * Dispute Create Response DTO
 */
export interface DisputeCreateResponseDTO {
  readonly disputeId: string;
  readonly bookingId: string;
  readonly state: string;
  readonly category: DisputeCategory;
  /** Constitution rule 13: Warn user if subjective */
  readonly isSubjectiveComplaint: boolean;
  readonly subjectiveWarning: string | null;
  readonly deadlineAt: Date;
  readonly createdAt: Date;
}

/**
 * Dispute Summary DTO
 */
export interface DisputeSummaryDTO {
  readonly id: string;
  readonly bookingId: string;
  readonly state: string;
  readonly category: DisputeCategory;
  readonly title: string;
  readonly requestedRefundAmount: number;
  readonly isSubjectiveComplaint: boolean;
  readonly deadlineAt: Date;
  readonly createdAt: Date;
}

/**
 * Dispute Detail DTO
 */
export interface DisputeDetailDTO {
  readonly id: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly state: string;
  readonly category: DisputeCategory;
  readonly isSubjectiveComplaint: boolean;
  readonly title: string;
  readonly description: string;
  readonly requestedRefundAmount: number;
  readonly currency: string;
  readonly userEvidence: readonly {
    readonly id: string;
    readonly type: string;
    readonly description: string;
    readonly url: string | null;
    readonly submittedAt: Date;
  }[];
  readonly agentEvidence: readonly {
    readonly id: string;
    readonly type: string;
    readonly description: string;
    readonly url: string | null;
    readonly submittedAt: Date;
  }[];
  readonly assignedAdminId: string | null;
  readonly resolution: {
    readonly outcome: string;
    readonly refundAmount: number;
    readonly reasoning: string;
    readonly resolvedAt: Date;
  } | null;
  readonly deadlineAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Submit Evidence DTO
 */
export interface SubmitEvidenceDTO {
  readonly disputeId: string;
  readonly evidence: {
    readonly type: 'text' | 'image' | 'document' | 'receipt' | 'communication_log';
    readonly description: string;
    readonly fileBase64: string | null;
    readonly fileName: string | null;
    readonly content: string | null;
  };
}

/**
 * Resolve Dispute DTO (Admin only)
 * Constitution rules 13 & 15: Admin arbitration with reason
 */
export interface ResolveDisputeDTO {
  readonly disputeId: string;
  readonly outcome: 'user_favor' | 'agent_favor' | 'partial_refund' | 'no_action' | 'dismissed';
  readonly refundAmount: number;
  readonly refundPercentage: number;
  readonly reasoning: string;
  /** Required for admin actions (rule 8) */
  readonly adminReason: string;
}

/**
 * Resolve Dispute Response DTO
 */
export interface ResolveDisputeResponseDTO {
  readonly disputeId: string;
  readonly previousState: string;
  readonly newState: string;
  readonly outcome: string;
  readonly refundAmount: number;
  readonly isSubjectiveComplaint: boolean;
  readonly resolvedAt: Date;
}
