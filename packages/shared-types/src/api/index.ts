/**
 * API Types - Request/response shapes and error handling
 * These types define the contract for API communication.
 */

import type { ISODateString } from '../primitives';

// ============================================================================
// Pagination & Filtering
// ============================================================================

/**
 * Sort order direction
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Generic sort configuration
 */
export interface SortConfig<TField extends string = string> {
  readonly field: TField;
  readonly order: SortOrder;
}

/**
 * Date range filter
 */
export interface DateRange {
  /** Inclusive start date */
  readonly from?: ISODateString;
  /** Inclusive end date */
  readonly to?: ISODateString;
}

/**
 * Pagination request parameters
 */
export interface PaginationRequest {
  /** Page number (1-indexed) */
  readonly page: number;
  /** Number of items per page */
  readonly pageSize: number;
  /** Optional cursor for cursor-based pagination */
  readonly cursor?: string;
}

/**
 * Pagination metadata in response
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  readonly page: number;
  /** Number of items per page */
  readonly pageSize: number;
  /** Total number of items across all pages */
  readonly totalItems: number;
  /** Total number of pages */
  readonly totalPages: number;
  /** Whether there is a next page */
  readonly hasNextPage: boolean;
  /** Whether there is a previous page */
  readonly hasPreviousPage: boolean;
  /** Cursor for next page (cursor-based pagination) */
  readonly nextCursor?: string;
  /** Cursor for previous page (cursor-based pagination) */
  readonly previousCursor?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginationResponse<T> {
  /** Array of items for current page */
  readonly items: readonly T[];
  /** Pagination metadata */
  readonly pagination: PaginationMeta;
}

/**
 * Generic list request with pagination, sorting, and filtering
 */
export interface ListRequest<
  TFilter = Record<string, unknown>,
  TSortField extends string = string,
> {
  readonly pagination: PaginationRequest;
  readonly sort?: SortConfig<TSortField>;
  readonly filters?: TFilter;
  readonly search?: string;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Standardized API error codes
 */
export enum ApiErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',

  // Domain-specific errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  BOOKING_UNAVAILABLE = 'BOOKING_UNAVAILABLE',
  ITINERARY_LOCKED = 'ITINERARY_LOCKED',
  AGENT_UNAVAILABLE = 'AGENT_UNAVAILABLE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ALREADY_PURCHASED = 'ALREADY_PURCHASED',
}

/**
 * Field-level validation error
 */
export interface FieldError {
  /** Field path (e.g., "user.email" or "items[0].quantity") */
  readonly field: string;
  /** Error message for this field */
  readonly message: string;
  /** Error code for programmatic handling */
  readonly code?: string;
}

/**
 * Standardized API error response
 */
export interface ApiErrorResponse {
  /** Always false for error responses */
  readonly success: false;
  /** Error details */
  readonly error: {
    /** Machine-readable error code */
    readonly code: ApiErrorCode;
    /** Human-readable error message */
    readonly message: string;
    /** Field-level validation errors */
    readonly fields?: readonly FieldError[];
    /** Additional error context */
    readonly details?: Record<string, unknown>;
    /** Unique request identifier for support/debugging */
    readonly requestId?: string;
    /** Timestamp of the error */
    readonly timestamp: ISODateString;
  };
}

// ============================================================================
// Success Responses
// ============================================================================

/**
 * Standardized API success response
 */
export interface ApiSuccessResponse<T> {
  /** Always true for success responses */
  readonly success: true;
  /** Response payload */
  readonly data: T;
  /** Optional metadata */
  readonly meta?: ResponseMeta;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
  /** Unique request identifier */
  readonly requestId?: string;
  /** Response timestamp */
  readonly timestamp: ISODateString;
  /** Response generation time in milliseconds */
  readonly processingTimeMs?: number;
  /** API version */
  readonly apiVersion?: string;
  /** Deprecation warning */
  readonly deprecationWarning?: string;
}

/**
 * Union type for any API response
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Empty success response (for DELETE, etc.)
 */
export type ApiEmptyResponse = ApiSuccessResponse<null>;

/**
 * Paginated success response
 */
export type ApiPaginatedResponse<T> = ApiSuccessResponse<PaginationResponse<T>>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isApiError<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false;
}
