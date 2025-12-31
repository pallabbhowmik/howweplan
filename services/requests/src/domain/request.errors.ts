/**
 * Request Domain Errors
 * 
 * Custom error classes for the request domain.
 * Each error has a unique code for programmatic handling.
 */

export class RequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RequestError';
    Object.setPrototypeOf(this, RequestError.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class RequestNotFoundError extends RequestError {
  constructor(requestId: string) {
    super(
      `Request not found: ${requestId}`,
      'REQUEST_NOT_FOUND',
      404,
      { requestId }
    );
    this.name = 'RequestNotFoundError';
    Object.setPrototypeOf(this, RequestNotFoundError.prototype);
  }
}

export class DailyCapExceededError extends RequestError {
  constructor(userId: string, dailyCap: number) {
    super(
      `Daily request cap of ${dailyCap} exceeded`,
      'DAILY_CAP_EXCEEDED',
      429,
      { userId, dailyCap }
    );
    this.name = 'DailyCapExceededError';
    Object.setPrototypeOf(this, DailyCapExceededError.prototype);
  }
}

export class MaxOpenRequestsExceededError extends RequestError {
  constructor(userId: string, maxOpen: number) {
    super(
      `Maximum open requests limit of ${maxOpen} exceeded`,
      'MAX_OPEN_REQUESTS_EXCEEDED',
      429,
      { userId, maxOpen }
    );
    this.name = 'MaxOpenRequestsExceededError';
    Object.setPrototypeOf(this, MaxOpenRequestsExceededError.prototype);
  }
}

export class InvalidStateTransitionError extends RequestError {
  constructor(
    requestId: string,
    fromState: string,
    toState: string,
    validTransitions: string[]
  ) {
    super(
      `Invalid state transition from '${fromState}' to '${toState}'`,
      'INVALID_STATE_TRANSITION',
      400,
      { requestId, fromState, toState, validTransitions }
    );
    this.name = 'InvalidStateTransitionError';
    Object.setPrototypeOf(this, InvalidStateTransitionError.prototype);
  }
}

export class RequestExpiredError extends RequestError {
  constructor(requestId: string) {
    super(
      `Request has expired: ${requestId}`,
      'REQUEST_EXPIRED',
      410,
      { requestId }
    );
    this.name = 'RequestExpiredError';
    Object.setPrototypeOf(this, RequestExpiredError.prototype);
  }
}

export class UnauthorizedRequestAccessError extends RequestError {
  constructor(userId: string, requestId: string) {
    super(
      `User ${userId} is not authorized to access request ${requestId}`,
      'UNAUTHORIZED_REQUEST_ACCESS',
      403,
      { userId, requestId }
    );
    this.name = 'UnauthorizedRequestAccessError';
    Object.setPrototypeOf(this, UnauthorizedRequestAccessError.prototype);
  }
}

export class RepositoryError extends RequestError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, 'REPOSITORY_ERROR', 500);
    this.name = 'RepositoryError';
    Object.setPrototypeOf(this, RepositoryError.prototype);
  }
}

export class ValidationError extends RequestError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class RequestAlreadyCancelledError extends RequestError {
  constructor(requestId: string) {
    super(
      `Request is already cancelled: ${requestId}`,
      'REQUEST_ALREADY_CANCELLED',
      400,
      { requestId }
    );
    this.name = 'RequestAlreadyCancelledError';
    Object.setPrototypeOf(this, RequestAlreadyCancelledError.prototype);
  }
}
