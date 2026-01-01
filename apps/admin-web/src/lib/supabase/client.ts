/**
 * Supabase Client Configuration
 * 
 * Client-side Supabase instance using only public/anon key.
 * SECURITY: No service role key is allowed in frontend.
 * 
 * ============================================================================
 * USAGE POLICY - AUTHENTICATION ONLY
 * ============================================================================
 * This client should ONLY be used for:
 * 
 * ✅ ALLOWED:
 *   1. Authentication (supabase.auth.*)
 *   2. Session management
 * 
 * ❌ FORBIDDEN:
 *   - Admin operations → Use backend admin APIs
 *   - User management → Use Identity Service API
 *   - Any database queries → Use backend services
 *   - Audit queries → Use Audit Service API
 * 
 * All admin operations must go through authenticated backend endpoints.
 * See docs/FRONTEND-DATA-ACCESS-POLICY.md
 * ============================================================================
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
