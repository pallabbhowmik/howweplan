'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT - USAGE POLICY
// ============================================================================
// This client should ONLY be used for:
// 
// ✅ ALLOWED:
//   1. Authentication (supabase.auth.*)
//   2. Session management
//   3. Public read-only reference data (destinations, countries)
// 
// ❌ FORBIDDEN:
//   - Agent profile queries → Use Identity Service API
//   - Match operations → Use Matching Service API
//   - Message operations → Use Messaging Service API
//   - Booking queries → Use Booking-Payments Service API
//   - Any writes to database → Use backend services
// 
// See docs/FRONTEND-DATA-ACCESS-POLICY.md for complete policy.
// ============================================================================

let client: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const fallback = 'http://localhost:54321';

  if (!configured) return fallback;

  // Guard against common misconfig: pointing Supabase URL at a backend microservice port.
  // That causes browser CORS failures because those services aren't the Supabase gateway.
  if (/localhost:(301[0-9])\b/.test(configured)) {
    if (typeof window !== 'undefined') {
      console.warn(
        `[agent-web] Ignoring NEXT_PUBLIC_SUPABASE_URL=${configured} (looks like a microservice). Using ${fallback} instead.`
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
