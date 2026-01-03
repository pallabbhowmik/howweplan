/**
 * Base API Client
 * 
 * Provides typed, consistent API communication.
 * All requests include authentication and error handling.
 */

import { env } from '@/config/env';
import type { ApiResponse, ApiError, PaginationParams, PaginatedResponse } from '@/types';

// ============================================================================
// API CLIENT CONFIGURATION
// ============================================================================

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
    this.timeout = env.NEXT_PUBLIC_API_TIMEOUT_MS;
  }

  /**
   * Set authentication token for requests.
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get current auth token (for sharing with other clients).
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * GET request
   */
  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  /**
   * Core request method with timeout and error handling.
   */
  private async request<T>(path: string, config: RequestConfig): Promise<T> {
    const url = this.buildUrl(path, config.params);
    const timeout = config.timeout ?? this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...config.headers,
        },
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      const data = await response.json();

      // Handle both wrapped {success: true, data: ...} and unwrapped responses
      if (data && typeof data === 'object' && 'success' in data) {
        // Wrapped response format
        if (!data.success) {
          const error = data as ApiError;
          throw new ApiClientError(
            error.error.message,
            error.error.code,
            response.status,
            error.error.details
          );
        }
        return data.data as T;
      }
      
      // Direct/unwrapped response - return as-is
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError();
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown error occurred');
    }
  }

  /**
   * Build URL with query parameters.
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    // Ensure baseUrl ends without slash and path starts with slash for proper concatenation
    const base = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${base}${cleanPath}`;
    
    const url = new URL(fullUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Get authentication headers.
   */
  private getAuthHeaders(): Record<string, string> {
    if (!this.authToken) {
      return {};
    }
    return { Authorization: `Bearer ${this.authToken}` };
  }

  /**
   * Handle error responses from API.
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiError['error'];

    try {
      const data = await response.json();
      errorData = data.error || { code: 'UNKNOWN', message: 'Unknown error' };
    } catch {
      errorData = {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Unknown error',
      };
    }

    throw new ApiClientError(
      errorData.message,
      errorData.code,
      response.status,
      errorData.details
    );
  }
}

// ============================================================================
// PAGINATION HELPER
// ============================================================================

export function buildPaginationParams(params: PaginationParams): Record<string, number> {
  return {
    page: params.page ?? 1,
    pageSize: Math.min(params.pageSize ?? env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE, env.NEXT_PUBLIC_MAX_PAGE_SIZE),
  };
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const apiClient = new ApiClient();

// ============================================================================
// SERVICE-SPECIFIC CLIENTS
// ============================================================================

/**
 * Get disputes service base URL.
 * Uses NEXT_PUBLIC_SERVICE_DISPUTES_URL if available, otherwise falls back to main API.
 */
function getDisputesBaseUrl(): string {
  if (env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    return env.NEXT_PUBLIC_API_BASE_URL;
  }
  return env.NEXT_PUBLIC_SERVICE_DISPUTES_URL || env.NEXT_PUBLIC_API_BASE_URL;
}

/**
 * Disputes API client - points to disputes microservice.
 * Shares auth token with main apiClient.
 */
class DisputesApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = `${getDisputesBaseUrl()}/api/v1`;
    this.timeout = env.NEXT_PUBLIC_API_TIMEOUT_MS;
  }

  /**
   * GET request
   */
  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  /**
   * Core request method with timeout and error handling.
   * Uses auth token from main apiClient.
   */
  private async request<T>(path: string, config: RequestConfig): Promise<T> {
    const url = this.buildUrl(path, config.params);
    const timeout = config.timeout ?? this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Get auth token from main apiClient
      const token = apiClient.getAuthToken();
      const authHeaders: Record<string, string> = token 
        ? { Authorization: `Bearer ${token}` }
        : {};
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...config.headers,
        },
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      const data = await response.json();

      // Handle both wrapped {success: true, data: ...} and unwrapped responses
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          const error = data as ApiError;
          throw new ApiClientError(
            error.error.message,
            error.error.code,
            response.status,
            error.error.details
          );
        }
        return data.data as T;
      }
      
      // Direct/unwrapped response - return as-is
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError();
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown error occurred');
    }
  }

  /**
   * Build URL with query parameters.
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    // Ensure baseUrl ends without slash and path starts with slash for proper concatenation
    const base = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${base}${cleanPath}`;
    
    const url = new URL(fullUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Handle error responses from API.
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiError['error'];

    try {
      const data = await response.json();
      errorData = data.error || { code: 'UNKNOWN', message: 'Unknown error' };
    } catch {
      errorData = {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Unknown error',
      };
    }

    throw new ApiClientError(
      errorData.message,
      errorData.code,
      response.status,
      errorData.details
    );
  }
}

export const disputesApiClient = new DisputesApiClient();

// ============================================================================
// AUDIT SERVICE CLIENT
// ============================================================================

/**
 * Get audit service base URL.
 * Uses NEXT_PUBLIC_SERVICE_AUDIT_URL if available, otherwise falls back to main API.
 */
