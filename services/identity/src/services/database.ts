/**
 * Database client for the Identity & Access service.
 * Uses Supabase as the database backend.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE ROW TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  email_verified_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRowWithAgentProfile extends UserRow {
  agent_profiles: AgentProfileRow[] | null;
}

export interface AgentProfileRow {
  user_id: string;
  verification_status: string;
  verification_submitted_at: string | null;
  verification_completed_at: string | null;
  verification_rejected_reason: string | null;
  business_name: string | null;
  bio: string | null;
  specialties: string[];
  created_at: string;
  updated_at: string;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface VerificationDocumentRow {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  additional_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE CLIENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Singleton database client instance.
 * Using 'any' for generic param since we handle types at query level.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbClient: SupabaseClient<any> | null = null;

/**
 * Gets the database client, creating it if necessary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDbClient(): SupabaseClient<any> {
  if (!dbClient) {
    dbClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
  }
  return dbClient;
}

/**
 * Closes the database connection.
 * Call this during graceful shutdown.
 */
export async function closeDbConnection(): Promise<void> {
  if (dbClient) {
    // Supabase client doesn't have an explicit close method,
    // but we can nullify the reference for garbage collection
    dbClient = null;
  }
}
