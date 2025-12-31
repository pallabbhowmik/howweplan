/**
 * Admin Action Types
 * 
 * All admin actions MUST include a reason and are audit-logged.
 * This is enforced at the type level and validated at runtime.
 */

// ============================================================================
// CORE ADMIN ACTION CONTRACT
// ============================================================================

/**
 * Base interface for ALL admin actions.
 * Every action MUST include a reason - this is non-negotiable.
 */
export interface AdminActionBase {
  /** The admin user performing the action */
  readonly adminId: string;
  /** REQUIRED: Reason for performing this action. Minimum 10 characters. */
  readonly reason: string;
  /** Timestamp when action was initiated */
  readonly timestamp: string;
  /** Correlation ID for tracing */
  readonly correlationId: string;
}

/**
 * Validates that a reason meets minimum requirements
 */
export function validateReason(reason: string): boolean {
  return reason.trim().length >= 10;
}

/**
 * Throws if reason is invalid - use at action boundaries
 */
export function assertValidReason(reason: string): asserts reason is string {
  if (!validateReason(reason)) {
    throw new Error('Admin action reason must be at least 10 characters');
  }
}

// ============================================================================
// AGENT MANAGEMENT TYPES
// ============================================================================

export type AgentStatus = 
  | 'pending_approval'
  | 'approved'
  | 'suspended'
  | 'rejected'
  | 'deactivated';