function getAuditBaseUrl(): string {
  if (env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    return env.NEXT_PUBLIC_API_BASE_URL;
  }
  return env.NEXT_PUBLIC_SERVICE_AUDIT_URL || env.NEXT_PUBLIC_API_BASE_URL;
}

/**
 * Audit API client - points to audit microservice.
 * Shares auth token with main apiClient.
 */
class AuditApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = `${getAuditBaseUrl()}/api/v1`;
    this.timeout = env.NEXT_PUBLIC_API_TIMEOUT_MS;
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async request<T>(path: string, config: RequestConfig): Promise<T> {
    const url = this.buildUrl(path, config.params);
    const timeout = config.timeout ?? this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const token = apiClient.getAuthToken();
      const authHeaders: Record<string, string> = token 
        ? { Authorization: `Bearer ${token}` }
        : {};
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...config.headers,
        },
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      const data = await response.json();

      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          const error = data as ApiError;
          throw new ApiClientError(
            error.error.message,
            error.error.code,
            response.status,
            error.error.details
          );
        }
        return data.data as T;
      }
      
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError();
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown error occurred');
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${base}${cleanPath}`;
    
    const url = new URL(fullUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiError['error'];

    try {
      const data = await response.json();
      errorData = data.error || { code: 'UNKNOWN', message: 'Unknown error' };
    } catch {
      errorData = {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Unknown error',
      };
    }

    throw new ApiClientError(
      errorData.message,
      errorData.code,
      response.status,
      errorData.details
    );
  }
}

export const auditApiClient = new AuditApiClient();

// ============================================================================
// BOOKING PAYMENTS SERVICE CLIENT
// ============================================================================

/**
 * Get booking payments service base URL.
 */
function getBookingPaymentsBaseUrl(): string {
  if (env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    return env.NEXT_PUBLIC_API_BASE_URL;
  }
  return env.NEXT_PUBLIC_SERVICE_BOOKING_PAYMENTS_URL || env.NEXT_PUBLIC_API_BASE_URL;
}

/**
 * Booking Payments API client - points to booking-payments microservice.
 */
class BookingPaymentsApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = `${getBookingPaymentsBaseUrl()}/api/v1`;
    this.timeout = env.NEXT_PUBLIC_API_TIMEOUT_MS;
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async request<T>(path: string, config: RequestConfig): Promise<T> {
    const url = this.buildUrl(path, config.params);
    const timeout = config.timeout ?? this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const token = apiClient.getAuthToken();
      const authHeaders: Record<string, string> = token 
        ? { Authorization: `Bearer ${token}` }
        : {};
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...config.headers,
        },
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      const data = await response.json();

      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          const error = data as ApiError;
          throw new ApiClientError(
            error.error.message,
            error.error.code,
            response.status,
            error.error.details
          );
        }
        return data.data as T;
      }
      
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError();
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown error occurred');
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${base}${cleanPath}`;
    
    const url = new URL(fullUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiError['error'];

    try {
      const data = await response.json();
      errorData = data.error || { code: 'UNKNOWN', message: 'Unknown error' };
    } catch {
      errorData = {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Unknown error',
      };
    }

    throw new ApiClientError(
      errorData.message,
      errorData.code,
      response.status,
      errorData.details
    );
  }
}

export const bookingPaymentsApiClient = new BookingPaymentsApiClient();
