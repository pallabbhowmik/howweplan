/**
 * Supabase Client Configuration
 * 
 * Client-side Supabase instance using only public/anon key.
 * SECURITY: No service role key is allowed in frontend.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// ============================================================================
// CLIENT CREATION
// ============================================================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client instance (singleton).
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return supabaseClient;
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Get the current session.
 */
export async function getSession() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Get the current user.
 */
export async function getUser() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  const client = getSupabaseClient();
  return client.auth.onAuthStateChange(callback);
}
