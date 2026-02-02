/**
 * Base error class for itineraries service.
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
    Error.captureStackTrace(this, this.constructor);
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

// ============================================================
// NOT FOUND ERRORS
// ============================================================

export class NotFoundError extends ServiceError {
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message, code, 404);
    this.name = 'NotFoundError';
  }
}

export class ItineraryNotFoundError extends NotFoundError {
  constructor(message: string) {
    super(message, 'ITINERARY_NOT_FOUND');
    this.name = 'ItineraryNotFoundError';
  }
}

export class SubmissionNotFoundError extends NotFoundError {
  constructor(message: string) {
    super(message, 'SUBMISSION_NOT_FOUND');
    this.name = 'SubmissionNotFoundError';
  }
}

export class VersionNotFoundError extends NotFoundError {
  constructor(message: string) {
    super(message, 'VERSION_NOT_FOUND');
    this.name = 'VersionNotFoundError';
  }
}

// ============================================================
// VALIDATION ERRORS
// ============================================================

export class ValidationError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class InvalidSubmissionError extends ValidationError {
  constructor(message: string) {
    super(message, { type: 'submission' });
    this.name = 'InvalidSubmissionError';
  }
}

export class DuplicateSubmissionError extends ValidationError {
  constructor(message: string) {
    super(message, { type: 'duplicate' });
    this.name = 'DuplicateSubmissionError';
  }
}

// ============================================================
// STATE ERRORS
// ============================================================

export class InvalidStateTransitionError extends ServiceError {
  constructor(message: string) {
    super(message, 'INVALID_STATE_TRANSITION', 409);
    this.name = 'InvalidStateTransitionError';
  }
}

export class StateConflictError extends ServiceError {
  constructor(message: string) {
    super(message, 'STATE_CONFLICT', 409);
    this.name = 'StateConflictError';
  }
}

// ============================================================
// AUTH ERRORS
// ============================================================

export class UnauthorizedError extends ServiceError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

// ============================================================
// EXTERNAL ERRORS
// ============================================================

export class ExternalServiceError extends ServiceError {
  constructor(message: string, service: string) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, { service });
    this.name = 'ExternalServiceError';
  }
}

export class DatabaseError extends ServiceError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

// ============================================================
// ERROR HANDLER
// ============================================================

/**
 * Error to HTTP response mapping.
 */
export function errorToResponse(error: unknown): {
  statusCode: number;
  body: Record<string, unknown>;
} {
  if (error instanceof ServiceError) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON(),
    };
  }

  if (error instanceof Error) {
    console.error('Unexpected error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          // Include details for debugging
          details: error.message,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
      },
    },
  };
}

/**
 * Check if error is a specific type.
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
