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

  serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceClient;
}
