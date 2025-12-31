/**
 * Refund API Service
 * 
 * All refund operations following strict lifecycle state machine.
 * EVERY action requires a reason and is audit-logged.
 */

import { bookingPaymentsApiClient, buildPaginationParams } from './client';
import { auditLogger, createActionBase, ACTION_DESCRIPTIONS, ACTION_SEVERITY, getActionCategory } from '@/lib/audit';
import type { AdminActionContext } from '@/lib/audit';
import type {
  Refund,
  RefundStatus,
  RefundReason,
  PaginationParams,
  PaginatedResponse,
  SortParams,
  canTransitionRefund,
} from '@/types';

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface RefundFilters {
  readonly status?: RefundStatus;
  readonly reason?: RefundReason;
  readonly userId?: string;
  readonly bookingId?: string;
  readonly disputeId?: string;
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface RefundQueryParams extends PaginationParams {
  readonly filters?: RefundFilters;
  readonly sort?: SortParams<'requestedAt' | 'amount' | 'status'>;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface RefundDetails extends Refund {
  readonly booking: BookingInfo;
  readonly user: UserInfo;
  readonly dispute: DisputeInfo | null;
  readonly auditTrail: readonly RefundAuditEntry[];
}

interface BookingInfo {
  readonly id: string;
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: string;
}

interface UserInfo {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}

interface DisputeInfo {
  readonly id: string;
  readonly status: string;
  readonly category: string;
}

interface RefundAuditEntry {
  readonly action: string;
  readonly fromStatus: RefundStatus | null;
  readonly toStatus: RefundStatus;
  readonly adminEmail: string;
  readonly reason: string;
  readonly timestamp: string;
}

// ============================================================================
// STATE MACHINE VALIDATION
// ============================================================================

/**
 * Valid state transitions for refunds.
 * Enforced at runtime - invalid transitions throw errors.
 */
const REFUND_STATE_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  pending_review: ['approved', 'rejected'],
  approved: ['processing'],
  rejected: [], // Terminal state
  processing: ['completed', 'failed'],
  completed: [], // Terminal state
  failed: ['processing', 'rejected'], // Can retry or reject
} as const;

function validateTransition(from: RefundStatus, to: RefundStatus): void {
  const validTransitions = REFUND_STATE_TRANSITIONS[from];
  if (!validTransitions.includes(to)) {
    throw new Error(
      `Invalid refund state transition: ${from} → ${to}. ` +
      `Valid transitions from ${from}: ${validTransitions.join(', ') || 'none (terminal state)'}`
    );
  }
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * List refunds with filtering and pagination.
 */
export async function listRefunds(params: RefundQueryParams = {}): Promise<PaginatedResponse<Refund>> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    ...buildPaginationParams(params),
  };

  if (params.filters) {
    if (params.filters.status) queryParams.status = params.filters.status;
    if (params.filters.reason) queryParams.reason = params.filters.reason;
    if (params.filters.userId) queryParams.userId = params.filters.userId;
    if (params.filters.bookingId) queryParams.bookingId = params.filters.bookingId;
    if (params.filters.disputeId) queryParams.disputeId = params.filters.disputeId;
    if (params.filters.minAmount) queryParams.minAmount = params.filters.minAmount;
    if (params.filters.maxAmount) queryParams.maxAmount = params.filters.maxAmount;
    if (params.filters.dateFrom) queryParams.dateFrom = params.filters.dateFrom;
    if (params.filters.dateTo) queryParams.dateTo = params.filters.dateTo;
  }

  if (params.sort) {
    queryParams.sortField = params.sort.field;
    queryParams.sortDirection = params.sort.direction;
  }

  return bookingPaymentsApiClient.get<PaginatedResponse<Refund>>('/admin/refunds', { params: queryParams });
}

/**
 * Get refund details by ID.
 */
export async function getRefund(refundId: string): Promise<RefundDetails> {
  return bookingPaymentsApiClient.get<RefundDetails>(`/admin/refunds/${refundId}`);
}

/**
 * Approve a pending refund.
 * REQUIRES reason - enforced at type level.
 */
export async function approveRefund(
  context: AdminActionContext,
  refundId: string,
  adjustedAmount: number | null,
  reason: string
): Promise<Refund> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'REFUND_APPROVE' as const,
    ...actionBase,
    refundId,
    adjustedAmount,
  };

  // Execute action
  const result = await bookingPaymentsApiClient.post<Refund>(`/admin/refunds/${refundId}/approve`, {
    adjustedAmount,
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'refund',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'refund',
    targetId: refundId,
    reason,
    correlationId: actionBase.correlationId,
    metadata: { adjustedAmount },
    previousState: { status: 'pending_review' },
    newState: { status: 'approved', amount: adjustedAmount },
  });

  return result;
}

/**
 * Reject a pending refund.
 * REQUIRES reason - enforced at type level.
 */
export async function rejectRefund(
  context: AdminActionContext,
  refundId: string,
  reason: string
): Promise<Refund> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'REFUND_REJECT' as const,
    ...actionBase,
    refundId,
  };

  // Execute action
  const result = await bookingPaymentsApiClient.post<Refund>(`/admin/refunds/${refundId}/reject`, {
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'refund',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'refund',
    targetId: refundId,
    reason,
    correlationId: actionBase.correlationId,
    previousState: { status: 'pending_review' },
    newState: { status: 'rejected' },
  });

  return result;
}

/**
 * Trigger a manual refund for a booking.
 * REQUIRES reason - enforced at type level.
 */
export async function triggerRefund(
  context: AdminActionContext,
  bookingId: string,
  amount: number,
  refundReason: RefundReason,
  reason: string
): Promise<Refund> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'REFUND_TRIGGER' as const,
    ...actionBase,
    bookingId,
    amount,
    reason: refundReason,
  };

  // Execute action
  const result = await bookingPaymentsApiClient.post<Refund>('/admin/refunds/trigger', {
    bookingId,
    amount,
    refundReason,
    adminReason: reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event (CRITICAL severity for manual refunds)
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'refund',
    severity: 'critical', // Manual refunds are always critical
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'booking',
    targetId: bookingId,
    reason,
    correlationId: actionBase.correlationId,
    metadata: { amount, refundReason, refundId: result.id },
    newState: { refundId: result.id, amount, status: 'pending_review' },
  });

  return result;
}

/**
 * Get refund statistics.
 */
export async function getRefundStats(): Promise<RefundStatistics> {
  return bookingPaymentsApiClient.get<RefundStatistics>('/admin/refunds/stats');
}

interface RefundStatistics {
  readonly pendingCount: number;
  readonly pendingAmount: number;
  readonly approvedThisMonth: number;
  readonly rejectedThisMonth: number;
  readonly totalRefundedThisMonth: number;
  readonly averageRefundAmount: number;
  readonly byReason: Record<RefundReason, number>;
}
