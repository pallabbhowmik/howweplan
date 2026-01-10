/**
 * Authentication API Client (Agent Web)
 *
 * Uses the Identity Service (via API Gateway) for login/refresh/logout.
 *
 * NOTE: Supabase JS in agent-web is auth-only per policy, but agent-web
 * currently uses the Identity Service tokens for API Gateway auth.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  // Safe local fallback for development only
  (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');

if (!API_BASE_URL) {
  throw new Error(
    'Missing NEXT_PUBLIC_API_BASE_URL (required). ' +
      'Set it to your API Gateway base URL (e.g. https://<gateway-host> or http://localhost:3001).' 
  );
}

// Normalize: remove trailing slash and /api suffix if present
const normalizedBaseUrl = API_BASE_URL
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
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
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data.error?.message || data.message || 'An error occurred';
    const errorCode = data.error?.code || 'UNKNOWN_ERROR';
    throw new AuthError(errorMessage, errorCode, response.status);
  }

  return data.data || data;
}

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

export async function logout(accessToken: string): Promise<void> {
  try {
    await fetch(`${normalizedBaseUrl}/api/identity/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Ignore errors during logout - tokens will expire anyway
  }
}

export interface RegisterAgentParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  agencyName?: string;
}

export async function registerAgent(params: RegisterAgentParams): Promise<AuthResponse> {
  const response = await fetch(`${normalizedBaseUrl}/api/identity/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...params,
      role: 'agent', // Always register as agent in agent-web
    }),
  });

  return handleResponse<AuthResponse>(response);
}

const ACCESS_TOKEN_KEY = 'tc_access_token';
const REFRESH_TOKEN_KEY = 'tc_refresh_token';
const USER_KEY = 'tc_user';

export function storeAuthTokens(response: AuthResponse): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_KEY);
    // Guard against 'undefined' string or invalid JSON
    if (!stored || stored === 'undefined' || stored === 'null') return null;
    return JSON.parse(stored) as AuthUser;
  } catch {
    // Corrupted data - clear it
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return true;
    const payload = JSON.parse(atob(parts[1]));
    const expiresAt = payload.exp * 1000;
    return Date.now() >= expiresAt - 60000;
  } catch {
    return true;
  }
}

export async function ensureValidToken(): Promise<boolean> {
  if (!isTokenExpired()) return true;

  const storedRefreshToken = getRefreshToken();
  if (!storedRefreshToken) return false;

  try {
    const response = await refreshToken(storedRefreshToken);
    storeAuthTokens(response);

    if (typeof document !== 'undefined') {
      const expires = new Date(Date.now() + response.expiresIn * 1000).toUTCString();
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `tc-auth-token=${response.accessToken}; path=/; expires=${expires}; SameSite=Lax${secure}`;
    }

    return true;
  } catch {
    clearAuthData();
    return false;
  }
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const ok = await ensureValidToken();
  if (!ok) {
    throw new AuthError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
  }

  const accessToken = getAccessToken();
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const refreshed = await ensureValidToken();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) headers.set('Authorization', `Bearer ${newToken}`);
      return fetch(url, { ...options, headers });
    }
    throw new AuthError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
  }

  return response;
}

export function apiUrl(path: string): string {
  return `${normalizedBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
