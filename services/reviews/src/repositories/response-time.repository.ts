/**
 * Response Time Repository
 * 
 * Data access layer for agent response time tracking.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { databaseConfig } from '../config/env';
import type {
  ResponseEvent,
  AgentResponseMetrics,
  ResponseType,
  ResponseTimeLabel,
  ResponseTimeTrend,
} from '@tripcomposer/contracts';

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
// TABLE NAMES
// =============================================================================

const EVENTS_TABLE = 'agent_response_events';
const METRICS_TABLE = 'agent_response_metrics';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ResponseEventRow {
  id: string;
  agent_id: string;
  request_id: string;
  request_received_at: string;
  first_response_at: string | null;
  response_time_minutes: number | null;
  response_type: string | null;
  was_within_business_hours: boolean;
  day_of_week: number;
  created_at: string;
}

interface ResponseMetricsRow {
  agent_id: string;
  total_requests_received: number;
  total_responses: number;
  total_proposals: number;
  total_declined: number;
  total_expired: number;
  response_rate: number;
  response_time_p50: number | null;
  response_time_p75: number | null;
  response_time_p90: number | null;
  response_time_avg: number | null;
  response_time_min: number | null;
  response_time_max: number | null;
  response_time_label: string;
  business_hours_p50: number | null;
  after_hours_p50: number | null;
  trend: string;
  trend_change_minutes: number;
  sample_size: number;
  last_response_at: string | null;
  last_recalculated_at: string;
}

// =============================================================================
// MAPPERS
// =============================================================================

function mapRowToEvent(row: ResponseEventRow): ResponseEvent {
  return {
    id: row.id,
    agentId: row.agent_id,
    requestId: row.request_id,
    requestReceivedAt: new Date(row.request_received_at),
    firstResponseAt: row.first_response_at ? new Date(row.first_response_at) : null,
    responseTimeMinutes: row.response_time_minutes,
    responseType: row.response_type as ResponseType | null,
    wasWithinBusinessHours: row.was_within_business_hours,
    dayOfWeek: row.day_of_week,
    createdAt: new Date(row.created_at),
  };
}

function mapRowToMetrics(row: ResponseMetricsRow): AgentResponseMetrics {
  return {
    agentId: row.agent_id,
    totalRequestsReceived: row.total_requests_received,
    totalResponses: row.total_responses,
    totalProposals: row.total_proposals,
    totalDeclined: row.total_declined,
    totalExpired: row.total_expired,
    responseRate: row.response_rate,
    responseTimeP50: row.response_time_p50,
    responseTimeP75: row.response_time_p75,
    responseTimeP90: row.response_time_p90,
    responseTimeAvg: row.response_time_avg,
    responseTimeMin: row.response_time_min,
    responseTimeMax: row.response_time_max,
    responseTimeLabel: row.response_time_label as ResponseTimeLabel,
    businessHoursP50: row.business_hours_p50,
    afterHoursP50: row.after_hours_p50,
    trend: row.trend as ResponseTimeTrend,
    trendChangeMinutes: row.trend_change_minutes,
    sampleSize: row.sample_size,
    lastResponseAt: row.last_response_at ? new Date(row.last_response_at) : null,
    lastRecalculatedAt: new Date(row.last_recalculated_at),
  };
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export const responseTimeRepository = {
  /**
   * Record a new request received by an agent.
   */
  async recordRequest(input: {
    agentId: string;
    requestId: string;
    requestReceivedAt: Date;
    wasWithinBusinessHours: boolean;
    dayOfWeek: number;
  }): Promise<ResponseEvent> {
    const client = getClient();

    const { data, error } = await client
      .from(EVENTS_TABLE)
      .insert({
        agent_id: input.agentId,
        request_id: input.requestId,
        request_received_at: input.requestReceivedAt.toISOString(),
        was_within_business_hours: input.wasWithinBusinessHours,
        day_of_week: input.dayOfWeek,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record request: ${error.message}`);
    }

    return mapRowToEvent(data as ResponseEventRow);
  },

  /**
   * Record a response to a request.
   */
  async recordResponse(input: {
    agentId: string;
    requestId: string;
    firstResponseAt: Date;
    responseTimeMinutes: number | null;
    responseType: ResponseType;
  }): Promise<void> {
    const client = getClient();

    const { error } = await client
      .from(EVENTS_TABLE)
      .update({
        first_response_at: input.firstResponseAt.toISOString(),
        response_time_minutes: input.responseTimeMinutes,
        response_type: input.responseType,
      })
      .eq('agent_id', input.agentId)
      .eq('request_id', input.requestId);

    if (error) {
      throw new Error(`Failed to record response: ${error.message}`);
    }
  },

  /**
   * Find an event by agent ID and request ID.
   */
  async findEvent(agentId: string, requestId: string): Promise<ResponseEvent | null> {
    const client = getClient();

    const { data, error } = await client
      .from(EVENTS_TABLE)
      .select('*')
      .eq('agent_id', agentId)
      .eq('request_id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to find event: ${error.message}`);
    }

    return data ? mapRowToEvent(data as ResponseEventRow) : null;
  },

  /**
   * Get recent events for an agent within a time window.
   */
  async getRecentEvents(agentId: string, windowDays: number): Promise<ResponseEvent[]> {
    const client = getClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);

    const { data, error } = await client
      .from(EVENTS_TABLE)
      .select('*')
      .eq('agent_id', agentId)
      .gte('request_received_at', cutoffDate.toISOString())
      .order('request_received_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get recent events: ${error.message}`);
    }

    return (data || []).map((row) => mapRowToEvent(row as ResponseEventRow));
  },

  /**
   * Get metrics for an agent.
   */
  async getMetrics(agentId: string): Promise<AgentResponseMetrics | null> {
    const client = getClient();

    const { data, error } = await client
      .from(METRICS_TABLE)
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get metrics: ${error.message}`);
    }

    return data ? mapRowToMetrics(data as ResponseMetricsRow) : null;
  },

  /**
   * Get metrics for multiple agents.
   */
  async getBatchMetrics(agentIds: string[]): Promise<AgentResponseMetrics[]> {
    if (agentIds.length === 0) {
      return [];
    }

    const client = getClient();

    const { data, error } = await client
      .from(METRICS_TABLE)
      .select('*')
      .in('agent_id', agentIds);

    if (error) {
      throw new Error(`Failed to get batch metrics: ${error.message}`);
    }

    return (data || []).map((row) => mapRowToMetrics(row as ResponseMetricsRow));
  },

  /**
   * Save or update metrics for an agent.
   */
  async saveMetrics(metrics: AgentResponseMetrics): Promise<void> {
    const client = getClient();

    const row: Omit<ResponseMetricsRow, 'last_recalculated_at'> & { last_recalculated_at: string } = {
      agent_id: metrics.agentId,
      total_requests_received: metrics.totalRequestsReceived,
      total_responses: metrics.totalResponses,
      total_proposals: metrics.totalProposals,
      total_declined: metrics.totalDeclined,
      total_expired: metrics.totalExpired,
      response_rate: metrics.responseRate,
      response_time_p50: metrics.responseTimeP50,
      response_time_p75: metrics.responseTimeP75,
      response_time_p90: metrics.responseTimeP90,
      response_time_avg: metrics.responseTimeAvg,
      response_time_min: metrics.responseTimeMin,
      response_time_max: metrics.responseTimeMax,
      response_time_label: metrics.responseTimeLabel,
      business_hours_p50: metrics.businessHoursP50,
      after_hours_p50: metrics.afterHoursP50,
      trend: metrics.trend,
      trend_change_minutes: metrics.trendChangeMinutes,
      sample_size: metrics.sampleSize,
      last_response_at: metrics.lastResponseAt?.toISOString() || null,
      last_recalculated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from(METRICS_TABLE)
      .upsert(row, { onConflict: 'agent_id' });

    if (error) {
      throw new Error(`Failed to save metrics: ${error.message}`);
    }
  },

  /**
   * Delete all events for an agent (for testing/cleanup).
   */
  async deleteEventsForAgent(agentId: string): Promise<void> {
    const client = getClient();

    const { error } = await client
      .from(EVENTS_TABLE)
      .delete()
      .eq('agent_id', agentId);

    if (error) {
      throw new Error(`Failed to delete events: ${error.message}`);
    }

    // Also delete metrics
    const { error: metricsError } = await client
      .from(METRICS_TABLE)
      .delete()
      .eq('agent_id', agentId);

    if (metricsError) {
      throw new Error(`Failed to delete metrics: ${metricsError.message}`);
    }
  },
};

export default responseTimeRepository;
