/**
 * Messaging Service - API Error Handling
 *
 * Standardized error responses for the API.
 */

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
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

// =============================================================================
// COMMON ERRORS
// =============================================================================

export const Errors = {
  // Authentication & Authorization
  UNAUTHORIZED: () =>
    new ApiError(401, 'UNAUTHORIZED', 'Authentication required'),
  FORBIDDEN: (message = 'You do not have permission to perform this action') =>
    new ApiError(403, 'FORBIDDEN', message),
  INVALID_TOKEN: () =>
    new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'),

  // Resource Errors
  CONVERSATION_NOT_FOUND: (id: string) =>
    new ApiError(404, 'CONVERSATION_NOT_FOUND', `Conversation ${id} not found`),
  MESSAGE_NOT_FOUND: (id: string) =>
    new ApiError(404, 'MESSAGE_NOT_FOUND', `Message ${id} not found`),
  ATTACHMENT_NOT_FOUND: (id: string) =>
    new ApiError(404, 'ATTACHMENT_NOT_FOUND', `Attachment ${id} not found`),
  EXPORT_NOT_FOUND: (id: string) =>
    new ApiError(404, 'EXPORT_NOT_FOUND', `Evidence export ${id} not found`),

  // Validation Errors
  VALIDATION_ERROR: (details: Record<string, unknown>) =>
    new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data', details),
  INVALID_CONVERSATION_STATE: (current: string, expected: string[]) =>
    new ApiError(
      400,
      'INVALID_CONVERSATION_STATE',
      `Cannot perform action: conversation is ${current}, expected one of: ${expected.join(', ')}`
    ),

  // Business Rule Violations
  CONVERSATION_CLOSED: () =>
    new ApiError(
      400,
      'CONVERSATION_CLOSED',
      'Cannot send messages to a closed conversation'
    ),
  CONTACTS_NOT_REVEALED: () =>
    new ApiError(
      403,
      'CONTACTS_NOT_REVEALED',
      'Contact details are not available until payment is completed'
    ),
  NOT_PARTICIPANT: () =>
    new ApiError(
      403,
      'NOT_PARTICIPANT',
      'You are not a participant in this conversation'
    ),
  CANNOT_EDIT_MESSAGE: (reason: string) =>
    new ApiError(400, 'CANNOT_EDIT_MESSAGE', `Cannot edit message: ${reason}`),
  CANNOT_DELETE_MESSAGE: (reason: string) =>
    new ApiError(400, 'CANNOT_DELETE_MESSAGE', `Cannot delete message: ${reason}`),

  // Rate Limiting
  RATE_LIMITED: (retryAfterSeconds: number) =>
    new ApiError(
      429,
      'RATE_LIMITED',
      `Too many requests. Please try again in ${retryAfterSeconds} seconds`,
      { retryAfter: retryAfterSeconds }
    ),
  MESSAGE_RATE_LIMITED: (limit: number) =>
    new ApiError(
      429,
      'MESSAGE_RATE_LIMITED',
      `Message limit exceeded. Maximum ${limit} messages per minute`
    ),
  CONVERSATION_RATE_LIMITED: (limit: number) =>
    new ApiError(
      429,
      'CONVERSATION_RATE_LIMITED',
      `Conversation limit exceeded. Maximum ${limit} new conversations per hour`
    ),

  // Attachment Errors
  ATTACHMENT_TOO_LARGE: (maxSize: number) =>
    new ApiError(
      413,
      'ATTACHMENT_TOO_LARGE',
      `Attachment exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`
    ),
  ATTACHMENT_TYPE_NOT_ALLOWED: (mimeType: string, allowed: string[]) =>
    new ApiError(
      400,
      'ATTACHMENT_TYPE_NOT_ALLOWED',
      `File type ${mimeType} is not allowed. Allowed types: ${allowed.join(', ')}`
    ),
  TOO_MANY_ATTACHMENTS: (max: number) =>
    new ApiError(
      400,
      'TOO_MANY_ATTACHMENTS',
      `Maximum ${max} attachments per message`
    ),

  // Admin Errors
  ADMIN_REASON_REQUIRED: () =>
    new ApiError(
      400,
      'ADMIN_REASON_REQUIRED',
      'Admin actions require a reason'
    ),

  // Internal Errors
  INTERNAL_ERROR: (message = 'An unexpected error occurred') =>
    new ApiError(500, 'INTERNAL_ERROR', message),
  SERVICE_UNAVAILABLE: (service: string) =>
    new ApiError(503, 'SERVICE_UNAVAILABLE', `${service} is currently unavailable`),
} as const;

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

export function errorHandler(
  error: unknown,
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
  _next: unknown
): void {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json(error.toJSON());
    return;
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
