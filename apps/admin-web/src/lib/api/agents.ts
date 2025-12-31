/**
 * Agent API Service
 * 
 * All agent management operations.
 * EVERY action requires a reason and is audit-logged.
 */

import { apiClient, buildPaginationParams } from './client';
import { auditLogger, createActionBase, ACTION_DESCRIPTIONS, ACTION_SEVERITY, getActionCategory } from '@/lib/audit';
import type { AdminActionContext } from '@/lib/audit';
import type {
  Agent,
  AgentStatus,
  PaginationParams,
  PaginatedResponse,
  SortParams,
} from '@/types';

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface AgentFilters {
  readonly status?: AgentStatus;
  readonly search?: string;
  readonly minRating?: number;
  readonly hasDisputes?: boolean;
}

export interface AgentQueryParams extends PaginationParams {
  readonly filters?: AgentFilters;
  readonly sort?: SortParams<'createdAt' | 'rating' | 'bookings'>;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface AgentDetails extends Agent {
  readonly recentBookings: readonly BookingSummary[];
  readonly recentDisputes: readonly DisputeSummary[];
  readonly auditHistory: readonly AgentAuditEntry[];
}

interface BookingSummary {
  readonly id: string;
  readonly status: string;
  readonly amount: number;
  readonly createdAt: string;
}

interface DisputeSummary {
  readonly id: string;
  readonly status: string;
  readonly category: string;
  readonly createdAt: string;
}

interface AgentAuditEntry {
  readonly action: string;
  readonly adminEmail: string;
  readonly reason: string;
  readonly timestamp: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * List agents with filtering and pagination.
 */
export async function listAgents(params: AgentQueryParams = {}): Promise<PaginatedResponse<Agent>> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    ...buildPaginationParams(params),
  };

  if (params.filters) {
    if (params.filters.status) queryParams.status = params.filters.status;
    if (params.filters.search) queryParams.search = params.filters.search;
    if (params.filters.minRating) queryParams.minRating = params.filters.minRating;
    if (params.filters.hasDisputes !== undefined) queryParams.hasDisputes = params.filters.hasDisputes;
  }

  if (params.sort) {
    queryParams.sortField = params.sort.field;
    queryParams.sortDirection = params.sort.direction;
  }

  return apiClient.get<PaginatedResponse<Agent>>('/admin/agents', { params: queryParams });
}

/**
 * Get agent details by ID.
 */
export async function getAgent(agentId: string): Promise<AgentDetails> {
  return apiClient.get<AgentDetails>(`/admin/agents/${agentId}`);
}

/**
 * Approve an agent application.
 * REQUIRES reason - enforced at type level.
 */
export async function approveAgent(
  context: AdminActionContext,
  agentId: string,
  reason: string
): Promise<Agent> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'AGENT_APPROVE' as const,
    ...actionBase,
    agentId,
  };

  // Execute action
  const result = await apiClient.post<Agent>(`/admin/agents/${agentId}/approve`, {
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'agent_management',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'agent',
    targetId: agentId,
    reason,
    correlationId: actionBase.correlationId,
    previousState: { status: 'pending_approval' },
    newState: { status: 'approved' },
  });

  return result;
}

/**
 * Suspend an agent account.
 * REQUIRES reason - enforced at type level.
 */
export async function suspendAgent(
  context: AdminActionContext,
  agentId: string,
  reason: string,
  durationDays: number | null = null
): Promise<Agent> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'AGENT_SUSPEND' as const,
    ...actionBase,
    agentId,
    suspensionDurationDays: durationDays,
  };

  // Execute action
  const result = await apiClient.post<Agent>(`/admin/agents/${agentId}/suspend`, {
    reason,
    durationDays,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'agent_management',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'agent',
    targetId: agentId,
    reason,
    correlationId: actionBase.correlationId,
    metadata: { durationDays },
    newState: { status: 'suspended' },
  });

  return result;
}

/**
 * Reactivate a suspended agent.
 * REQUIRES reason - enforced at type level.
 */
export async function reactivateAgent(
  context: AdminActionContext,
  agentId: string,
  reason: string
): Promise<Agent> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'AGENT_REACTIVATE' as const,
    ...actionBase,
    agentId,
  };

  // Execute action
  const result = await apiClient.post<Agent>(`/admin/agents/${agentId}/reactivate`, {
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'agent_management',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'agent',
    targetId: agentId,
    reason,
    correlationId: actionBase.correlationId,
    previousState: { status: 'suspended' },
    newState: { status: 'approved' },
  });

  return result;
}

/**
 * Reject an agent application.
 * REQUIRES reason - enforced at type level.
 */
export async function rejectAgent(
  context: AdminActionContext,
  agentId: string,
  reason: string
): Promise<Agent> {
  const actionBase = createActionBase(context, reason);
  const action = {
    type: 'AGENT_REJECT' as const,
    ...actionBase,
    agentId,
  };

  // Execute action
  const result = await apiClient.post<Agent>(`/admin/agents/${agentId}/reject`, {
    reason,
    correlationId: actionBase.correlationId,
  });

  // Emit audit event
  await auditLogger.emit({
    category: getActionCategory(action.type) as 'agent_management',
    severity: ACTION_SEVERITY[action.type],
    action: ACTION_DESCRIPTIONS[action.type],
    targetType: 'agent',
    targetId: agentId,
    reason,
    correlationId: actionBase.correlationId,
    previousState: { status: 'pending_approval' },
    newState: { status: 'rejected' },
  });

  return result;
}
