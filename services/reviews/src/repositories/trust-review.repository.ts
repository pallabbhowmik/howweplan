/**
 * Trust Review Repository
 * 
 * Data access layer for trust reviews.
 * Enforces immutability rules at the database level.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { databaseConfig } from '../config/env';
import type { TrustReview } from '@tripcomposer/contracts';

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

const TABLE_NAME = 'trust_reviews';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface TrustReviewRow {
  review_id: string;
  booking_id: string;
  agent_id: string;
  user_id: string;
  rating: number;
  planning_quality: number;
  responsiveness: number;
  accuracy_vs_promise: number;
  comment: string | null;
  is_immutable: boolean;
  created_at: string;
  is_hidden: boolean;
  hidden_at: string | null;
  hidden_by: string | null;
  hidden_reason: string | null;
}

// =============================================================================
// MAPPERS
// =============================================================================

function mapRowToReview(row: TrustReviewRow): TrustReview {
  return {
    reviewId: row.review_id,
    bookingId: row.booking_id,
    agentId: row.agent_id,
    userId: row.user_id,
    rating: row.rating,
    planningQuality: row.planning_quality,
    responsiveness: row.responsiveness,
    accuracyVsPromise: row.accuracy_vs_promise,
    comment: row.comment,
    isImmutable: true, // Always true for trust reviews
    createdAt: new Date(row.created_at),
    isHidden: row.is_hidden,
    hiddenAt: row.hidden_at ? new Date(row.hidden_at) : null,
    hiddenBy: row.hidden_by,
    hiddenReason: row.hidden_reason,
  };
}

function mapReviewToRow(review: TrustReview): Omit<TrustReviewRow, 'created_at'> & { created_at?: string } {
  return {
    review_id: review.reviewId,
    booking_id: review.bookingId,
    agent_id: review.agentId,
    user_id: review.userId,
    rating: review.rating,
    planning_quality: review.planningQuality,
    responsiveness: review.responsiveness,
    accuracy_vs_promise: review.accuracyVsPromise,
    comment: review.comment,
    is_immutable: true,
    is_hidden: review.isHidden,
    hidden_at: review.hiddenAt?.toISOString() || null,
    hidden_by: review.hiddenBy,
    hidden_reason: review.hiddenReason,
  };
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export const trustReviewRepository = {
  /**
   * Create a new trust review (INSERT ONLY - no updates allowed on core fields).
   */
  async create(review: TrustReview): Promise<TrustReview> {
    const client = getClient();
    const row = mapReviewToRow(review);

    const { data, error } = await client
      .from(TABLE_NAME)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[TrustReviewRepository] Create error:', error);
      throw new Error(`Failed to create trust review: ${error.message}`);
    }

    return mapRowToReview(data as TrustReviewRow);
  },

  /**
   * Find a review by ID.
   */
  async findById(reviewId: string): Promise<TrustReview | null> {
    const client = getClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('review_id', reviewId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('[TrustReviewRepository] FindById error:', error);
      throw new Error(`Failed to find trust review: ${error.message}`);
    }

    return data ? mapRowToReview(data as TrustReviewRow) : null;
  },

  /**
   * Find review by booking ID.
   */
  async findByBooking(bookingId: string): Promise<TrustReview | null> {
    const client = getClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (error) {
      console.error('[TrustReviewRepository] FindByBooking error:', error);
      throw new Error(`Failed to find trust review: ${error.message}`);
    }

    return data ? mapRowToReview(data as TrustReviewRow) : null;
  },

  /**
   * Find review by booking and user (to check if already reviewed).
   */
  async findByBookingAndUser(bookingId: string, userId: string): Promise<TrustReview | null> {
    const client = getClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('booking_id', bookingId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[TrustReviewRepository] FindByBookingAndUser error:', error);
      throw new Error(`Failed to find trust review: ${error.message}`);
    }

    return data ? mapRowToReview(data as TrustReviewRow) : null;
  },

  /**
   * Find all reviews for an agent.
   */
  async findByAgent(
    agentId: string,
    options: { includeHidden: boolean; limit: number; offset: number }
  ): Promise<{ reviews: TrustReview[]; total: number }> {
    const client = getClient();

    let query = client
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .eq('agent_id', agentId);

    if (!options.includeHidden) {
      query = query.eq('is_hidden', false);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[TrustReviewRepository] FindByAgent error:', error);
      throw new Error(`Failed to find trust reviews: ${error.message}`);
    }

    return {
      reviews: (data as TrustReviewRow[]).map(mapRowToReview),
      total: count || 0,
    };
  },

  /**
   * Update hidden status (ONLY field allowed to be updated post-creation).
   * This is an admin moderation action, not a user edit.
   */
  async updateHiddenStatus(
    reviewId: string,
    isHidden: boolean,
    hiddenBy: string | null,
    hiddenReason: string | null
  ): Promise<TrustReview> {
    const client = getClient();

    const { data, error } = await client
      .from(TABLE_NAME)
      .update({
        is_hidden: isHidden,
        hidden_at: isHidden ? new Date().toISOString() : null,
        hidden_by: isHidden ? hiddenBy : null,
        hidden_reason: isHidden ? hiddenReason : null,
      })
      .eq('review_id', reviewId)
      .select()
      .single();

    if (error) {
      console.error('[TrustReviewRepository] UpdateHiddenStatus error:', error);
      throw new Error(`Failed to update review hidden status: ${error.message}`);
    }

    return mapRowToReview(data as TrustReviewRow);
  },

  /**
   * Get aggregated stats for an agent.
   */
  async getAgentStats(agentId: string): Promise<{
    totalReviews: number;
    averageRating: number | null;
    averagePlanningQuality: number | null;
    averageResponsiveness: number | null;
    averageAccuracy: number | null;
    ratingDistribution: Record<string, number>;
  }> {
    const client = getClient();

    // Get aggregate stats
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('rating, planning_quality, responsiveness, accuracy_vs_promise')
      .eq('agent_id', agentId)
      .eq('is_hidden', false);

    if (error) {
      console.error('[TrustReviewRepository] GetAgentStats error:', error);
      throw new Error(`Failed to get agent stats: ${error.message}`);
    }

    const reviews = data as { rating: number; planning_quality: number; responsiveness: number; accuracy_vs_promise: number }[];
    
    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: null,
        averagePlanningQuality: null,
        averageResponsiveness: null,
        averageAccuracy: null,
        ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      };
    }

    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    const avgPlanning = reviews.reduce((sum, r) => sum + r.planning_quality, 0) / totalReviews;
    const avgResponsiveness = reviews.reduce((sum, r) => sum + r.responsiveness, 0) / totalReviews;
    const avgAccuracy = reviews.reduce((sum, r) => sum + r.accuracy_vs_promise, 0) / totalReviews;

    const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    reviews.forEach(r => {
      ratingDistribution[String(r.rating)] = (ratingDistribution[String(r.rating)] || 0) + 1;
    });

    return {
      totalReviews,
      averageRating: Math.round(avgRating * 100) / 100,
      averagePlanningQuality: Math.round(avgPlanning * 100) / 100,
      averageResponsiveness: Math.round(avgResponsiveness * 100) / 100,
      averageAccuracy: Math.round(avgAccuracy * 100) / 100,
      ratingDistribution,
    };
  },
};
