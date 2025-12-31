/**
 * Core identity types and contracts for the Identity & Access service.
 * These types define the identity domain and are used throughout the service.
 * 
 * ARCHITECTURE: These are internal types. Shared contracts for inter-service
 * communication should be defined in a separate shared-contracts package.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ROLE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platform roles with strict hierarchy.
 * - USER: End consumer who books travel
 * - AGENT: Travel professional who creates itineraries
 * - ADMIN: Platform operator with elevated privileges
 */
export const UserRole = {
  USER: 'USER',
  AGENT: 'AGENT',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * All valid roles as an array for validation.
 */
export const ALL_ROLES: readonly UserRole[] = Object.values(UserRole);

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT STATUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Account status state machine.
 * - PENDING_VERIFICATION: Initial state, awaiting email verification
 * - ACTIVE: Full access granted
 * - SUSPENDED: Read-only access, no write operations allowed
 * - DEACTIVATED: Account closed by user or admin
 */
export const AccountStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

/**
 * Valid status transitions. Key is current state, value is array of valid next states.
 */
export const ACCOUNT_STATUS_TRANSITIONS: Record<AccountStatus, readonly AccountStatus[]> = {
  [AccountStatus.PENDING_VERIFICATION]: [AccountStatus.ACTIVE, AccountStatus.DEACTIVATED],
  [AccountStatus.ACTIVE]: [AccountStatus.SUSPENDED, AccountStatus.DEACTIVATED],
  [AccountStatus.SUSPENDED]: [AccountStatus.ACTIVE, AccountStatus.DEACTIVATED],
  [AccountStatus.DEACTIVATED]: [], // Terminal state
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// AGENT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agent verification state machine.
 * Agents must be verified before they can receive booking requests.
 * - NOT_SUBMITTED: Agent has not submitted verification documents
 * - PENDING_REVIEW: Documents submitted, awaiting admin review
 * - VERIFIED: Agent identity and credentials confirmed
 * - REJECTED: Verification failed, can resubmit
 * - REVOKED: Previously verified, now revoked (e.g., fraud detection)
 */
export const AgentVerificationStatus = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
} as const;

export type AgentVerificationStatus =
  (typeof AgentVerificationStatus)[keyof typeof AgentVerificationStatus];

/**
 * Valid verification status transitions.
 */
export const AGENT_VERIFICATION_TRANSITIONS: Record<
  AgentVerificationStatus,
  readonly AgentVerificationStatus[]
> = {
  [AgentVerificationStatus.NOT_SUBMITTED]: [AgentVerificationStatus.PENDING_REVIEW],
  [AgentVerificationStatus.PENDING_REVIEW]: [
    AgentVerificationStatus.VERIFIED,
    AgentVerificationStatus.REJECTED,
  ],
  [AgentVerificationStatus.VERIFIED]: [AgentVerificationStatus.REVOKED],
  [AgentVerificationStatus.REJECTED]: [AgentVerificationStatus.PENDING_REVIEW],
  [AgentVerificationStatus.REVOKED]: [], // Terminal state, requires new account
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// USER ENTITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core user entity stored in the database.
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly status: AccountStatus;
  readonly firstName: string;
  readonly lastName: string;
  readonly photoUrl: string | null;
  readonly emailVerifiedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Agent-specific profile data. Only present for users with AGENT role.
 */
export interface AgentProfile {
  readonly userId: string;
  readonly verificationStatus: AgentVerificationStatus;
  readonly verificationSubmittedAt: Date | null;
  readonly verificationCompletedAt: Date | null;
  readonly verificationRejectedReason: string | null;
  readonly businessName: string | null;
  readonly bio: string | null;
  readonly specialties: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Combined user with agent profile (if applicable).
 */
export interface UserWithProfile extends User {
  readonly agentProfile: AgentProfile | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY CONTEXT (JWT Payload)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identity context extracted from JWT and attached to requests.
 * This is the minimal set of claims needed for authorization decisions.
 */
export interface IdentityContext {
  /** User's unique identifier */
  readonly sub: string;
  /** User's role for RBAC */
  readonly role: UserRole;
  /** Account status for access control */
  readonly status: AccountStatus;
  /** Agent verification status (null if not an agent) */
  readonly agentVerificationStatus: AgentVerificationStatus | null;
  /** Token issued at timestamp */
  readonly iat: number;
  /** Token expiration timestamp */
  readonly exp: number;
  /** Token issuer */
  readonly iss: string;
  /** Token audience */
  readonly aud: string;
}

/**
 * Public identity data that can be shared pre-payment.
 * Per business rules: first name + photo only before agent confirmation.
 */
export interface PublicAgentIdentity {
  readonly firstName: string;
  readonly photoUrl: string | null;
}

/**
 * Full identity data revealed after agent confirmation and payment.
 */
export interface FullAgentIdentity extends PublicAgentIdentity {
  readonly lastName: string;
  readonly email: string;
  readonly businessName: string | null;
  readonly bio: string | null;
  readonly specialties: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS & RBAC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Granular permissions for RBAC.
 * Format: resource:action
 */
export const Permission = {
  // User permissions
  USER_READ_SELF: 'user:read:self',
  USER_UPDATE_SELF: 'user:update:self',
  USER_DELETE_SELF: 'user:delete:self',

  // Agent permissions
  AGENT_SUBMIT_VERIFICATION: 'agent:submit:verification',
  AGENT_READ_PROFILE: 'agent:read:profile',
  AGENT_UPDATE_PROFILE: 'agent:update:profile',

  // Admin permissions
  ADMIN_READ_USERS: 'admin:read:users',
  ADMIN_UPDATE_USER_STATUS: 'admin:update:user:status',
  ADMIN_REVIEW_VERIFICATION: 'admin:review:verification',
  ADMIN_SUSPEND_ACCOUNT: 'admin:suspend:account',
  ADMIN_REACTIVATE_ACCOUNT: 'admin:reactivate:account',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Role-to-permission mapping.
 * Each role inherits permissions from roles below it in hierarchy.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.USER]: [
    Permission.USER_READ_SELF,
    Permission.USER_UPDATE_SELF,
    Permission.USER_DELETE_SELF,
  ],
  [UserRole.AGENT]: [
    // Inherits USER permissions
    Permission.USER_READ_SELF,
    Permission.USER_UPDATE_SELF,
    Permission.USER_DELETE_SELF,
    // Agent-specific permissions
    Permission.AGENT_SUBMIT_VERIFICATION,
    Permission.AGENT_READ_PROFILE,
    Permission.AGENT_UPDATE_PROFILE,
  ],
  [UserRole.ADMIN]: [
    // Inherits all permissions
    Permission.USER_READ_SELF,
    Permission.USER_UPDATE_SELF,
    Permission.USER_DELETE_SELF,
    Permission.AGENT_SUBMIT_VERIFICATION,
    Permission.AGENT_READ_PROFILE,
    Permission.AGENT_UPDATE_PROFILE,
    // Admin-specific permissions
    Permission.ADMIN_READ_USERS,
    Permission.ADMIN_UPDATE_USER_STATUS,
    Permission.ADMIN_REVIEW_VERIFICATION,
    Permission.ADMIN_SUSPEND_ACCOUNT,
    Permission.ADMIN_REACTIVATE_ACCOUNT,
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACTION CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context required for all admin actions.
 * Per business rules: all admin actions require a reason and are audit-logged.
 */
export interface AdminActionContext {
  /** The admin performing the action */
  readonly adminId: string;
  /** Required reason for the action */
  readonly reason: string;
  /** Optional reference to a support ticket or investigation */
  readonly referenceId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identity service error codes.
 */
export const IdentityErrorCode = {
  // Authentication errors
  INVALID_TOKEN: 'IDENTITY_INVALID_TOKEN',
  TOKEN_EXPIRED: 'IDENTITY_TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'IDENTITY_INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'IDENTITY_ACCOUNT_LOCKED',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'IDENTITY_INSUFFICIENT_PERMISSIONS',
  ACCOUNT_SUSPENDED: 'IDENTITY_ACCOUNT_SUSPENDED',
  ACCOUNT_NOT_VERIFIED: 'IDENTITY_ACCOUNT_NOT_VERIFIED',
  AGENT_NOT_VERIFIED: 'IDENTITY_AGENT_NOT_VERIFIED',

  // Validation errors
  INVALID_STATUS_TRANSITION: 'IDENTITY_INVALID_STATUS_TRANSITION',
  ADMIN_REASON_REQUIRED: 'IDENTITY_ADMIN_REASON_REQUIRED',

  // Not found errors
  USER_NOT_FOUND: 'IDENTITY_USER_NOT_FOUND',
  AGENT_PROFILE_NOT_FOUND: 'IDENTITY_AGENT_PROFILE_NOT_FOUND',
} as const;

export type IdentityErrorCode = (typeof IdentityErrorCode)[keyof typeof IdentityErrorCode];
