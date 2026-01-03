'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT - AUTHENTICATION ONLY
// ============================================================================
// This client should ONLY be used for:
// 
// ✅ ALLOWED:
//   1. Authentication (supabase.auth.*)
//      - signInWithPassword, signUp, signOut
//      - getSession, getUser, onAuthStateChange
//   2. Session management
//   3. Password reset and email verification
// 
// ❌ FORBIDDEN - ALL data operations must go through Gateway API:
//   - User profile CRUD → Use Gateway /api/identity/*
//   - Travel requests CRUD → Use Gateway /api/requests/*
//   - Bookings queries → Use Gateway /api/booking-payments/*
//   - Messages CRUD → Use Gateway /api/messaging/*
//   - Notifications → Use Gateway /api/notifications/*
//   - Any database queries → Use Gateway API
// 
// See docs/FRONTEND-DATA-ACCESS-POLICY.md for complete policy.
// ============================================================================

let client: SupabaseClient | null = null;

function isProduction(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'production' ||
    (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
  );
}

function getSupabaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const fallback = 'http://localhost:54321';

  // In production, require proper Supabase URL
  if (isProduction()) {
    if (!configured || configured.includes('localhost')) {
      console.error(
        '[user-web] CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not configured for production! ' +
        'Please set this environment variable in Vercel.'
      );
      // Return a placeholder that won't work but won't crash on load
      return 'https://supabase-not-configured.invalid';
    }
    return configured;
  }

  // Development fallback logic
  if (!configured) return fallback;

  if (/localhost:(301[0-9])\b/.test(configured)) {
    if (typeof window !== 'undefined') {
      console.warn(
        `[user-web] Ignoring NEXT_PUBLIC_SUPABASE_URL=${configured} (looks like a microservice). Using ${fallback} instead.`
      );
    }
    return fallback;
  }

  return configured;
}

function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    // fallback dev JWT signed with super-secret-jwt-token-with-at-least-32-characters-long
    // role=tripcomposer, exp=2030-01-01
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidHJpcGNvbXBvc2VyIiwiaXNzIjoidHJpcGNvbXBvc2VyLWRldiIsImV4cCI6MTg5Mzc2OTIwMH0.sJd6wIzqLf9NQ1on2NdEp7AP5DI9L2dlnCSpNQIhi1o'
  );
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

/**
 * Get the current session access token for API calls
 * Returns null if no session exists
 */
export async function getSessionToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
