'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { clearAuthData, getStoredUser, getAccessToken, logout } from '@/lib/api/auth';

const STORAGE_KEY = 'tc_demo_user_id';

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
};

const UserSessionContext = createContext<UserSessionValue | null>(null);

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUserIdState(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();

        let effectiveUserId: string;
        if (userId) {
          effectiveUserId = userId;
        } else {
          // Check if we have a stored user from auth
          const storedUser = getStoredUser();
          if (storedUser?.id) {
            effectiveUserId = storedUser.id;
            setUserId(effectiveUserId);
          } else {
            // Try to find a user that has conversations first (better demo experience)
            const { data: convUser, error: convErr } = await supabase
              .from('conversations')
              .select('user_id')
              .limit(1)
              .maybeSingle();
            
            if (!convErr && convUser?.user_id) {
              effectiveUserId = convUser.user_id;
            } else {
              // Fallback: pick first user by created_at
              const { data, error: e } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'user')
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();

              if (e) throw e;
              if (!data?.id) throw new Error('No demo user found in database');
              effectiveUserId = data.id;
            }
            setUserId(effectiveUserId);
          }
        }

        const { data: u, error: uErr } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, avatar_url')
          .eq('id', effectiveUserId)
          .maybeSingle();

        if (uErr) throw uErr;
        if (!u) throw new Error('User not found');

        if (cancelled) return;

        setUser({
          userId: u.id,
          email: u.email,
          firstName: u.first_name,
          lastName: u.last_name,
          avatarUrl: u.avatar_url ?? null,
        });
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load user');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const value = useMemo<UserSessionValue>(
    () => ({
      user,
      setUserId,
      signOut,
      loading,
      error,
    }),
    [user, signOut, loading, error]
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
