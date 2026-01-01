/**
 * Authentication API Client
 * 
 * Handles login, registration, and token management
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
  const response = await fetch(`${API_BASE_URL}/api/identity/auth/login`, {
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
  const response = await fetch(`${API_BASE_URL}/api/identity/auth/register`, {
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
  const response = await fetch(`${API_BASE_URL}/api/identity/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken: token }),
  });

  return handleResponse<AuthResponse>(response);
}

/**
 * Logout and invalidate tokens
 */
export async function logout(accessToken: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/identity/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });
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
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
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