export interface Agent {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly photoUrl: string | null;
  readonly status: AgentStatus;
  readonly applicationDate: string;
  readonly approvalDate: string | null;
  readonly suspensionDate: string | null;
  readonly totalBookings: number;
  readonly completedBookings: number;
  readonly disputeCount: number;
  readonly averageRating: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApproveAgentAction extends AdminActionBase {
  readonly type: 'AGENT_APPROVE';
  readonly agentId: string;
}

export interface SuspendAgentAction extends AdminActionBase {
  readonly type: 'AGENT_SUSPEND';
  readonly agentId: string;
  readonly suspensionDurationDays: number | null; // null = indefinite
}

export interface ReactivateAgentAction extends AdminActionBase {
  readonly type: 'AGENT_REACTIVATE';
  readonly agentId: string;
}

export interface RejectAgentAction extends AdminActionBase {
  readonly type: 'AGENT_REJECT';
  readonly agentId: string;
}

export type AgentAction = 
  | ApproveAgentAction 
  | SuspendAgentAction 
  | ReactivateAgentAction 
  | RejectAgentAction;

// ============================================================================
// MATCHING OVERRIDE TYPES
// ============================================================================

export type MatchingOverrideType = 
  | 'force_assign'
  | 'force_unassign'
  | 'priority_boost'
  | 'blacklist';

export interface MatchingOverride {
  readonly id: string;
  readonly type: MatchingOverrideType;
  readonly tripRequestId: string;
  readonly agentId: string | null;
  readonly expiresAt: string | null;
  readonly createdBy: string;
  readonly reason: string;
  readonly createdAt: string;
  readonly isActive: boolean;
}

export interface CreateMatchingOverrideAction extends AdminActionBase {
  readonly type: 'MATCHING_OVERRIDE_CREATE';
  readonly overrideType: MatchingOverrideType;
  readonly tripRequestId: string;
  readonly agentId: string | null;
  readonly expiresAt: string | null;
}

export interface CancelMatchingOverrideAction extends AdminActionBase {
  readonly type: 'MATCHING_OVERRIDE_CANCEL';
  readonly overrideId: string;
}

export type MatchingAction = 
  | CreateMatchingOverrideAction 
  | CancelMatchingOverrideAction;

// ============================================================================
// DISPUTE TYPES
// ============================================================================

export type DisputeStatus = 
  | 'opened'
  | 'under_review'
  | 'pending_user_response'
  | 'pending_agent_response'
  | 'resolved_user_favor'
  | 'resolved_agent_favor'
  | 'resolved_partial'
  | 'closed_no_action';

export type DisputeCategory =
  | 'service_not_delivered'
  | 'service_quality'
  | 'pricing_discrepancy'
  | 'communication_issue'
  | 'safety_concern'
  | 'fraud_suspected'
  | 'other';

export interface Dispute {
  readonly id: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly category: DisputeCategory;
  readonly status: DisputeStatus;
  readonly description: string;
  readonly userEvidence: readonly string[];
  readonly agentEvidence: readonly string[];
  readonly adminNotes: readonly AdminNote[];
  readonly refundAmount: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt: string | null;
  readonly resolvedBy: string | null;
}

export interface AdminNote {
  readonly id: string;
  readonly adminId: string;
  readonly content: string;
  readonly isInternal: boolean;
  readonly createdAt: string;
}

export interface UpdateDisputeStatusAction extends AdminActionBase {
  readonly type: 'DISPUTE_UPDATE_STATUS';
  readonly disputeId: string;
  readonly newStatus: DisputeStatus;
}

export interface AddDisputeNoteAction extends AdminActionBase {
  readonly type: 'DISPUTE_ADD_NOTE';
  readonly disputeId: string;
  readonly content: string;
  readonly isInternal: boolean;
}

export interface ResolveDisputeAction extends AdminActionBase {
  readonly type: 'DISPUTE_RESOLVE';
  readonly disputeId: string;
  readonly resolution: DisputeStatus;
  readonly refundAmount: number | null;
  readonly resolutionSummary: string;
}

export type DisputeAction = 
  | UpdateDisputeStatusAction 
  | AddDisputeNoteAction 
  | ResolveDisputeAction;

// ============================================================================
// REFUND TYPES
// ============================================================================

/**
 * Refund lifecycle follows strict state machine.
 * State transitions are validated and audit-logged.
 */
export type RefundStatus = 
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed';

export type RefundReason =
  | 'dispute_resolution'
  | 'service_cancellation'
  | 'duplicate_charge'
  | 'agent_no_show'
  | 'platform_error'
  | 'goodwill';

export interface Refund {
  readonly id: string;
  readonly bookingId: string;
  readonly disputeId: string | null;
  readonly userId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: RefundStatus;
  readonly reason: RefundReason;
  readonly adminNotes: string;
  readonly stripeRefundId: string | null;
  readonly requestedAt: string;
  readonly processedAt: string | null;
  readonly processedBy: string | null;
}

/**
 * Valid state transitions for refunds.
 * Enforced at runtime - invalid transitions throw errors.
 */
export const REFUND_STATE_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  pending_review: ['approved', 'rejected'],
  approved: ['processing'],
  rejected: [], // Terminal state
  processing: ['completed', 'failed'],
  completed: [], // Terminal state
  failed: ['processing', 'rejected'], // Can retry or reject
} as const;

export function canTransitionRefund(from: RefundStatus, to: RefundStatus): boolean {
  return REFUND_STATE_TRANSITIONS[from].includes(to);
}

export interface ApproveRefundAction extends AdminActionBase {
  readonly type: 'REFUND_APPROVE';
  readonly refundId: string;
  readonly adjustedAmount: number | null; // null = use original amount
}

export interface RejectRefundAction extends AdminActionBase {
  readonly type: 'REFUND_REJECT';
  readonly refundId: string;
}

export interface TriggerRefundAction extends AdminActionBase {
  readonly type: 'REFUND_TRIGGER';
  readonly bookingId: string;
  readonly amount: number;
  readonly reason: RefundReason;
}

export type RefundAction = 
  | ApproveRefundAction 
  | RejectRefundAction 
  | TriggerRefundAction;

// ============================================================================
// COMBINED ACTION TYPES
// ============================================================================

export type AdminAction = 
  | AgentAction 
  | MatchingAction 
  | DisputeAction 
  | RefundAction;

export type AdminActionType = AdminAction['type'];
