/**
 * Dispute API Service
 * 
 * All dispute resolution operations.
 * EVERY action requires a reason and is audit-logged.
 */

import { disputesApiClient, buildPaginationParams } from './client';
import { auditLogger, createActionBase, ACTION_DESCRIPTIONS, ACTION_SEVERITY, getActionCategory } from '@/lib/audit';
import type { AdminActionContext } from '@/lib/audit';
import type {
  Dispute,
  DisputeStatus,
  DisputeCategory,
  PaginationParams,
  PaginatedResponse,
  SortParams,
} from '@/types';

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface DisputeFilters {
  readonly status?: DisputeStatus;
  readonly category?: DisputeCategory;
  readonly userId?: string;
  readonly agentId?: string;
  readonly bookingId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface DisputeQueryParams extends PaginationParams {
  readonly filters?: DisputeFilters;
  readonly sort?: SortParams<'createdAt' | 'updatedAt' | 'status'>;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface DisputeDetails extends Dispute {
  readonly booking: BookingInfo;
  readonly user: UserInfo;
  readonly agent: AgentInfo;
  readonly timeline: readonly DisputeTimelineEntry[];
}

interface BookingInfo {
  readonly id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly createdAt: string;
}

interface UserInfo {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}

interface AgentInfo {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}

interface DisputeTimelineEntry {
  readonly type: 'status_change' | 'note_added' | 'evidence_submitted';
  readonly description: string;
  readonly actor: string;
  readonly timestamp: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * List disputes with filtering and pagination.
 */
export async function listDisputes(params: DisputeQueryParams = {}): Promise<PaginatedResponse<Dispute>> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    ...buildPaginationParams(params),
  };

  if (params.filters) {
    if (params.filters.status) queryParams.status = params.filters.status;
    if (params.filters.category) queryParams.category = params.filters.category;
    if (params.filters.userId) queryParams.userId = params.filters.userId;
    if (params.filters.agentId) queryParams.agentId = params.filters.agentId;
    if (params.filters.bookingId) queryParams.bookingId = params.filters.bookingId;
    if (params.filters.dateFrom) queryParams.dateFrom = params.filters.dateFrom;
    if (params.filters.dateTo) queryParams.dateTo = params.filters.dateTo;
  }

  if (params.sort) {
    queryParams.sortField = params.sort.field;
    queryParams.sortDirection = params.sort.direction;
  }

  return disputesApiClient.get<PaginatedResponse<Dispute>>('/admin/disputes', { params: queryParams });
}

/**
 * Get dispute details by ID.
 */
export async function getDispute(disputeId: string): Promise<DisputeDetails> {
  return disputesApiClient.get<DisputeDetails>(`/admin/disputes/${disputeId}`);
}

/**
 * Update dispute status.
 * REQUIRES reason - enforced at type level.
 */
export async function updateDisputeStatus(
  context: AdminActionContext,
  disputeId: string,
  newStatus: DisputeStatus,
  reason: string
): Promise<Dispute> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'DISPUTE_UPDATE_STATUS' as const,
    ...actionBase,
    disputeId,
    newStatus,
  };

  // Execute action
  const result = await disputesApiClient.patch<Dispute>(`/admin/disputes/${disputeId}/status`, {
    status: newStatus,
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'dispute',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'dispute',
    targetId: disputeId,
    reason,
    correlationId: actionBase.correlationId,
    metadata: { newStatus },
    newState: { status: newStatus },
  });

  return result;
}

/**
 * Add note to dispute.
 * REQUIRES reason - enforced at type level.
 */
export async function addDisputeNote(
  context: AdminActionContext,
  disputeId: string,
  content: string,
  isInternal: boolean,
  reason: string
): Promise<Dispute> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'DISPUTE_ADD_NOTE' as const,
    ...actionBase,
    disputeId,
    content,
    isInternal,
  };

  // Execute action
  const result = await disputesApiClient.post<Dispute>(`/admin/disputes/${disputeId}/notes`, {
    content,
    isInternal,
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'dispute',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'dispute',
    targetId: disputeId,
    reason,
    correlationId: actionBase.correlationId,
    metadata: { isInternal, contentLength: content.length },
  });

  return result;
}

/**
 * Resolve a dispute.
 * REQUIRES reason - enforced at type level.
 */
export async function resolveDispute(
  context: AdminActionContext,
  disputeId: string,
  resolution: DisputeStatus,
  refundAmount: number | null,
  resolutionSummary: string,
  reason: string
): Promise<Dispute> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'DISPUTE_RESOLVE' as const,
    ...actionBase,
    disputeId,
    resolution,
    refundAmount,
    resolutionSummary,
  };

  // Execute action
  const result = await disputesApiClient.post<Dispute>(`/admin/disputes/${disputeId}/resolve`, {
    resolution,
    refundAmount,
    resolutionSummary,
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'dispute',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'dispute',
    targetId: disputeId,
    reason,
    correlationId: actionBase.correlationId,
    metadata: { resolution, refundAmount, resolutionSummary },
    newState: { status: resolution, refundAmount },
  });

  return result;
}

/**
 * Get dispute statistics.
 */
export async function getDisputeStats(): Promise<DisputeStatistics> {
  return disputesApiClient.get<DisputeStatistics>('/admin/disputes/stats');
}

interface DisputeStatistics {
  readonly totalOpen: number;
  readonly pendingReview: number;
  readonly pendingUserResponse: number;
  readonly pendingAgentResponse: number;
  readonly resolvedThisMonth: number;
  readonly averageResolutionDays: number;
  readonly byCategory: Record<DisputeCategory, number>;
}
