/**
 * Messaging Service - Supabase (service role) client
 *
 * Backend-only DB access. Frontends must never query business tables directly.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

let serviceClient: SupabaseClient | null = null;

export function getServiceSupabaseClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  // Validate configuration
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('[Supabase] CRITICAL: SUPABASE_URL is not configured or using placeholder!');
    console.error('[Supabase] Current SUPABASE_URL:', supabaseUrl);
  }

  if (!serviceRoleKey || serviceRoleKey === 'dev-service-role-key-20-chars') {
    console.error('[Supabase] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not configured or using default!');
  }

  console.log('[Supabase] Initializing client with URL:', supabaseUrl?.substring(0, 40) + '...');

  serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceClient;
}
