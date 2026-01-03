'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { identityApi } from '@/lib/api/client';
import { clearAuthData, getStoredUser, getAccessToken, logout } from '@/lib/api/auth';

const STORAGE_KEY = 'tc_demo_user_id';
const AUTH_USER_KEY = 'tc_user';

export type UserIdentity = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

type UserSessionValue = {
  user: UserIdentity | null;
  setUserId: (userId: string) => void;
  signOut: () => void;
  loading: boolean;
  error: string | null;
  refreshSession: () => void;
};

const UserSessionContext = createContext<UserSessionValue | null>(null);

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to manually trigger session refresh (called after login)
  const refreshSession = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const setUserId = (nextUserId: string) => {
    setUserIdState(nextUserId);
    try {
      localStorage.setItem(STORAGE_KEY, nextUserId);
    } catch {
      // ignore
    }
  };

  const signOut = useCallback(async () => {
    // Call backend to invalidate refresh token
    const accessToken = getAccessToken();
    if (accessToken) {
      await logout(accessToken);
    }
    
    // Clear demo user
    setUserIdState(null);
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    // Clear auth tokens
    clearAuthData();
    // Clear auth cookie
    document.cookie = 'tc-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    // Redirect to landing page
    window.location.href = '/';
  }, []);

  // Listen for storage changes (e.g., after login in same tab or another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_USER_KEY || e.key === STORAGE_KEY) {
        // Trigger session refresh when auth data changes
        setRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Primary source after login
        const storedUser = getStoredUser();
        const accessToken = getAccessToken();
        
        // Then check legacy demo storage or current state
        let storedDemoId: string | null = null;
        try {
          storedDemoId = localStorage.getItem(STORAGE_KEY);
        } catch {
          // ignore
        }

        let effectiveUserId: string;
        if (storedUser?.id) {
          // Prefer auth stored user
          effectiveUserId = storedUser.id;
        } else if (userId) {
          // Use current state if set
          effectiveUserId = userId;
        } else if (storedDemoId) {
          // Fall back to demo storage
          effectiveUserId = storedDemoId;
        } else {
          // No authenticated user - stop loading and wait for login
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }
        
        // Sync the user ID to state and storage
        if (effectiveUserId !== userId) {
          setUserIdState(effectiveUserId);
          try {
            localStorage.setItem(STORAGE_KEY, effectiveUserId);
          } catch {
            // ignore
          }
        }

        // Optimistically hydrate from stored auth user to avoid UI flash.
        if (storedUser?.id && !cancelled) {
          setUser({
            userId: storedUser.id,
            email: storedUser.email,
            firstName: storedUser.firstName,
            lastName: storedUser.lastName,
            avatarUrl: null,
          });
        }

        // Validate/refresh profile via Identity Service when we have a token.
        // This is the supported architecture path (no direct DB/Supabase profile queries).
        if (accessToken) {
          const meResponse: any = await identityApi.getMe();
          const me = meResponse?.data ?? meResponse;
          if (!me?.id) {
            throw new Error('Failed to load user');
          }

          // Keep stored user in sync for future reloads.
          try {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
              id: me.id,
              email: me.email,
              firstName: me.firstName,
              lastName: me.lastName,
              role: me.role,
              status: me.status,
            }));
          } catch {
            // ignore
          }

          if (cancelled) return;
          setUser({
            userId: me.id,
            email: me.email,
            firstName: me.firstName,
            lastName: me.lastName,
            avatarUrl: me.photoUrl ?? null,
          });
        }
      } catch (e: unknown) {
        console.error('[session] Failed to load user:', e);
        
        // For authentication/not found errors, clear the stale session
        const errorMessage = e instanceof Error ? e.message : String(e);
        const isAuthError = 
          errorMessage.toLowerCase().includes('not found') ||
          errorMessage.toLowerCase().includes('unauthorized') ||
          errorMessage.toLowerCase().includes('forbidden') ||
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('expired');
        
        if (isAuthError) {
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
          } catch {
            // ignore
          }
          clearAuthData();
          if (!cancelled) {
            setUserIdState(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load user');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId, refreshTrigger]); // Re-run when userId changes or when session refresh is triggered

  const value = useMemo<UserSessionValue>(
    () => ({
      user,
      setUserId,
      signOut,
      loading,
      error,
      refreshSession,
    }),
    [user, signOut, loading, error, refreshSession]
  );

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export function useUserSession(): UserSessionValue {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    throw new Error('useUserSession must be used within UserSessionProvider');
  }
  return ctx;
}
