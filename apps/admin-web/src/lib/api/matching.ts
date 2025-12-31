/**
 * Matching Override API Service
 * 
 * All matching override operations.
 * EVERY action requires a reason and is audit-logged.
 */

import { apiClient, buildPaginationParams } from './client';
import { auditLogger, createActionBase, ACTION_DESCRIPTIONS, ACTION_SEVERITY, getActionCategory } from '@/lib/audit';
import type { AdminActionContext } from '@/lib/audit';
import type {
  MatchingOverride,
  MatchingOverrideType,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface MatchingOverrideFilters {
  readonly type?: MatchingOverrideType;
  readonly tripRequestId?: string;
  readonly agentId?: string;
  readonly isActive?: boolean;
  readonly createdBy?: string;
}

export interface MatchingOverrideQueryParams extends PaginationParams {
  readonly filters?: MatchingOverrideFilters;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface MatchingOverrideDetails extends MatchingOverride {
  readonly tripRequest: TripRequestInfo;
  readonly agent: AgentInfo | null;
  readonly createdByAdmin: AdminInfo;
}

interface TripRequestInfo {
  readonly id: string;
  readonly destination: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: string;
  readonly userId: string;
}

interface AgentInfo {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
}

interface AdminInfo {
  readonly id: string;
  readonly email: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * List matching overrides with filtering and pagination.
 */
export async function listMatchingOverrides(
  params: MatchingOverrideQueryParams = {}
): Promise<PaginatedResponse<MatchingOverride>> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    ...buildPaginationParams(params),
  };

  if (params.filters) {
    if (params.filters.type) queryParams.type = params.filters.type;
    if (params.filters.tripRequestId) queryParams.tripRequestId = params.filters.tripRequestId;
    if (params.filters.agentId) queryParams.agentId = params.filters.agentId;
    if (params.filters.isActive !== undefined) queryParams.isActive = params.filters.isActive;
    if (params.filters.createdBy) queryParams.createdBy = params.filters.createdBy;
  }

  return apiClient.get<PaginatedResponse<MatchingOverride>>('/admin/matching/overrides', {
    params: queryParams,
  });
}

/**
 * Get matching override details by ID.
 */
export async function getMatchingOverride(overrideId: string): Promise<MatchingOverrideDetails> {
  return apiClient.get<MatchingOverrideDetails>(`/admin/matching/overrides/${overrideId}`);
}

/**
 * Create a matching override.
 * REQUIRES reason - enforced at type level.
 */
export async function createMatchingOverride(
  context: AdminActionContext,
  params: {
    type: MatchingOverrideType;
    tripRequestId: string;
    agentId: string | null;
    expiresAt: string | null;
  },
  reason: string
): Promise<MatchingOverride> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'MATCHING_OVERRIDE_CREATE' as const,
    ...actionBase,
    overrideType: params.type,
    tripRequestId: params.tripRequestId,
    agentId: params.agentId,
    expiresAt: params.expiresAt,
  };

  // Execute action
  const result = await apiClient.post<MatchingOverride>('/admin/matching/overrides', {
    ...params,
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'matching',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'trip_request',
    targetId: params.tripRequestId,
    reason,
    correlationId: actionBase.correlationId,
    metadata: {
      overrideType: params.type,
      agentId: params.agentId,
      expiresAt: params.expiresAt,
      overrideId: result.id,
    },
    newState: { overrideId: result.id, isActive: true },
  });

  return result;
}

/**
 * Cancel an active matching override.
 * REQUIRES reason - enforced at type level.
 */
export async function cancelMatchingOverride(
  context: AdminActionContext,
  overrideId: string,
  reason: string
): Promise<MatchingOverride> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'MATCHING_OVERRIDE_CANCEL' as const,
    ...actionBase,
    overrideId,
  };

  // Execute action
  const result = await apiClient.post<MatchingOverride>(
    `/admin/matching/overrides/${overrideId}/cancel`,
    {
      reason,
      correlationId: actionBase.correlationId,
    }
  );

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'matching',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'matching_override',
    targetId: overrideId,
    reason,
    correlationId: actionBase.correlationId,
    previousState: { isActive: true },
    newState: { isActive: false },
  });

  return result;
}

/**
 * Get pending trip requests without agent matches.
 * Used to identify candidates for manual override.
 */
export async function getPendingTripRequests(
  params: PaginationParams = {}
): Promise<PaginatedResponse<TripRequestInfo & { waitingDays: number }>> {
  return apiClient.get<PaginatedResponse<TripRequestInfo & { waitingDays: number }>>(
    '/admin/matching/pending-requests',
    { params: buildPaginationParams(params) }
  );
}

/**
 * Get available agents for a trip request.
 * Used when creating force_assign overrides.
 */
export async function getAvailableAgents(
  tripRequestId: string
): Promise<readonly AgentInfo[]> {
  return apiClient.get<readonly AgentInfo[]>(
    `/admin/matching/available-agents/${tripRequestId}`
  );
}
