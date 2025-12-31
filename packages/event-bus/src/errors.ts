/**
 * Base error class for event bus errors.
 */
export class EventBusError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'EventBusError';
    Object.setPrototypeOf(this, EventBusError.prototype);
  }
}

/**
 * Error thrown when event validation fails.
 */
export class EventValidationError extends EventBusError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'EVENT_VALIDATION_ERROR');
    this.name = 'EventValidationError';
    Object.setPrototypeOf(this, EventValidationError.prototype);
  }
}

/**
 * Error thrown when event publishing fails.
 */
export class EventPublishError extends EventBusError {
  constructor(
    message: string,
    public readonly eventId?: string,
    public readonly cause?: Error
  ) {
    super(message, 'EVENT_PUBLISH_ERROR');
    this.name = 'EventPublishError';
    Object.setPrototypeOf(this, EventPublishError.prototype);
  }
}

/**
 * Error thrown when handler execution times out.
 */
export class HandlerTimeoutError extends EventBusError {
  constructor(
    public readonly subscriptionId: string,
    public readonly timeoutMs: number
  ) {
    super(
      `Handler ${subscriptionId} timed out after ${timeoutMs}ms`,
      'HANDLER_TIMEOUT_ERROR'
    );
    this.name = 'HandlerTimeoutError';
    Object.setPrototypeOf(this, HandlerTimeoutError.prototype);
  }
}
