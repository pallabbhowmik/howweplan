/**
 * Audit Repository
 * 
 * Data access layer for audit events. All audit events are immutable
 * and append-only - no updates or deletes allowed.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { databaseConfig } from '../config/env';
import { AuditEvent, AuditEventType, AuditActorType } from '../models';

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

interface AuditEventRow {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  target_type: string;
  target_id: string;
  review_id: string | null;
  agent_id: string | null;
  traveler_id: string | null;
  booking_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  admin_reason: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  occurred_at: string;
}

// =============================================================================
// MAPPERS
// =============================================================================

function mapRowToAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    eventType: row.event_type as AuditEventType,
    actorType: row.actor_type as AuditActorType,
    actorId: row.actor_id,
    targetType: row.target_type as 'REVIEW' | 'AGENT_SCORE' | 'INVITATION',
    targetId: row.target_id,
    reviewId: row.review_id,
    agentId: row.agent_id,
    travelerId: row.traveler_id,
    bookingId: row.booking_id,
    previousState: row.previous_state,
    newState: row.new_state,
    adminReason: row.admin_reason,
    metadata: row.metadata,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    occurredAt: new Date(row.occurred_at),
  };
}

function mapAuditEventToRow(event: AuditEvent): AuditEventRow {
  return {
    id: event.id,
    event_type: event.eventType,
    actor_type: event.actorType,
    actor_id: event.actorId,
    target_type: event.targetType,
    target_id: event.targetId,
    review_id: event.reviewId,
    agent_id: event.agentId,
    traveler_id: event.travelerId,
    booking_id: event.bookingId,
    previous_state: event.previousState,
    new_state: event.newState,
    admin_reason: event.adminReason,
    metadata: event.metadata,
    ip_address: event.ipAddress,
    user_agent: event.userAgent,
    occurred_at: event.occurredAt.toISOString(),
  };
}

// =============================================================================
// QUERY FILTERS
// =============================================================================

export interface AuditQueryFilters {
  eventType?: AuditEventType;
  eventTypes?: AuditEventType[];
  actorType?: AuditActorType;
  actorId?: string;
  targetType?: 'REVIEW' | 'AGENT_SCORE' | 'INVITATION';
  targetId?: string;
  reviewId?: string;
  agentId?: string;
  travelerId?: string;
  bookingId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface AuditPaginationOptions {
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export const auditRepository = {
  /**
   * Record a new audit event (append-only)
   */
  async record(event: AuditEvent): Promise<AuditEvent> {
    const client = getClient();
    const row = mapAuditEventToRow(event);
    
    const { data, error } = await client
      .from('audit_events')
      .insert(row)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to record audit event: ${error.message}`);
    }

    return mapRowToAuditEvent(data as AuditEventRow);
  },

  /**
   * Batch record multiple audit events
   */
  async recordBatch(events: AuditEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    const client = getClient();
    const rows = events.map(mapAuditEventToRow);
    
    const { error } = await client
      .from('audit_events')
      .insert(rows);
    
    if (error) {
      throw new Error(`Failed to record audit events batch: ${error.message}`);
    }
  },

  /**
   * Find audit event by ID
   */
  async findById(id: string): Promise<AuditEvent | null> {
    const client = getClient();
    
    const { data, error } = await client
      .from('audit_events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    return mapRowToAuditEvent(data as AuditEventRow);
  },

  /**
   * Query audit events with filters
   */
  async query(
    filters: AuditQueryFilters,
    pagination: AuditPaginationOptions
  ): Promise<{ items: AuditEvent[]; totalCount: number }> {
    const client = getClient();
    const { page, limit, sortOrder } = pagination;
    const offset = (page - 1) * limit;

    let query = client.from('audit_events').select('*', { count: 'exact' });

    // Apply filters
    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      query = query.in('event_type', filters.eventTypes);
    }
    if (filters.actorType) {
      query = query.eq('actor_type', filters.actorType);
    }
    if (filters.actorId) {
      query = query.eq('actor_id', filters.actorId);
    }
    if (filters.targetType) {
      query = query.eq('target_type', filters.targetType);
    }
    if (filters.targetId) {
      query = query.eq('target_id', filters.targetId);
    }
    if (filters.reviewId) {
      query = query.eq('review_id', filters.reviewId);
    }
    if (filters.agentId) {
      query = query.eq('agent_id', filters.agentId);
    }
    if (filters.travelerId) {
      query = query.eq('traveler_id', filters.travelerId);
    }
    if (filters.bookingId) {
      query = query.eq('booking_id', filters.bookingId);
    }
    if (filters.fromDate) {
      query = query.gte('occurred_at', filters.fromDate.toISOString());
    }
    if (filters.toDate) {
      query = query.lte('occurred_at', filters.toDate.toISOString());
    }

    // Apply sorting and pagination
    query = query
      .order('occurred_at', { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to query audit events: ${error.message}`);
    }

    return {
      items: (data as AuditEventRow[] ?? []).map(mapRowToAuditEvent),
      totalCount: count ?? 0,
    };
  },

  /**
   * Get audit trail for a specific review
   */
  async getReviewAuditTrail(reviewId: string): Promise<AuditEvent[]> {
    const client = getClient();
    
    const { data, error } = await client
      .from('audit_events')
      .select('*')
      .eq('review_id', reviewId)
      .order('occurred_at', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to get review audit trail: ${error.message}`);
    }

    return (data as AuditEventRow[] ?? []).map(mapRowToAuditEvent);
  },

  /**
   * Get audit trail for an agent's score changes
   */
  async getAgentScoreAuditTrail(agentId: string): Promise<AuditEvent[]> {
    const client = getClient();
    
    const { data, error } = await client
      .from('audit_events')
      .select('*')
      .eq('agent_id', agentId)
      .eq('target_type', 'AGENT_SCORE')
      .order('occurred_at', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to get agent score audit trail: ${error.message}`);
    }

    return (data as AuditEventRow[] ?? []).map(mapRowToAuditEvent);
  },

  /**
   * Get admin actions (for compliance reporting)
   */
  async getAdminActions(
    options: { fromDate?: Date; toDate?: Date; adminId?: string; limit?: number }
  ): Promise<AuditEvent[]> {
    const client = getClient();
    
    let query = client
      .from('audit_events')
      .select('*')
      .eq('actor_type', AuditActorType.ADMIN)
      .order('occurred_at', { ascending: false });
    
    if (options.fromDate) {
      query = query.gte('occurred_at', options.fromDate.toISOString());
    }
    if (options.toDate) {
      query = query.lte('occurred_at', options.toDate.toISOString());
    }
    if (options.adminId) {
      query = query.eq('actor_id', options.adminId);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get admin actions: ${error.message}`);
    }

    return (data as AuditEventRow[] ?? []).map(mapRowToAuditEvent);
  },

  /**
   * Get gaming-related events (for investigation)
   */
  async getGamingEvents(agentId: string): Promise<AuditEvent[]> {
    const client = getClient();
    
    const gamingEventTypes = [
      AuditEventType.GAMING_ALERT_TRIGGERED,
      AuditEventType.GAMING_INVESTIGATION_STARTED,
      AuditEventType.GAMING_INVESTIGATION_COMPLETED,
    ];
    
    const { data, error } = await client
      .from('audit_events')
      .select('*')
      .eq('agent_id', agentId)
      .in('event_type', gamingEventTypes)
      .order('occurred_at', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to get gaming events: ${error.message}`);
    }

    return (data as AuditEventRow[] ?? []).map(mapRowToAuditEvent);
  },

  /**
   * Count events by type (for analytics)
   */
  async countByType(
    fromDate: Date,
    toDate: Date
  ): Promise<Record<AuditEventType, number>> {
    const client = getClient();
    
    const { data, error } = await client
      .from('audit_events')
      .select('event_type')
      .gte('occurred_at', fromDate.toISOString())
      .lte('occurred_at', toDate.toISOString());
    
    if (error) {
      throw new Error(`Failed to count events by type: ${error.message}`);
    }

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const eventType = row.event_type as string;
      counts[eventType] = (counts[eventType] ?? 0) + 1;
    }

    return counts as Record<AuditEventType, number>;
  },
};

export type AuditRepository = typeof auditRepository;
