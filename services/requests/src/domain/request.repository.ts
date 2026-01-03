/**
 * Request Repository
 * 
 * Data access layer for travel requests.
 * Uses Supabase as the underlying database.
 * All database operations are isolated in this module.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../env';
import { TravelRequest, TravelStyle, CancelledBy } from './request.entity';
import { RequestState, OPEN_REQUEST_STATES } from './request.state-machine';
import { RequestNotFoundError, RepositoryError } from './request.errors';

// Database row type - state is stored as UPPERCASE in database
interface RequestRow {
  id: string;
  user_id: string;
  title: string;  // Generated from destination
  state: string;  // Database stores UPPERCASE enum values
  destination: string;
  departure_location: string;
  departure_date: string;
  return_date: string;
  adults: number;
  children: number;
  infants: number;
  travel_style: TravelStyle;
  budget_min: number;
  budget_max: number;
  budget_currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  state_changed_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: CancelledBy | null;
}

export interface RequestRepository {
  create(request: TravelRequest): Promise<TravelRequest>;
  findById(id: string): Promise<TravelRequest | null>;
  findByIdOrThrow(id: string): Promise<TravelRequest>;
  findByUserId(userId: string, options?: FindOptions): Promise<TravelRequest[]>;
  update(request: TravelRequest): Promise<TravelRequest>;
  countOpenRequestsByUser(userId: string): Promise<number>;
  countTodayRequestsByUser(userId: string): Promise<number>;
  findExpiredRequests(limit: number): Promise<TravelRequest[]>;
}

export interface FindOptions {
  states?: RequestState[];
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'updated_at';
  orderDir?: 'asc' | 'desc';
}

export function createRequestRepository(): RequestRepository {
  const supabase = createClient(
    config.database.supabaseUrl,
    config.database.supabaseServiceRoleKey
  );

  return {
    async create(request: TravelRequest): Promise<TravelRequest> {
      const row = toRow(request);
      
      const { data, error } = await supabase
        .from('travel_requests')
        .insert(row)
        .select()
        .single();

      if (error) {
        throw new RepositoryError(`Failed to create request: ${error.message}`, error);
      }

      return fromRow(data);
    },

    async findById(id: string): Promise<TravelRequest | null> {
      const { data, error } = await supabase
        .from('travel_requests')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new RepositoryError(`Failed to find request: ${error.message}`, error);
      }

      return fromRow(data);
    },

    async findByIdOrThrow(id: string): Promise<TravelRequest> {
      const request = await this.findById(id);
      if (!request) {
        throw new RequestNotFoundError(id);
      }
      return request;
    },

    async findByUserId(userId: string, options: FindOptions = {}): Promise<TravelRequest[]> {
      let query = supabase
        .from('travel_requests')
        .select()
        .eq('user_id', userId);

      if (options.states && options.states.length > 0) {
        query = query.in('state', options.states.map(toDbState));
      }

      const orderBy = options.orderBy ?? 'created_at';
      const orderDir = options.orderDir ?? 'desc';
      query = query.order(orderBy, { ascending: orderDir === 'asc' });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new RepositoryError(`Failed to find requests: ${error.message}`, error);
      }

      return data.map(fromRow);
    },

    async update(request: TravelRequest): Promise<TravelRequest> {
      const row = toRow(request);

      const { data, error } = await supabase
        .from('travel_requests')
        .update(row)
        .eq('id', request.id)
        .select()
        .single();

      if (error) {
        throw new RepositoryError(`Failed to update request: ${error.message}`, error);
      }

      return fromRow(data);
    },

    async countOpenRequestsByUser(userId: string): Promise<number> {
      const { count, error } = await supabase
        .from('travel_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('state', OPEN_REQUEST_STATES.map(toDbState));

      if (error) {
        throw new RepositoryError(`Failed to count open requests: ${error.message}`, error);
      }

      return count ?? 0;
    },

    async countTodayRequestsByUser(userId: string): Promise<number> {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('travel_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());

      if (error) {
        throw new RepositoryError(`Failed to count today's requests: ${error.message}`, error);
      }

      return count ?? 0;
    },

    async findExpiredRequests(limit: number): Promise<TravelRequest[]> {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('travel_requests')
        .select()
        .in('state', ['open'])  // Database uses 'open' for submitted/matching requests
        .lt('expires_at', now)
        .limit(limit);

      if (error) {
        throw new RepositoryError(`Failed to find expired requests: ${error.message}`, error);
      }

      return data.map(fromRow);
    },
  };
}

// Row mapping functions
// Database enum: open, matched, proposals_received, accepted, completed, cancelled
// Code states: draft, submitted, matching, matched, expired, cancelled, completed

// Map code state to database enum value
function toDbState(state: string): string {
  const stateMap: Record<string, string> = {
    'draft': 'open',        // No draft in DB, treat as open
    'submitted': 'open',    // submitted maps to open
    'matching': 'open',     // matching maps to open
    'matched': 'matched',
    'proposals_received': 'proposals_received',
    'accepted': 'accepted',
    'expired': 'cancelled', // No expired in DB, treat as cancelled
    'cancelled': 'cancelled',
    'completed': 'completed',
  };
  return stateMap[state.toLowerCase()] ?? 'open';
}

// Map database enum value to code state
function fromDbState(dbState: string): string {
  const stateMap: Record<string, string> = {
    'open': 'submitted',    // open maps to submitted (most common)
    'matched': 'matched',
    'proposals_received': 'matched', // treat as matched in code
    'accepted': 'matched',  // treat as matched (booking in progress)
    'cancelled': 'cancelled',
    'completed': 'completed',
  };
  return stateMap[dbState.toLowerCase()] ?? 'submitted';
}

function toRow(request: TravelRequest): RequestRow {
  return {
    id: request.id,
    user_id: request.userId,
    title: `Trip to ${request.destination}`,  // Auto-generate title
    state: toDbState(request.state),
    destination: request.destination,
    departure_location: request.departureLocation,
    departure_date: request.departureDate.toISOString(),
    return_date: request.returnDate.toISOString(),
    adults: request.travelers.adults,
    children: request.travelers.children,
    infants: request.travelers.infants,
    travel_style: request.travelStyle,
    budget_min: request.budgetRange.minAmount,
    budget_max: request.budgetRange.maxAmount,
    budget_currency: request.budgetRange.currency,
    notes: request.notes,
    created_at: request.createdAt.toISOString(),
    updated_at: request.updatedAt.toISOString(),
    expires_at: request.expiresAt.toISOString(),
    state_changed_at: request.stateChangedAt.toISOString(),
    cancelled_at: request.cancelledAt?.toISOString() ?? null,
    cancellation_reason: request.cancellationReason,
    cancelled_by: request.cancelledBy,
  };
}

function fromRow(row: RequestRow): TravelRequest {
  return {
    id: row.id,
    userId: row.user_id,
    state: fromDbState(row.state) as TravelRequest['state'],
    destination: row.destination,
    departureLocation: row.departure_location,
    departureDate: new Date(row.departure_date),
    returnDate: new Date(row.return_date),
    travelers: {
      adults: row.adults,
      children: row.children,
      infants: row.infants,
    },
    travelStyle: row.travel_style,
    budgetRange: {
      minAmount: row.budget_min,
      maxAmount: row.budget_max,
      currency: row.budget_currency,
    },
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    expiresAt: new Date(row.expires_at),
    stateChangedAt: new Date(row.state_changed_at),
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    cancellationReason: row.cancellation_reason,
    cancelledBy: row.cancelled_by,
  };
}
