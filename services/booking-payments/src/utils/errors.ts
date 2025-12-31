/**
 * Error Utilities
 *
 * Custom error classes and error handling utilities.
 */

/** Base error class for booking-payments service */
export abstract class BookingPaymentError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): { code: string; message: string } {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/** Validation error for invalid input */
export class ValidationError extends BookingPaymentError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

/** Not found error for missing resources */
export class NotFoundError extends BookingPaymentError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly resourceType: string;
  readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/** Conflict error for state transition violations */
export class ConflictError extends BookingPaymentError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
  }
}

/** Unauthorized error for authentication failures */
export class UnauthorizedError extends BookingPaymentError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

/** Forbidden error for authorization failures */
export class ForbiddenError extends BookingPaymentError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;

  constructor(message = 'Forbidden') {
    super(message);
  }
}

/** Payment error for Stripe-related failures */
export class PaymentError extends BookingPaymentError {
  readonly code = 'PAYMENT_ERROR';
  readonly statusCode = 402;
  readonly stripeErrorCode: string | undefined;

  constructor(message: string, stripeErrorCode?: string) {
    super(message);
    this.stripeErrorCode = stripeErrorCode;
  }
}

/** Refund denied error for non-refundable requests */
export class RefundDeniedError extends BookingPaymentError {
  readonly code = 'REFUND_DENIED';
  readonly statusCode = 422;
  readonly reason: string;

  constructor(reason: string) {
    super(`Refund denied: ${reason}`);
    this.reason = reason;
  }
}

/** Invalid state transition error */
export class InvalidStateTransitionError extends BookingPaymentError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly statusCode = 409;
  readonly currentState: string;
  readonly targetState: string;

  constructor(currentState: string, targetState: string) {
    super(`Invalid transition from ${currentState} to ${targetState}`);
    this.currentState = currentState;
    this.targetState = targetState;
  }
}

/** Idempotency conflict error */
export class IdempotencyConflictError extends BookingPaymentError {
  readonly code = 'IDEMPOTENCY_CONFLICT';
  readonly statusCode = 409;
  readonly idempotencyKey: string;

  constructor(idempotencyKey: string) {
    super(`Request with idempotency key "${idempotencyKey}" is already processing`);
    this.idempotencyKey = idempotencyKey;
  }
}

/** Check if an error is a known booking-payment error */
export function isBookingPaymentError(error: unknown): error is BookingPaymentError {
  return error instanceof BookingPaymentError;
}

/** Format error for API response */
export function formatErrorResponse(error: unknown): {
  code: string;
  message: string;
  statusCode: number;
} {
  if (isBookingPaymentError(error)) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    statusCode: 500,
  };
}
