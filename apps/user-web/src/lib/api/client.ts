/**
 * API Client
 * 
 * Provides helper functions for making authenticated requests
 * to backend microservices.
 */

import { getAccessToken, refreshToken, getRefreshToken, storeAuthTokens, clearAuthData } from './auth';
import { getServiceUrl, ServiceName } from './services';

export interface ApiRequestOptions extends RequestInit {
  /** Skip authentication header */
  skipAuth?: boolean;
  /** Custom timeout in milliseconds */
  timeout?: number;
}

export interface ApiError extends Error {
  status: number;
  code: string;
  data?: unknown;
}

const DEFAULT_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || '30000', 10);

/**
 * Create an API error from a response
 */
async function createApiError(response: Response): Promise<ApiError> {
  let data: { error?: { message?: string; code?: string }; message?: string } = {};
  
  try {
    data = await response.json();
  } catch {
    // Response may not be JSON
  }
  
  const error = new Error(
    data.error?.message || data.message || `Request failed with status ${response.status}`
  ) as ApiError;
  
  error.status = response.status;
  error.code = data.error?.code || `HTTP_${response.status}`;
  error.data = data;
  
  return error;
}

/**
 * Handle token refresh on 401 responses
 */
async function handleUnauthorized(): Promise<boolean> {
  const token = getRefreshToken();
  
  if (!token) {
    clearAuthData();
    return false;
  }
  
  try {
    const response = await refreshToken(token);
    storeAuthTokens(response);
    return true;
  } catch {
    clearAuthData();
    return false;
  }
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth = false, timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options;
  
  // Build headers
  const headers = new Headers(fetchOptions.headers);
  
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add auth header if not skipped
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
    
    // Handle unauthorized - attempt token refresh
    if (response.status === 401 && !skipAuth) {
      const refreshed = await handleUnauthorized();
      
      if (refreshed) {
        // Retry with new token
        const newToken = getAccessToken();
        headers.set('Authorization', `Bearer ${newToken}`);
        
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
        });
        
        if (!retryResponse.ok) {
          throw await createApiError(retryResponse);
        }
        
        return retryResponse.json();
      }
      
      throw await createApiError(response);
    }
    
    if (!response.ok) {
      throw await createApiError(response);
    }
    
    // Handle empty responses
    const contentType = response.headers.get('Content-Type');
    if (response.status === 204 || !contentType?.includes('application/json')) {
      return {} as T;
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error('Request timeout') as ApiError;
      timeoutError.status = 408;
      timeoutError.code = 'REQUEST_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make a request to a specific service
 */
export async function serviceRequest<T = unknown>(
  service: ServiceName,
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const baseUrl = getServiceUrl(service);
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  return apiRequest<T>(url, options);
}

// Convenience methods for each service
export const identityApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('identity', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('identity', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('identity', path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('identity', path, { ...options, method: 'DELETE' }),
};

export const requestsApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('requests', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('requests', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('requests', path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('requests', path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('requests', path, { ...options, method: 'DELETE' }),
};

export const itinerariesApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('itineraries', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('itineraries', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('itineraries', path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('itineraries', path, { ...options, method: 'DELETE' }),
};

export const matchingApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('matching', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('matching', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
};

export const bookingPaymentsApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('bookingPayments', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('bookingPayments', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('bookingPayments', path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('bookingPayments', path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
};

export const messagingApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('messaging', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('messaging', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
};

export const notificationsApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('notifications', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('notifications', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('notifications', path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
};

export const disputesApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('disputes', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('disputes', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('disputes', path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
};

export const reviewsApi = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    serviceRequest<T>('reviews', path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    serviceRequest<T>('reviews', path, { ...options, method: 'POST', body: JSON.stringify(body) }),
};
