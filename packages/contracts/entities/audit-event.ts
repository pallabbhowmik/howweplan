/**
 * Audit Event Entity
 * Records all state changes and admin actions
 * 
 * Constitution rules enforced:
 * - Rule 8: All admin actions require a reason and are audit-logged
 * - Rule 18: Every state change MUST emit an audit event
 */

export type AuditEventCategory =
  | 'state_change'
  | 'admin_action'
  | 'user_action'
  | 'agent_action'
  | 'system_action'
  | 'security'
  | 'financial';

export type AuditEventSeverity = 'info' | 'warning' | 'critical';

export interface AuditEventActor {
  readonly id: string;
  readonly type: 'user' | 'agent' | 'admin' | 'system';
  readonly email: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface AuditEventTarget {
  readonly entityType: string;
  readonly entityId: string;
  readonly entityName: string | null;
}

export interface AuditEventStateChange {
  readonly field: string;
  readonly previousValue: string | null;
  readonly newValue: string;
}

export interface AuditEvent {
  readonly id: string;
  readonly category: AuditEventCategory;
  readonly severity: AuditEventSeverity;
  readonly action: string;
  readonly description: string;
  readonly actor: AuditEventActor;
  readonly target: AuditEventTarget;
  readonly stateChanges: readonly AuditEventStateChange[];
  readonly reason: string | null; // Required for admin actions (rule 8)
  readonly metadata: Record<string, unknown>;
  readonly correlationId: string | null; // Links related events
  readonly parentEventId: string | null;
  readonly timestamp: Date;
  readonly isImmutable: true; // Audit events cannot be modified
}

/**
 * Predefined audit event actions for consistency
 */
export type AuditAction =
  // Request lifecycle
  | 'request.created'
  | 'request.updated'
  | 'request.expired'
  | 'request.cancelled'
  // Agent matching
  | 'agents.matched'
  | 'agent.confirmed'
  | 'agent.declined'
  | 'agent.revealed'
  // Itinerary
  | 'itinerary.submitted'
  | 'itinerary.updated'
  | 'itinerary.selected'
  // Booking
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.completed'
  // Payment
  | 'payment.authorized'
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.refunded'
  // Dispute
  | 'dispute.opened'
  | 'dispute.escalated'
  | 'dispute.resolved'
  // Admin
  | 'admin.user_banned'
  | 'admin.user_unbanned'
  | 'admin.agent_verified'
  | 'admin.agent_suspended'
  | 'admin.dispute_assigned'
  | 'admin.refund_issued'
  | 'admin.config_changed'
  // Security
  | 'security.login'
  | 'security.logout'
  | 'security.password_changed'
  | 'security.mfa_enabled'
  | 'security.suspicious_activity';
