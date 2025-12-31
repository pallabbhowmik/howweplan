/**
 * Custom error classes for the Identity & Access service.
 * Provides structured error handling with error codes.
 */

import { IdentityErrorCode } from '../types/identity.types.js';

/**
 * Base error class for identity service errors.
 */
export class IdentityError extends Error {
  readonly code: IdentityErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: IdentityErrorCode,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IdentityError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION ERRORS
// ─────────────────────────────────────────────────────────────────────────────

export class InvalidTokenError extends IdentityError {
  constructor(details?: Record<string, unknown>) {
    super(IdentityErrorCode.INVALID_TOKEN, 'Invalid or malformed token', 401, details);
    this.name = 'InvalidTokenError';
  }
}

export class TokenExpiredError extends IdentityError {
  constructor() {
    super(IdentityErrorCode.TOKEN_EXPIRED, 'Token has expired', 401);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidCredentialsError extends IdentityError {
  constructor() {
    super(IdentityErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountLockedError extends IdentityError {
  constructor(lockExpiresAt: Date) {
    super(
      IdentityErrorCode.ACCOUNT_LOCKED,
      'Account is temporarily locked due to too many failed login attempts',
      423,
      { lockExpiresAt: lockExpiresAt.toISOString() }
    );
    this.name = 'AccountLockedError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION ERRORS
// ─────────────────────────────────────────────────────────────────────────────

export class InsufficientPermissionsError extends IdentityError {
  constructor(requiredPermission?: string) {
    super(
      IdentityErrorCode.INSUFFICIENT_PERMISSIONS,
      'You do not have permission to perform this action',
      403,
      requiredPermission ? { requiredPermission } : undefined
    );
    this.name = 'InsufficientPermissionsError';
  }
}

export class AccountSuspendedError extends IdentityError {
  constructor() {
    super(
      IdentityErrorCode.ACCOUNT_SUSPENDED,
      'Your account has been suspended. Contact support for assistance.',
      403
    );
    this.name = 'AccountSuspendedError';
  }
}

export class AccountNotVerifiedError extends IdentityError {
  constructor() {
    super(
      IdentityErrorCode.ACCOUNT_NOT_VERIFIED,
      'Please verify your email address to continue',
      403
    );
    this.name = 'AccountNotVerifiedError';
  }
}

export class AgentNotVerifiedError extends IdentityError {
  constructor() {
    super(
      IdentityErrorCode.AGENT_NOT_VERIFIED,
      'Agent verification is required to perform this action',
      403
    );
    this.name = 'AgentNotVerifiedError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION ERRORS
// ─────────────────────────────────────────────────────────────────────────────

export class InvalidStatusTransitionError extends IdentityError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      IdentityErrorCode.INVALID_STATUS_TRANSITION,
      `Cannot transition from ${currentStatus} to ${targetStatus}`,
      400,
      { currentStatus, targetStatus }
    );
    this.name = 'InvalidStatusTransitionError';
  }
}

export class AdminReasonRequiredError extends IdentityError {
  constructor() {
    super(
      IdentityErrorCode.ADMIN_REASON_REQUIRED,
      'A reason is required for all administrative actions',
      400
    );
    this.name = 'AdminReasonRequiredError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOT FOUND ERRORS
// ─────────────────────────────────────────────────────────────────────────────

export class UserNotFoundError extends IdentityError {
  constructor(identifier?: string) {
    super(IdentityErrorCode.USER_NOT_FOUND, 'User not found', 404, identifier ? { identifier } : undefined);
    this.name = 'UserNotFoundError';
  }
}

export class AgentProfileNotFoundError extends IdentityError {
  constructor(userId?: string) {
    super(
      IdentityErrorCode.AGENT_PROFILE_NOT_FOUND,
      'Agent profile not found',
      404,
      userId ? { userId } : undefined
    );
    this.name = 'AgentProfileNotFoundError';
  }
}
