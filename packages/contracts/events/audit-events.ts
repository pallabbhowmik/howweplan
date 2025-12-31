/**
 * Audit Events
 * Events for audit logging
 * 
 * Constitution rules enforced:
 * - Rule 8: All admin actions require a reason and are audit-logged
 * - Rule 18: Every state change MUST emit an audit event
 */

import type { BaseEvent } from './base-event';
import type {
  AuditEventCategory,
  AuditEventSeverity,
  AuditEventActor,
  AuditEventTarget,
  AuditEventStateChange,
  AuditAction,
} from '../entities/audit-event';

/**
 * AuditLogged Event Payload
 * This is the canonical audit event that must be emitted for all state changes
 */
export interface AuditLoggedPayload {
  readonly auditEventId: string;
  readonly category: AuditEventCategory;
  readonly severity: AuditEventSeverity;
  readonly action: AuditAction | string;
  readonly description: string;
  readonly actor: AuditEventActor;
  readonly target: AuditEventTarget;
  readonly stateChanges: readonly AuditEventStateChange[];
  /** Required for admin actions (rule 8) */
  readonly reason: string | null;
  readonly parentEventId: string | null;
  readonly isImmutable: true;
}

export type AuditLoggedEvent = BaseEvent<AuditLoggedPayload>;

/**
 * AdminAction Event Payload
 * Constitution rule 8: All admin actions require reason and audit logging
 */
export interface AdminActionPayload {
  readonly adminId: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  /** Required - constitution rule 8 */
  readonly reason: string;
  readonly previousState: unknown;
  readonly newState: unknown;
  readonly ipAddress: string;
  readonly userAgent: string;
}

export type AdminActionEvent = BaseEvent<AdminActionPayload>;
