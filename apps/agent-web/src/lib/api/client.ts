/**
 * Agent Portal API Client
 * 
 * Provides typed, consistent API communication for the agent portal.
 * All requests include authentication and error handling.
 */

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
  constructor(message: string = 'Network error occurred') {
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
// API CLIENT CONFIGURATION
// ============================================================================

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

/**
 * Resolves the API base URL from environment or defaults.
 * Uses the same logic as auth.ts for consistency.
 */
function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (envUrl) {
    // Normalize: remove trailing slash and /api suffix if present
    return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
  }
  
  // Safe local fallback for development only
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3001';
  }
  
  throw new Error(
    'Missing NEXT_PUBLIC_API_BASE_URL (required). ' +
    'Set it to your API Gateway base URL (e.g. https://<gateway-host> or http://localhost:3001).'
  );
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private getAuthToken: () => string | null;

  constructor() {
    this.baseUrl = getApiBaseUrl();
    this.timeout = 30000;
    // Lazy import to avoid circular dependency
    this.getAuthToken = () => {
      if (typeof window === 'undefined') return null;
      const token = localStorage.getItem('tc_access_token');
      if (!token || token === 'undefined' || token === 'null') return null;
      return token;
    };
  }

  /**
   * @deprecated Use automatic token retrieval instead. Token is now retrieved from localStorage.
   */
  setAuthToken(_token: string | null): void {
    // No-op - kept for backward compatibility
    // Token is now automatically retrieved from localStorage
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

  async put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
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

  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

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
        const errorData = await response.json().catch(() => ({}));
        throw new ApiClientError(
          errorData.message || `Request failed with status ${response.status}`,
          errorData.code || 'UNKNOWN_ERROR',
          response.status,
          errorData.details
        );
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) throw error;

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError();
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError();
    }
  }
}

export const apiClient = new ApiClient();

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function buildPaginationParams(params: PaginationParams): Record<string, string | number | boolean | undefined> {
  return {
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}
