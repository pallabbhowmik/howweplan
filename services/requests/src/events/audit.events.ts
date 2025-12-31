/**
 * Audit Events
 * 
 * Specialized events for audit logging.
 * Every state change and admin action emits an audit event.
 */

import { RequestState, TransitionTrigger } from '../domain/request.state-machine';

export interface AuditEvent {
  readonly auditId: string;
  readonly timestamp: string;
  readonly service: string;
  readonly action: AuditAction;
  readonly entityType: 'TravelRequest';
  readonly entityId: string;
  readonly actor: AuditActor;
  readonly changes: AuditChange[];
  readonly context: AuditContext;
}

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATE_CHANGE'
  | 'ADMIN_ACTION'
  | 'SYSTEM_ACTION';

export interface AuditActor {
  readonly type: 'user' | 'admin' | 'system';
  readonly id: string;
  readonly ip?: string;
  readonly userAgent?: string;
}

export interface AuditChange {
  readonly field: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}

export interface AuditContext {
  readonly correlationId: string;
  readonly reason?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Request audit event payloads
 */
export interface RequestCreatedAudit {
  readonly action: 'CREATE';
  readonly requestId: string;
  readonly userId: string;
  readonly destination: string;
  readonly departureDate: string;
  readonly returnDate: string;
}

export interface RequestStateChangeAudit {
  readonly action: 'STATE_CHANGE';
  readonly requestId: string;
  readonly fromState: RequestState;
  readonly toState: RequestState;
  readonly trigger: TransitionTrigger;
  readonly reason: string;
}

export interface AdminActionAudit {
  readonly action: 'ADMIN_ACTION';
  readonly adminId: string;
  readonly requestId: string;
  readonly actionType: string;
  readonly reason: string;
  readonly changes: AuditChange[];
}
