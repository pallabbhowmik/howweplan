/**
 * Audit Event Types
 * 
 * Every state change MUST emit an audit event.
 * This is enforced at the architectural level.
 */

// ============================================================================
// AUDIT EVENT STRUCTURE
// ============================================================================

export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditCategory =
  | 'agent_management'
  | 'matching'
  | 'dispute'
  | 'refund'
  | 'booking'
  | 'payment'
  | 'authentication'
  | 'system';

export interface AuditEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly action: string;
  readonly actorType: 'admin' | 'system' | 'user' | 'agent';
  readonly actorId: string;
  readonly actorEmail: string | null;
  readonly targetType: string | null;
  readonly targetId: string | null;
  readonly reason: string | null;
  readonly metadata: Record<string, unknown>;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly correlationId: string;
  readonly previousState: Record<string, unknown> | null;
  readonly newState: Record<string, unknown> | null;
}

// ============================================================================
// AUDIT QUERY TYPES
// ============================================================================

export interface AuditQueryFilters {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly category?: AuditCategory;
  readonly severity?: AuditSeverity;
  readonly actorType?: AuditEvent['actorType'];
  readonly actorId?: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly action?: string;
  readonly searchTerm?: string;
}

export interface AuditQueryResult {
  readonly events: readonly AuditEvent[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

// ============================================================================
// AUDIT STATISTICS
// ============================================================================

export interface AuditStatistics {
  readonly totalEvents: number;
  readonly eventsByCategory: Record<AuditCategory, number>;
  readonly eventsBySeverity: Record<AuditSeverity, number>;
  readonly eventsByActorType: Record<AuditEvent['actorType'], number>;
  readonly recentCriticalEvents: number;
  readonly periodStart: string;
  readonly periodEnd: string;
}

// ============================================================================
// AUDIT EXPORT
// ============================================================================

export interface AuditExportRequest {
  readonly filters: AuditQueryFilters;
  readonly format: 'csv' | 'json';
  readonly includeMetadata: boolean;
}

export interface AuditExportResult {
  readonly downloadUrl: string;
  readonly expiresAt: string;
  readonly recordCount: number;
}
