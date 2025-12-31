/**
 * API Response Types
 * 
 * Standardized response types for all API calls.
 */

// ============================================================================
// BASE RESPONSE TYPES
// ============================================================================

export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: ResponseMeta;
}

export interface ApiError {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface ResponseMeta {
  readonly page?: number;
  readonly pageSize?: number;
  readonly totalCount?: number;
  readonly hasMore?: boolean;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface PaginatedResponse<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
  readonly totalPages: number;
}

// ============================================================================
// FILTER/SORT TYPES
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortParams<T extends string = string> {
  readonly field: T;
  readonly direction: SortDirection;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success === true;
}

export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.success === false;
}
