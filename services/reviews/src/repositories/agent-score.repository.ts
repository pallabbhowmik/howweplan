/**
 * Agent Score Repository
 * 
 * Data access layer for agent scores and ratings.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { databaseConfig } from '../config/env';
import { 
  AgentScore, 
  ScoreBreakdown,
  ReliabilityTier,
  ScoreVisibility,
  ScoreHistoryEntry,
  PublicAgentRating,
} from '../models';

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
// TYPE DEFINITIONS
// =============================================================================

interface AgentScoreRow {
  id: string;
  agent_id: string;
  internal_score: number;
  public_score: number;
  reliability_tier: string;
  breakdown: Record<string, unknown>;
  gaming_risk_score: number;
  is_under_investigation: boolean;
  investigation_reason: string | null;
  last_review_at: string | null;
  score_decay_applied: number;
  visibility: string;
  visibility_reason: string | null;
  total_bookings: number;
  total_reviews: number;
  positive_reviews: number;
  neutral_reviews: number;
  negative_reviews: number;
  calculated_at: string;
  created_at: string;
  updated_at: string;
}

interface ScoreHistoryRow {
  id: string;
  agent_id: string;
  internal_score: number;
  public_score: number;
  reliability_tier: string;
  breakdown: Record<string, unknown>;
  triggered_by: string;
  calculated_at: string;
}

// =============================================================================
// MAPPERS
// =============================================================================

function mapRowToAgentScore(row: AgentScoreRow): AgentScore {
  return {
    id: row.id,
    agentId: row.agent_id,
    internalScore: row.internal_score,
    publicScore: row.public_score,
    reliabilityTier: row.reliability_tier as ReliabilityTier,
    breakdown: row.breakdown as ScoreBreakdown,
    gamingRiskScore: row.gaming_risk_score,
    isUnderInvestigation: row.is_under_investigation,
    investigationReason: row.investigation_reason,
    lastReviewAt: row.last_review_at ? new Date(row.last_review_at) : null,
    scoreDecayApplied: row.score_decay_applied,
    visibility: row.visibility as ScoreVisibility,
    visibilityReason: row.visibility_reason,
    totalBookings: row.total_bookings,
    totalReviews: row.total_reviews,
    positiveReviews: row.positive_reviews,
    neutralReviews: row.neutral_reviews,
    negativeReviews: row.negative_reviews,
    calculatedAt: new Date(row.calculated_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapAgentScoreToRow(score: Partial<AgentScore>): Partial<AgentScoreRow> {
  const row: Partial<AgentScoreRow> = {};
  
  if (score.id !== undefined) row.id = score.id;
  if (score.agentId !== undefined) row.agent_id = score.agentId;
  if (score.internalScore !== undefined) row.internal_score = score.internalScore;
  if (score.publicScore !== undefined) row.public_score = score.publicScore;
  if (score.reliabilityTier !== undefined) row.reliability_tier = score.reliabilityTier;
  if (score.breakdown !== undefined) row.breakdown = score.breakdown as Record<string, unknown>;
  if (score.gamingRiskScore !== undefined) row.gaming_risk_score = score.gamingRiskScore;
  if (score.isUnderInvestigation !== undefined) row.is_under_investigation = score.isUnderInvestigation;
  if (score.investigationReason !== undefined) row.investigation_reason = score.investigationReason;
  if (score.lastReviewAt !== undefined) row.last_review_at = score.lastReviewAt?.toISOString() ?? null;
  if (score.scoreDecayApplied !== undefined) row.score_decay_applied = score.scoreDecayApplied;
  if (score.visibility !== undefined) row.visibility = score.visibility;
  if (score.visibilityReason !== undefined) row.visibility_reason = score.visibilityReason;
  if (score.totalBookings !== undefined) row.total_bookings = score.totalBookings;
  if (score.totalReviews !== undefined) row.total_reviews = score.totalReviews;
  if (score.positiveReviews !== undefined) row.positive_reviews = score.positiveReviews;
  if (score.neutralReviews !== undefined) row.neutral_reviews = score.neutralReviews;
  if (score.negativeReviews !== undefined) row.negative_reviews = score.negativeReviews;
  if (score.calculatedAt !== undefined) row.calculated_at = score.calculatedAt.toISOString();
  
  return row;
}

function mapRowToScoreHistory(row: ScoreHistoryRow): ScoreHistoryEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    internalScore: row.internal_score,
    publicScore: row.public_score,
    reliabilityTier: row.reliability_tier as ReliabilityTier,
    breakdown: row.breakdown as ScoreBreakdown,
    triggeredBy: row.triggered_by,
    calculatedAt: new Date(row.calculated_at),
  };
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export const agentScoreRepository = {
  /**
   * Find agent score by agent ID
   */
  async findByAgentId(agentId: string): Promise<AgentScore | null> {
    const client = getClient();
    
    const { data, error } = await client
      .from('agent_scores')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (error || !data) return null;
    return mapRowToAgentScore(data as AgentScoreRow);
  },

  /**
   * Create a new agent score
   */
  async create(score: AgentScore): Promise<AgentScore> {
    const client = getClient();
    const row = mapAgentScoreToRow(score);
    
    const { data, error } = await client
      .from('agent_scores')
      .insert({
        ...row,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create agent score: ${error.message}`);
    }

    return mapRowToAgentScore(data as AgentScoreRow);
  },

  /**
   * Update agent score
   */
  async update(agentId: string, updates: Partial<AgentScore>): Promise<AgentScore> {
    const client = getClient();
    const row = mapAgentScoreToRow(updates);
    
    const { data, error } = await client
      .from('agent_scores')
      .update({
        ...row,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update agent score: ${error.message}`);
    }

    return mapRowToAgentScore(data as AgentScoreRow);
  },

  /**
   * Upsert agent score (create or update)
   */
  async upsert(score: AgentScore): Promise<AgentScore> {
    const client = getClient();
    const row = mapAgentScoreToRow(score);
    
    const { data, error } = await client
      .from('agent_scores')
      .upsert({
        ...row,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'agent_id',
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to upsert agent score: ${error.message}`);
    }

    return mapRowToAgentScore(data as AgentScoreRow);
  },

  /**
   * Add score history entry
   */
  async addHistoryEntry(entry: ScoreHistoryEntry): Promise<ScoreHistoryEntry> {
    const client = getClient();
    
    const { data, error } = await client
      .from('score_history')
      .insert({
        id: entry.id,
        agent_id: entry.agentId,
        internal_score: entry.internalScore,
        public_score: entry.publicScore,
        reliability_tier: entry.reliabilityTier,
        breakdown: entry.breakdown as Record<string, unknown>,
        triggered_by: entry.triggeredBy,
        calculated_at: entry.calculatedAt.toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to add score history: ${error.message}`);
    }

    return mapRowToScoreHistory(data as ScoreHistoryRow);
  },

  /**
   * Get score history for an agent
   */
  async getHistory(
    agentId: string,
    options: { fromDate?: Date; toDate?: Date; limit?: number }
  ): Promise<ScoreHistoryEntry[]> {
    const client = getClient();
    
    let query = client
      .from('score_history')
      .select('*')
      .eq('agent_id', agentId)
      .order('calculated_at', { ascending: false });
    
    if (options.fromDate) {
      query = query.gte('calculated_at', options.fromDate.toISOString());
    }
    if (options.toDate) {
      query = query.lte('calculated_at', options.toDate.toISOString());
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch score history: ${error.message}`);
    }

    return (data as ScoreHistoryRow[] ?? []).map(mapRowToScoreHistory);
  },

  /**
   * Get public ratings for multiple agents
   */
  async getPublicRatings(agentIds: string[]): Promise<Map<string, PublicAgentRating>> {
    const client = getClient();
    
    const { data, error } = await client
      .from('agent_scores')
      .select('*')
      .in('agent_id', agentIds)
      .eq('visibility', ScoreVisibility.PUBLIC);
    
    if (error) {
      throw new Error(`Failed to fetch public ratings: ${error.message}`);
    }

    const ratings = new Map<string, PublicAgentRating>();
    
    for (const row of (data as AgentScoreRow[] ?? [])) {
      const score = mapRowToAgentScore(row);
      ratings.set(score.agentId, {
        agentId: score.agentId,
        overallRating: score.publicScore,
        reviewCount: score.totalReviews,
        reliabilityTier: score.reliabilityTier,
        communicationRating: null,  // Populated from category averages
        accuracyRating: null,
        valueRating: null,
        responsivenessRating: null,
        averageResponseTime: null,
        lastUpdatedAt: score.updatedAt,
      });
    }

    return ratings;
  },

  /**
   * Get top agents by score
   */
  async getTopAgents(options: {
    tier?: ReliabilityTier;
    limit?: number;
  }): Promise<AgentScore[]> {
    const client = getClient();
    
    let query = client
      .from('agent_scores')
      .select('*')
      .eq('visibility', ScoreVisibility.PUBLIC)
      .order('public_score', { ascending: false });
    
    if (options.tier) {
      query = query.eq('reliability_tier', options.tier);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch top agents: ${error.message}`);
    }

    return (data as AgentScoreRow[] ?? []).map(mapRowToAgentScore);
  },

  /**
   * Find agents with score decay needed
   */
  async findAgentsNeedingDecay(decayThresholdDays: number): Promise<AgentScore[]> {
    const client = getClient();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - decayThresholdDays);
    
    const { data, error } = await client
      .from('agent_scores')
      .select('*')
      .or(`last_review_at.lt.${thresholdDate.toISOString()},last_review_at.is.null`)
      .gt('internal_score', 0);
    
    if (error) {
      throw new Error(`Failed to fetch agents needing decay: ${error.message}`);
    }

    return (data as AgentScoreRow[] ?? []).map(mapRowToAgentScore);
  },

  /**
   * Find agents under investigation
   */
  async findUnderInvestigation(): Promise<AgentScore[]> {
    const client = getClient();
    
    const { data, error } = await client
      .from('agent_scores')
      .select('*')
      .eq('is_under_investigation', true);
    
    if (error) {
      throw new Error(`Failed to fetch agents under investigation: ${error.message}`);
    }

    return (data as AgentScoreRow[] ?? []).map(mapRowToAgentScore);
  },

  /**
   * Update visibility for an agent
   */
  async updateVisibility(
    agentId: string,
    visibility: ScoreVisibility,
    reason: string
  ): Promise<AgentScore> {
    const client = getClient();
    
    const { data, error } = await client
      .from('agent_scores')
      .update({
        visibility,
        visibility_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update visibility: ${error.message}`);
    }

    return mapRowToAgentScore(data as AgentScoreRow);
  },

  /**
   * Start investigation on an agent
   */
  async startInvestigation(agentId: string, reason: string): Promise<AgentScore> {
    const client = getClient();
    
    const { data, error } = await client
      .from('agent_scores')
      .update({
        is_under_investigation: true,
        investigation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to start investigation: ${error.message}`);
    }

    return mapRowToAgentScore(data as AgentScoreRow);
  },

  /**
   * End investigation on an agent
   */
  async endInvestigation(agentId: string): Promise<AgentScore> {
    const client = getClient();
    
    const { data, error } = await client
      .from('agent_scores')
      .update({
        is_under_investigation: false,
        investigation_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to end investigation: ${error.message}`);
    }

    return mapRowToAgentScore(data as AgentScoreRow);
  },
};

export type AgentScoreRepository = typeof agentScoreRepository;
