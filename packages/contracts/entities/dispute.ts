/**
 * Dispute Entity
 * Represents a dispute between user and agent
 * 
 * Constitution rules enforced:
 * - Rule 13: Subjective complaints are NOT refundable
 * - Rule 15: Disputes require admin arbitration
 */

import type { DisputeState } from '../states/dispute-state';

export type DisputeCategory =
  | 'service_not_provided'
  | 'incorrect_service'
  | 'quality_issue'
  | 'safety_concern'
  | 'vendor_no_show'
  | 'booking_not_honored'
  | 'overcharge'
  | 'communication_issue'
  | 'other';

/**
 * Categories that are considered subjective (non-refundable per rule 13)
 */
export const SUBJECTIVE_DISPUTE_CATEGORIES: readonly DisputeCategory[] = [
  'quality_issue',
  'communication_issue',
] as const;

/**
 * Categories that may be eligible for refund
 */
export const REFUNDABLE_DISPUTE_CATEGORIES: readonly DisputeCategory[] = [
  'service_not_provided',
  'incorrect_service',
  'vendor_no_show',
  'booking_not_honored',
  'overcharge',
  'safety_concern',
] as const;

export interface DisputeEvidence {
  readonly id: string;
  readonly submittedBy: 'user' | 'agent';
  readonly type: 'text' | 'image' | 'document' | 'receipt' | 'communication_log';
  readonly description: string;
  readonly url: string | null;
  readonly content: string | null;
  readonly submittedAt: Date;
}

export interface DisputeResolution {
  readonly outcome: 'user_favor' | 'agent_favor' | 'partial_refund' | 'no_action' | 'dismissed';
  readonly refundAmount: number;
  readonly refundPercentage: number;
  readonly reasoning: string;
  readonly resolvedBy: string; // Admin ID
  readonly resolvedAt: Date;
  readonly isSubjectiveComplaint: boolean;
}

export interface Dispute {
  readonly id: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly state: DisputeState;
  readonly category: DisputeCategory;
  readonly isSubjectiveComplaint: boolean; // Rule 13 flag
  readonly title: string;
  readonly description: string;
  readonly userEvidence: readonly DisputeEvidence[];
  readonly agentEvidence: readonly DisputeEvidence[];
  readonly requestedRefundAmount: number;
  readonly assignedAdminId: string | null;
  readonly resolution: DisputeResolution | null;
  readonly escalatedAt: Date | null;
  readonly deadlineAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Dispute timeline entry for audit trail
 */
export interface DisputeTimelineEntry {
  readonly id: string;
  readonly disputeId: string;
  readonly action: string;
  readonly performedBy: string;
  readonly performedByType: 'user' | 'agent' | 'admin' | 'system';
  readonly details: string;
  readonly createdAt: Date;
}
