/**
 * Audit API Service
 * 
 * Query and export audit logs.
 */

import { auditApiClient, buildPaginationParams } from './client';
import type {
  AuditEvent,
  AuditQueryFilters,
  AuditQueryResult,
  AuditStatistics,
  AuditExportRequest,
  AuditExportResult,
  PaginationParams,
} from '@/types';

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface AuditQueryParams extends PaginationParams {
  readonly filters?: AuditQueryFilters;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Query audit events with filtering and pagination.
 */
export async function queryAuditEvents(params: AuditQueryParams = {}): Promise<AuditQueryResult> {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    ...buildPaginationParams(params),
  };

  if (params.filters) {
    if (params.filters.startDate) queryParams.startDate = params.filters.startDate;
    if (params.filters.endDate) queryParams.endDate = params.filters.endDate;
    if (params.filters.category) queryParams.category = params.filters.category;
    if (params.filters.severity) queryParams.severity = params.filters.severity;
    if (params.filters.actorType) queryParams.actorType = params.filters.actorType;
    if (params.filters.actorId) queryParams.actorId = params.filters.actorId;
    if (params.filters.targetType) queryParams.targetType = params.filters.targetType;
    if (params.filters.targetId) queryParams.targetId = params.filters.targetId;
    if (params.filters.action) queryParams.action = params.filters.action;
    if (params.filters.searchTerm) queryParams.search = params.filters.searchTerm;
  }

  return auditApiClient.get<AuditQueryResult>('/audit/events', { params: queryParams });
}

/**
 * Get a single audit event by ID.
 */
export async function getAuditEvent(eventId: string): Promise<AuditEvent> {
  return auditApiClient.get<AuditEvent>(`/audit/events/${eventId}`);
}

/**
 * Get audit events for a specific target.
 */
export async function getAuditEventsForTarget(
  targetType: string,
  targetId: string,
  params: PaginationParams = {}
): Promise<AuditQueryResult> {
  return auditApiClient.get<AuditQueryResult>(`/audit/resources/${targetType}/${targetId}/history`, {
    params: buildPaginationParams(params),
  });
}

/**
 * Get audit statistics for dashboard.
 */
export async function getAuditStatistics(
  periodDays: number = 30
): Promise<AuditStatistics> {
  // Calculate from date based on periodDays
  const to = new Date().toISOString();
  const from = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  
  return auditApiClient.get<AuditStatistics>('/audit/statistics', {
    params: { from, to },
  });
}

/**
 * Export audit events to file.
 */
export async function exportAuditEvents(
  request: AuditExportRequest
): Promise<AuditExportResult> {
  return auditApiClient.post<AuditExportResult>('/audit/export', request);
}

/**
 * Get recent critical events (for alerts).
 */
export async function getRecentCriticalEvents(
  limit: number = 10
): Promise<readonly AuditEvent[]> {
  const result = await auditApiClient.get<AuditQueryResult>('/audit/events', {
    params: {
      severities: 'critical',
      pageSize: limit,
      page: 1,
    },
  });
  return result.events;
}

/**
 * Get audit events by correlation ID (for tracing).
 */
export async function getEventsByCorrelationId(
  correlationId: string
): Promise<readonly AuditEvent[]> {
  const result = await auditApiClient.get<AuditQueryResult>('/audit/events', {
    params: { correlationId },
  });
  return result.events;
}
