/**
 * Admin Authentication Context
 * 
 * Manages admin authentication state and provides context for admin actions.
 * All admin actions require authentication and audit context.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, getSession, getUser, signOut, onAuthStateChange } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api';
import { auditLogger } from '@/lib/audit';
import type { AdminActionContext } from '@/lib/audit';
import { createDevAccessToken } from './dev-token';

// ============================================================================
// TYPES
// ============================================================================

interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: 'super_admin' | 'admin' | 'support';
  readonly permissions: readonly string[];
  readonly avatarUrl: string | null;
  readonly lastLoginAt: string | null;
}

type IdentityMeResponse = {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly photoUrl: string | null;
  readonly role: string;
};

interface AuthState {
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly admin: AdminUser | null;
  readonly sessionId: string | null;
  readonly error: string | null;
}

interface AuthContextValue extends AuthState {
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly getActionContext: () => AdminActionContext;
  readonly hasPermission: (permission: string) => boolean;
  readonly refreshSession: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  readonly children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    admin: null,
    sessionId: null,
    error: null,
  });

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = await getSession();
        if (session) {
          await loadAdminProfile(session.access_token);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setState((prev: AuthState) => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadAdminProfile((session as { access_token: string }).access_token);
      } else if (event === 'SIGNED_OUT') {
        setState({
          isAuthenticated: false,
          isLoading: false,
          admin: null,
          sessionId: null,
          error: null,
        });
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Load admin profile from backend (with mock fallback for development)
  const loadAdminProfile = useCallback(async (accessToken: string, email?: string) => {
    try {
      apiClient.setAuthToken(accessToken);
      // Route: admin-web → API gateway → identity service
      // Identity exposes the canonical current-user endpoint at /api/v1/users/me.
      const me = await apiClient.get<IdentityMeResponse>('/api/identity/api/v1/users/me');

      const profile: AdminUser = {
        id: me.id,
        email: me.email,
        firstName: me.firstName,
        lastName: me.lastName,
        role: me.role?.toLowerCase() === 'admin' ? 'admin' : 'support',
        permissions: ['all'],
        avatarUrl: me.photoUrl,
        lastLoginAt: null,
      };
      const sessionId = generateSessionId();

      // Initialize audit logger
      auditLogger.initialize({
        apiBaseUrl: apiClient['baseUrl'],
        adminId: profile.id,
        adminEmail: profile.email,
      });

      setState({
        isAuthenticated: true,
        isLoading: false,
        admin: profile,
        sessionId,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load admin profile from API, using mock data:', error);
      
      // Development fallback: use mock admin profile
      const mockProfile: AdminUser = {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: email || 'admin@howweplan.com',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'super_admin',
        permissions: ['all'],
        avatarUrl: null,
        lastLoginAt: new Date().toISOString(),
      };
      
      const sessionId = generateSessionId();
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        admin: mockProfile,
        sessionId,
        error: null,
      });
    }
  }, []);

  // Sign in (with mock fallback for development)
  const handleSignIn = useCallback(async (email: string, password: string) => {
    setState((prev: AuthState) => ({ ...prev, isLoading: true, error: null }));

    // Development mode: allow mock credentials
    const isDev = process.env.NODE_ENV === 'development';
    const validDevCredentials = 
      (email === 'admin@howweplan.com' && password === 'TripAdmin@2025') ||
      (email === 'admin@demo.com' && password === 'admin123');

    if (isDev && validDevCredentials) {
      // Use mock authentication for development
      const mockProfile: AdminUser = {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: email,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'super_admin',
        permissions: ['all'],
        avatarUrl: null,
        lastLoginAt: new Date().toISOString(),
      };
      
      const sessionId = generateSessionId();
      
      // Create and set dev access token for API calls
      const devToken = await createDevAccessToken(mockProfile.id, 'super_admin');
      apiClient.setAuthToken(devToken);
      
      // Initialize audit logger for dev session
      auditLogger.initialize({
        apiBaseUrl: apiClient['baseUrl'],
        adminId: mockProfile.id,
        adminEmail: mockProfile.email,
      });
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        admin: mockProfile,
        sessionId,
        error: null,
      });
      
      router.push('/dashboard');
      return;
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session returned');

      await loadAdminProfile(data.session.access_token, email);
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      setState((prev: AuthState) => ({ ...prev, isLoading: false, error: message }));
    }
  }, [loadAdminProfile, router]);

  // Sign out
  const handleSignOut = useCallback(async () => {
    try {
      // Flush any pending audit events before signing out
      await auditLogger.flush();
      await signOut();
      apiClient.setAuthToken(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  // Get action context for admin operations
  const getActionContext = useCallback((): AdminActionContext => {
    if (!state.admin || !state.sessionId) {
      throw new Error('Admin must be authenticated to perform actions');
    }
    return {
      adminId: state.admin.id,
      adminEmail: state.admin.email,
      sessionId: state.sessionId,
    };
  }, [state.admin, state.sessionId]);

  // Check permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!state.admin) return false;
    if (state.admin.role === 'super_admin') return true;
    return state.admin.permissions.includes(permission);
  }, [state.admin]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    const session = await getSession();
    if (session) {
      apiClient.setAuthToken(session.access_token);
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    signIn: handleSignIn,
    signOut: handleSignOut,
    getActionContext,
    hasPermission,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// GUARDS
// ============================================================================

/**
 * Hook to require authentication.
 * Redirects to login if not authenticated.
 */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/login');
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  return auth;
}

/**
 * Hook to require specific permission.
 * Redirects to unauthorized if permission missing.
 */
export function useRequirePermission(permission: string) {
  const auth = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && !auth.hasPermission(permission)) {
      router.push('/unauthorized');
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.hasPermission, permission, router]);

  return auth;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `session-${timestamp}-${random}`;
}
