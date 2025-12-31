'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const fallback = 'http://localhost:54321';

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
