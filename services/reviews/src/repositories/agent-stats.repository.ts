/**
 * Agent Stats Repository
 * 
 * Data access layer for agent trust statistics.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { databaseConfig } from '../config/env';
import type { AgentStats, TrustLevel, AgentBadge } from '@tripcomposer/contracts';

// =============================================================================
// DATABASE CLIENT
// =============================================================================

let supabaseClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      databaseConfig.supabaseUrl,
      databaseConfig.supabaseServiceRoleKey
    );
  }
  return supabaseClient;
}

// =============================================================================
// TABLE NAME
// =============================================================================

const TABLE_NAME = 'agent_stats';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface AgentStatsRow {
  agent_id: string;
  total_proposals_submitted: number;
  total_bookings_completed: number;
  total_bookings_cancelled: number;
  average_rating: number | null;
  rating_count: number;
  response_time_p50: number | null;
  response_time_p90: number | null;
  platform_violation_count: number;
  trust_level: string;
  badges: string[];
  identity_verified: boolean;
  bank_verified: boolean;
  platform_protection_score: number;
  platform_protection_eligible: boolean;
  last_updated_at: string;
  last_recalculated_at: string;
}

// =============================================================================
// MAPPERS
// =============================================================================

function mapRowToStats(row: AgentStatsRow): AgentStats {
  return {
    agentId: row.agent_id,
    totalProposalsSubmitted: row.total_proposals_submitted,
    totalBookingsCompleted: row.total_bookings_completed,
    totalBookingsCancelled: row.total_bookings_cancelled,
    averageRating: row.average_rating,
    ratingCount: row.rating_count,
    responseTimeP50: row.response_time_p50,
    responseTimeP90: row.response_time_p90,
    platformViolationCount: row.platform_violation_count,
    trustLevel: row.trust_level as TrustLevel,
    badges: row.badges as AgentBadge[],
    identityVerified: row.identity_verified,
    bankVerified: row.bank_verified,
    platformProtectionScore: row.platform_protection_score,
    platformProtectionEligible: row.platform_protection_eligible,
    lastUpdatedAt: new Date(row.last_updated_at),
    lastRecalculatedAt: new Date(row.last_recalculated_at),
  };
}

function mapStatsToRow(stats: AgentStats): Omit<AgentStatsRow, 'last_updated_at' | 'last_recalculated_at'> & {
  last_updated_at?: string;
  last_recalculated_at?: string;
} {
  return {
    agent_id: stats.agentId,
    total_proposals_submitted: stats.totalProposalsSubmitted,
    total_bookings_completed: stats.totalBookingsCompleted,
    total_bookings_cancelled: stats.totalBookingsCancelled,
    average_rating: stats.averageRating,
    rating_count: stats.ratingCount,
    response_time_p50: stats.responseTimeP50,
    response_time_p90: stats.responseTimeP90,
    platform_violation_count: stats.platformViolationCount,
    trust_level: stats.trustLevel,
    badges: stats.badges as string[],
    identity_verified: stats.identityVerified,
    bank_verified: stats.bankVerified,
    platform_protection_score: stats.platformProtectionScore,
    platform_protection_eligible: stats.platformProtectionEligible,
  };
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export const agentStatsRepository = {
  /**
   * Find stats by agent ID.
   */
  async findById(agentId: string): Promise<AgentStats | null> {
    const client = getClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('[AgentStatsRepository] FindById error:', error);
      throw new Error(`Failed to find agent stats: ${error.message}`);
    }

    return data ? mapRowToStats(data as AgentStatsRow) : null;
  },

  /**
   * Create new agent stats.
   */
  async create(stats: AgentStats): Promise<AgentStats> {
    const client = getClient();
    const row = {
      ...mapStatsToRow(stats),
      last_updated_at: new Date().toISOString(),
      last_recalculated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from(TABLE_NAME)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[AgentStatsRepository] Create error:', error);
      throw new Error(`Failed to create agent stats: ${error.message}`);
    }

    return mapRowToStats(data as AgentStatsRow);
  },

  /**
   * Update agent stats.
   */
  async update(stats: AgentStats): Promise<AgentStats> {
    const client = getClient();
    const row = {
      ...mapStatsToRow(stats),
      last_updated_at: new Date().toISOString(),
      last_recalculated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from(TABLE_NAME)
      .upsert(row)
      .select()
      .single();

    if (error) {
      console.error('[AgentStatsRepository] Update error:', error);
      throw new Error(`Failed to update agent stats: ${error.message}`);
    }

    return mapRowToStats(data as AgentStatsRow);
  },

  /**
   * Increment violation count.
   */
  async incrementViolationCount(agentId: string): Promise<void> {
    const client = getClient();

    const { error } = await client.rpc('increment_agent_violation_count', {
      p_agent_id: agentId,
    });

    if (error) {
      // Fallback to manual update if RPC doesn't exist
      const current = await this.findById(agentId);
      if (current) {
        await client
          .from(TABLE_NAME)
          .update({
            platform_violation_count: current.platformViolationCount + 1,
            last_updated_at: new Date().toISOString(),
          })
          .eq('agent_id', agentId);
      }
    }
  },

  /**
   * Increment completed bookings count.
   */
  async incrementCompletedBookings(agentId: string): Promise<void> {
    const client = getClient();

    const current = await this.findById(agentId);
    if (current) {
      await client
        .from(TABLE_NAME)
        .update({
          total_bookings_completed: current.totalBookingsCompleted + 1,
          last_updated_at: new Date().toISOString(),
        })
        .eq('agent_id', agentId);
    }
  },

  /**
   * Increment cancelled bookings count.
   */
  async incrementCancelledBookings(agentId: string): Promise<void> {
    const client = getClient();

    const current = await this.findById(agentId);
    if (current) {
      await client
        .from(TABLE_NAME)
        .update({
          total_bookings_cancelled: current.totalBookingsCancelled + 1,
          last_updated_at: new Date().toISOString(),
        })
        .eq('agent_id', agentId);
    }
  },

  /**
   * Update verification status.
   */
  async updateVerificationStatus(
    agentId: string,
    identityVerified: boolean,
    bankVerified: boolean
  ): Promise<void> {
    const client = getClient();

    await client
      .from(TABLE_NAME)
      .update({
        identity_verified: identityVerified,
        bank_verified: bankVerified,
        last_updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId);
  },

  /**
   * Update response times.
   */
  async updateResponseTimes(
    agentId: string,
    p50: number,
    p90: number
  ): Promise<void> {
    const client = getClient();

    await client
      .from(TABLE_NAME)
      .update({
        response_time_p50: p50,
        response_time_p90: p90,
        last_updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId);
  },

  /**
   * Get all agents for nightly recalculation.
   */
  async findAllForRecalculation(limit: number = 100, offset: number = 0): Promise<AgentStats[]> {
    const client = getClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .order('last_recalculated_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[AgentStatsRepository] FindAllForRecalculation error:', error);
      throw new Error(`Failed to find agent stats: ${error.message}`);
    }

    return (data as AgentStatsRow[]).map(mapRowToStats);
  },
};
