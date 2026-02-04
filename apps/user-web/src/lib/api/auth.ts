/**
 * Authentication API Client
 * 
 * Handles login, registration, token management, and automatic refresh
 * through the API Gateway.
 * 
 * All requests go through: /api/identity/* (routed by gateway)
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  // Safe local fallback for development only
  (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');

if (!API_BASE_URL) {
  throw new Error(
    'Missing NEXT_PUBLIC_API_BASE_URL (required). ' +
      'Set it to https://howweplan-gateway.onrender.com (production) or http://localhost:3001 (local).'
  );
}

// Normalize: remove trailing slash and /api suffix if present
const normalizedBaseUrl = API_BASE_URL
  .replace(/\/+$/, '') // Remove trailing slashes
  .replace(/\/api$/, ''); // Remove /api suffix if someone added it

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'AGENT';
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: AuthUser;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'USER' | 'AGENT';
}

export class AuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Helper to check if an error is a network/connection error
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') || msg.includes('connection') || msg.includes('fetch');
  }
  return false;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!response.ok) {
    const errorMessage = data.error?.message || data.message || 'An error occurred';
    const errorCode = data.error?.code || 'UNKNOWN_ERROR';
    throw new AuthError(errorMessage, errorCode, response.status);
  }
  
  return data.data || data;
}

/**
 * Login with email and password
 */
export async function login(params: LoginParams): Promise<AuthResponse> {
  const response = await fetch(`${normalizedBaseUrl}/api/identity/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  return handleResponse<AuthResponse>(response);
}

/**
 * Register a new user account
 */
export async function register(params: RegisterParams): Promise<AuthResponse> {
  const response = await fetch(`${normalizedBaseUrl}/api/identity/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...params,
      role: params.role || 'USER',
    }),
  });

  return handleResponse<AuthResponse>(response);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(token: string): Promise<AuthResponse> {
  const response = await fetch(`${normalizedBaseUrl}/api/identity/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: token }),
  });

  return handleResponse<AuthResponse>(response);
}

/**
 * Logout and invalidate tokens on the server
 */
export async function logout(accessToken: string): Promise<void> {
  try {
    await fetch(`${normalizedBaseUrl}/api/identity/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Ignore errors during logout - tokens will expire anyway
  }
}

/**
 * Request a password reset email
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${normalizedBaseUrl}/api/identity/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return handleResponse<{ message: string }>(response);
}

/**
 * Reset password using token from email
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${normalizedBaseUrl}/api/identity/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  });

  return handleResponse<{ message: string }>(response);
}

/**
 * Verify email using token from welcome email
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  const response = await fetch(`${normalizedBaseUrl}/api/identity/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  return handleResponse<{ message: string }>(response);
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const response = await fetch(`${normalizedBaseUrl}/api/identity/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return handleResponse<{ message: string }>(response);
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'tc_access_token';
const REFRESH_TOKEN_KEY = 'tc_refresh_token';
const USER_KEY = 'tc_user';

/**
 * Store auth tokens in localStorage
 */
export function storeAuthTokens(response: AuthResponse): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Get stored user data
 */
export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored || stored === 'undefined' || stored === 'null') return null;
    return JSON.parse(stored);
  } catch (e) {
    console.warn('[auth] Failed to parse stored user:', e);
    return null;
  }
}

/**
 * Clear all auth data
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if access token is expired (with 60s buffer)
 */
export function isTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    const expiresAt = payload.exp * 1000;
    // Return true if token expires in less than 60 seconds
    return Date.now() >= expiresAt - 60000;
  } catch {
    return true;
  }
}

// Singleton promise for in-flight refresh to prevent multiple concurrent refresh attempts
let refreshInProgress: Promise<boolean> | null = null;
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN_MS = 5000; // Wait 5 seconds between refresh attempts

/**
 * Attempt to refresh the access token if needed
 * Returns true if successful, false otherwise
 */
export async function ensureValidToken(): Promise<boolean> {
  if (!isTokenExpired()) {
    return true;
  }
  
  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) {
    return false;
  }
  
  // Prevent rapid-fire refresh attempts
  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
    // If we recently tried and failed, don't try again immediately
    if (!getAccessToken()) return false;
  }

  // If a refresh is already in progress, wait for it
  if (refreshInProgress) {
    return refreshInProgress;
  }

  lastRefreshAttempt = now;

  refreshInProgress = (async () => {
    try {
      const response = await refreshToken(storedRefreshToken);
      storeAuthTokens(response);
      
      // Update the cookie with new access token
      if (typeof document !== 'undefined') {
        const expires = new Date(Date.now() + response.expiresIn * 1000).toUTCString();
        document.cookie = `tc-auth-token=${response.accessToken}; path=/; expires=${expires}; SameSite=Lax`;
      }
      
      return true;
    } catch (error) {
      // Don't clear auth data on network errors - user might just be offline
      if (isNetworkError(error)) {
        // Return true to allow request to proceed with existing token
        // The server will return 401 if the token is actually expired
        return true;
      }
      // Only clear auth data on actual auth failures
      clearAuthData();
      return false;
    } finally {
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
}

/**
 * Make an authenticated fetch request
 * Automatically includes Authorization header and handles token refresh
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Ensure we have a valid token
  let hasValidToken: boolean;
  try {
    hasValidToken = await ensureValidToken();
  } catch (error) {
    if (isNetworkError(error)) {
      throw new NetworkError('Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
  
  if (!hasValidToken) {
    throw new AuthError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
  }
  
  const accessToken = getAccessToken();
  
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    if (isNetworkError(error)) {
      throw new NetworkError('Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
  
  // If we get a 401, try refreshing once
  if (response.status === 401) {
    try {
      const refreshed = await ensureValidToken();
      if (refreshed) {
        const newToken = getAccessToken();
        headers.set('Authorization', `Bearer ${newToken}`);
        return fetch(url, { ...options, headers });
      }
    } catch (error) {
      if (isNetworkError(error)) {
        throw new NetworkError('Unable to connect to server. Please check your internet connection.');
      }
    }
    throw new AuthError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
  }
  
  return response;
}

/**
 * Helper to build API URLs
 */
export function apiUrl(path: string): string {
  return `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
