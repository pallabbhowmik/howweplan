/**
 * Audit event types emitted by the Identity & Access service.
 * Per business rules: every state change MUST emit an audit event.
 * 
 * These events are published to the event bus for consumption by
 * other services and the audit log system.
 */

import type {
  UserRole,
  AccountStatus,
  AgentVerificationStatus,
} from '../types/identity.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BASE TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base event structure for all identity events.
 */
export interface IdentityEventBase {
  /** Unique event identifier */
  readonly eventId: string;
  /** Event type discriminator */
  readonly eventType: string;
  /** Event version for schema evolution */
  readonly eventVersion: number;
  /** ISO 8601 timestamp when the event occurred */
  readonly occurredAt: string;
  /** Service that emitted the event */
  readonly source: 'identity';
  /** Correlation ID for distributed tracing */
  readonly correlationId: string;
  /** User ID of the actor who triggered the event (null for system events) */
  readonly actorId: string | null;
  /** Role of the actor */
  readonly actorRole: UserRole | 'SYSTEM';
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRegisteredEvent extends IdentityEventBase {
  readonly eventType: 'identity.user.registered';
  readonly payload: {
    readonly userId: string;
    readonly email: string;
    readonly role: UserRole;
    readonly firstName: string;
  };
}

export interface UserLoggedInEvent extends IdentityEventBase {
  readonly eventType: 'identity.user.logged_in';
  readonly payload: {
    readonly userId: string;
    readonly ipAddress: string;
    readonly userAgent: string;
  };
}

export interface UserLoggedOutEvent extends IdentityEventBase {
  readonly eventType: 'identity.user.logged_out';
  readonly payload: {
    readonly userId: string;
  };
}

export interface LoginFailedEvent extends IdentityEventBase {
  readonly eventType: 'identity.user.login_failed';
  readonly payload: {
    readonly email: string;
    readonly reason: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_SUSPENDED';
    readonly ipAddress: string;
    readonly attemptCount: number;
  };
}

export interface PasswordChangedEvent extends IdentityEventBase {
  readonly eventType: 'identity.user.password_changed';
  readonly payload: {
    readonly userId: string;
    readonly initiatedBy: 'USER' | 'ADMIN' | 'SYSTEM';
  };
}

export interface TokenRefreshedEvent extends IdentityEventBase {
  readonly eventType: 'identity.user.token_refreshed';
  readonly payload: {
    readonly userId: string;
  };
}

export interface PasswordResetRequestedEvent extends IdentityEventBase {
  readonly eventType: 'identity.user.password_reset_requested';
  readonly payload: {
    readonly userId: string;
    readonly email: string;
    readonly firstName: string;
    readonly resetToken: string;
    readonly expiresAt: string;
  };
}

export interface UserEmailVerifiedEvent extends IdentityEventBase {
  readonly eventType: 'identity.user.email_verified';
  readonly payload: {
    readonly userId: string;
    readonly email: string;
    readonly firstName: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT STATUS EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface AccountStatusChangedEvent extends IdentityEventBase {
  readonly eventType: 'identity.account.status_changed';
  readonly payload: {
    readonly userId: string;
    readonly previousStatus: AccountStatus;
    readonly newStatus: AccountStatus;
    readonly reason: string;
    readonly changedBy: {
      readonly adminId: string;
      readonly referenceId?: string;
    } | null;
  };
}

export interface AccountSuspendedEvent extends IdentityEventBase {
  readonly eventType: 'identity.account.suspended';
  readonly payload: {
    readonly userId: string;
    readonly reason: string;
    readonly suspendedBy: {
      readonly adminId: string;
      readonly referenceId?: string;
    };
  };
}

export interface AccountReactivatedEvent extends IdentityEventBase {
  readonly eventType: 'identity.account.reactivated';
  readonly payload: {
    readonly userId: string;
    readonly reason: string;
    readonly reactivatedBy: {
      readonly adminId: string;
      readonly referenceId?: string;
    };
  };
}

export interface AccountDeactivatedEvent extends IdentityEventBase {
  readonly eventType: 'identity.account.deactivated';
  readonly payload: {
    readonly userId: string;
    readonly reason: string;
    readonly deactivatedBy: 'USER' | 'ADMIN';
    readonly adminContext?: {
      readonly adminId: string;
      readonly referenceId?: string;
    };
  };
}

export interface AccountLockedEvent extends IdentityEventBase {
  readonly eventType: 'identity.account.locked';
  readonly payload: {
    readonly userId: string;
    readonly reason: 'MAX_LOGIN_ATTEMPTS_EXCEEDED';
    readonly lockExpiresAt: string;
  };
}

export interface AccountUnlockedEvent extends IdentityEventBase {
  readonly eventType: 'identity.account.unlocked';
  readonly payload: {
    readonly userId: string;
    readonly unlockedBy: 'SYSTEM' | 'ADMIN';
    readonly adminContext?: {
      readonly adminId: string;
      readonly reason: string;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileUpdatedEvent extends IdentityEventBase {
  readonly eventType: 'identity.profile.updated';
  readonly payload: {
    readonly userId: string;
    readonly updatedFields: readonly string[];
  };
}

export interface EmailVerifiedEvent extends IdentityEventBase {
  readonly eventType: 'identity.email.verified';
  readonly payload: {
    readonly userId: string;
    readonly email: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT VERIFICATION EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentVerificationSubmittedEvent extends IdentityEventBase {
  readonly eventType: 'identity.agent.verification_submitted';
  readonly payload: {
    readonly userId: string;
    readonly documentType: string;
  };
}

export interface AgentVerificationApprovedEvent extends IdentityEventBase {
  readonly eventType: 'identity.agent.verification_approved';
  readonly payload: {
    readonly userId: string;
    readonly approvedBy: {
      readonly adminId: string;
      readonly reason: string;
      readonly referenceId?: string;
    };
  };
}

export interface AgentVerificationRejectedEvent extends IdentityEventBase {
  readonly eventType: 'identity.agent.verification_rejected';
  readonly payload: {
    readonly userId: string;
    readonly rejectedBy: {
      readonly adminId: string;
      readonly reason: string;
      readonly rejectionReason: string;
      readonly referenceId?: string;
    };
  };
}

export interface AgentVerificationRevokedEvent extends IdentityEventBase {
  readonly eventType: 'identity.agent.verification_revoked';
  readonly payload: {
    readonly userId: string;
    readonly previousStatus: AgentVerificationStatus;
    readonly revokedBy: {
      readonly adminId: string;
      readonly reason: string;
      readonly referenceId?: string;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACTION EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminActionPerformedEvent extends IdentityEventBase {
  readonly eventType: 'identity.admin.action_performed';
  readonly payload: {
    readonly adminId: string;
    readonly action: string;
    readonly targetUserId: string | null;
    readonly reason: string;
    readonly referenceId?: string;
    readonly details: Record<string, unknown>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNION TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Union of all identity events.
 */
export type IdentityEvent =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | LoginFailedEvent
  | PasswordChangedEvent
  | TokenRefreshedEvent
  | PasswordResetRequestedEvent
  | UserEmailVerifiedEvent
  | AccountStatusChangedEvent
  | AccountSuspendedEvent
  | AccountReactivatedEvent
  | AccountDeactivatedEvent
  | AccountLockedEvent
  | AccountUnlockedEvent
  | ProfileUpdatedEvent
  | EmailVerifiedEvent
  | AgentVerificationSubmittedEvent
  | AgentVerificationApprovedEvent
  | AgentVerificationRejectedEvent
  | AgentVerificationRevokedEvent
  | AdminActionPerformedEvent;

/**
 * All event type discriminators.
 */
export const IdentityEventType = {
  USER_REGISTERED: 'identity.user.registered',
  USER_LOGGED_IN: 'identity.user.logged_in',
  USER_LOGGED_OUT: 'identity.user.logged_out',
  LOGIN_FAILED: 'identity.user.login_failed',
  PASSWORD_CHANGED: 'identity.user.password_changed',
  TOKEN_REFRESHED: 'identity.user.token_refreshed',
  PASSWORD_RESET_REQUESTED: 'identity.user.password_reset_requested',
  USER_EMAIL_VERIFIED: 'identity.user.email_verified',
  ACCOUNT_STATUS_CHANGED: 'identity.account.status_changed',
  ACCOUNT_SUSPENDED: 'identity.account.suspended',
  ACCOUNT_REACTIVATED: 'identity.account.reactivated',
  ACCOUNT_DEACTIVATED: 'identity.account.deactivated',
  ACCOUNT_LOCKED: 'identity.account.locked',
  ACCOUNT_UNLOCKED: 'identity.account.unlocked',
  PROFILE_UPDATED: 'identity.profile.updated',
  EMAIL_VERIFIED: 'identity.email.verified',
  AGENT_VERIFICATION_SUBMITTED: 'identity.agent.verification_submitted',
  AGENT_VERIFICATION_APPROVED: 'identity.agent.verification_approved',
  AGENT_VERIFICATION_REJECTED: 'identity.agent.verification_rejected',
  AGENT_VERIFICATION_REVOKED: 'identity.agent.verification_revoked',
  ADMIN_ACTION_PERFORMED: 'identity.admin.action_performed',
} as const;
