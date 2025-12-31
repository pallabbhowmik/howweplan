/**
 * Review Repository
 * 
 * Data access layer for reviews. Abstracts database operations
 * and enforces data integrity rules.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { databaseConfig } from '../config/env';
import { 
  Review, 
  ReviewStatus, 
  ReviewerType,
  ModerationResult,
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

interface ReviewRow {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewer_type: string;
  subject_id: string;
  subject_type: string;
  ratings: Record<string, number> | null;
  title: string | null;
  content: string | null;
  status: string;
  moderation: Record<string, unknown> | null;
  gaming_score: number | null;
  gaming_flags: string[];
  trip_completed_at: string;
  submission_deadline: string;
  submitted_at: string | null;
  published_at: string | null;
  version: number;
  previous_version_id: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// MAPPERS
// =============================================================================

function mapRowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    reviewerId: row.reviewer_id,
    reviewerType: row.reviewer_type as ReviewerType,
    subjectId: row.subject_id,
    subjectType: row.subject_type as ReviewerType,
    ratings: row.ratings as Review['ratings'],
    title: row.title ?? undefined,
    content: row.content ?? '',
    status: row.status as ReviewStatus,
    moderation: row.moderation as ModerationResult | null,
    gamingScore: row.gaming_score,
    gamingFlags: row.gaming_flags ?? [],
    tripCompletedAt: new Date(row.trip_completed_at),
    submissionDeadline: new Date(row.submission_deadline),
    submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    version: row.version,
    previousVersionId: row.previous_version_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapReviewToRow(review: Partial<Review>): Partial<ReviewRow> {
  const row: Partial<ReviewRow> = {};
  
  if (review.id !== undefined) row.id = review.id;
  if (review.bookingId !== undefined) row.booking_id = review.bookingId;
  if (review.reviewerId !== undefined) row.reviewer_id = review.reviewerId;
  if (review.reviewerType !== undefined) row.reviewer_type = review.reviewerType;
  if (review.subjectId !== undefined) row.subject_id = review.subjectId;
  if (review.subjectType !== undefined) row.subject_type = review.subjectType;
  if (review.ratings !== undefined) row.ratings = review.ratings;
  if (review.title !== undefined) row.title = review.title ?? null;
  if (review.content !== undefined) row.content = review.content;
  if (review.status !== undefined) row.status = review.status;
  if (review.moderation !== undefined) row.moderation = review.moderation as Record<string, unknown>;
  if (review.gamingScore !== undefined) row.gaming_score = review.gamingScore;
  if (review.gamingFlags !== undefined) row.gaming_flags = review.gamingFlags;
  if (review.tripCompletedAt !== undefined) row.trip_completed_at = review.tripCompletedAt.toISOString();
  if (review.submissionDeadline !== undefined) row.submission_deadline = review.submissionDeadline.toISOString();
  if (review.submittedAt !== undefined) row.submitted_at = review.submittedAt?.toISOString() ?? null;
  if (review.publishedAt !== undefined) row.published_at = review.publishedAt?.toISOString() ?? null;
  if (review.version !== undefined) row.version = review.version;
  if (review.previousVersionId !== undefined) row.previous_version_id = review.previousVersionId;
  
  return row;
}

// =============================================================================
// REPOSITORY INTERFACE
// =============================================================================

export interface ReviewFilters {
  agentId?: string;
  travelerId?: string;
  bookingId?: string;
  reviewerId?: string;
  subjectId?: string;
  status?: ReviewStatus;
  reviewerType?: ReviewerType;
  minRating?: number;
  maxRating?: number;
  fromDate?: Date;
  toDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'rating' | 'publishedAt';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export const reviewRepository = {
  /**
   * Find a review by ID
   */
  async findById(id: string): Promise<Review | null> {
    const client = getClient();
    
    const { data, error } = await client
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    return mapRowToReview(data as ReviewRow);
  },

  /**
   * Find a review by booking ID and reviewer type
   */
  async findByBookingAndReviewer(
    bookingId: string, 
    reviewerId: string
  ): Promise<Review | null> {
    const client = getClient();
    
    const { data, error } = await client
      .from('reviews')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', reviewerId)
      .single();
    
    if (error || !data) return null;
    return mapRowToReview(data as ReviewRow);
  },

  /**
   * Find reviews with filters and pagination
   */
  async findMany(
    filters: ReviewFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Review>> {
    const client = getClient();
    const { page, limit, sortBy, sortOrder } = pagination;
    const offset = (page - 1) * limit;

    // Build query
    let query = client.from('reviews').select('*', { count: 'exact' });

    // Apply filters
    if (filters.agentId) {
      query = query.or(`subject_id.eq.${filters.agentId},reviewer_id.eq.${filters.agentId}`);
    }
    if (filters.travelerId) {
      query = query.or(`subject_id.eq.${filters.travelerId},reviewer_id.eq.${filters.travelerId}`);
    }
    if (filters.bookingId) {
      query = query.eq('booking_id', filters.bookingId);
    }
    if (filters.reviewerId) {
      query = query.eq('reviewer_id', filters.reviewerId);
    }
    if (filters.subjectId) {
      query = query.eq('subject_id', filters.subjectId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.reviewerType) {
      query = query.eq('reviewer_type', filters.reviewerType);
    }
    if (filters.minRating) {
      query = query.gte('ratings->overall', filters.minRating);
    }
    if (filters.maxRating) {
      query = query.lte('ratings->overall', filters.maxRating);
    }
    if (filters.fromDate) {
      query = query.gte('created_at', filters.fromDate.toISOString());
    }
    if (filters.toDate) {
      query = query.lte('created_at', filters.toDate.toISOString());
    }

    // Apply sorting
    const sortColumn = sortBy === 'rating' ? 'ratings->overall' : 
                       sortBy === 'publishedAt' ? 'published_at' : 'created_at';
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }

    const items = (data as ReviewRow[] ?? []).map(mapRowToReview);
    const totalCount = count ?? 0;

    return {
      items,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  },

  /**
   * Find all published reviews for a subject
   */
  async findPublishedBySubject(
    subjectId: string,
    limit: number = 20
  ): Promise<Review[]> {
    const client = getClient();
    
    const { data, error } = await client
      .from('reviews')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('status', ReviewStatus.PUBLISHED)
      .order('published_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }

    return (data as ReviewRow[] ?? []).map(mapRowToReview);
  },

  /**
   * Create a new review
   */
  async create(review: Review): Promise<Review> {
    const client = getClient();
    const row = mapReviewToRow(review);
    
    const { data, error } = await client
      .from('reviews')
      .insert({
        ...row,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to create review: ${error.message}`);
    }

    return mapRowToReview(data as ReviewRow);
  },

  /**
   * Update an existing review
   */
  async update(id: string, updates: Partial<Review>): Promise<Review> {
    const client = getClient();
    const row = mapReviewToRow(updates);
    
    const { data, error } = await client
      .from('reviews')
      .update({
        ...row,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update review: ${error.message}`);
    }

    return mapRowToReview(data as ReviewRow);
  },

  /**
   * Update review status with optimistic locking
   */
  async updateStatus(
    id: string, 
    expectedVersion: number,
    newStatus: ReviewStatus,
    additionalUpdates?: Partial<Review>
  ): Promise<Review> {
    const client = getClient();
    
    const updates: Partial<ReviewRow> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === ReviewStatus.SUBMITTED) {
      updates.submitted_at = new Date().toISOString();
    }
    if (newStatus === ReviewStatus.PUBLISHED) {
      updates.published_at = new Date().toISOString();
    }

    if (additionalUpdates) {
      Object.assign(updates, mapReviewToRow(additionalUpdates));
    }

    const { data, error } = await client
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .eq('version', expectedVersion)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Review was modified by another process (version conflict)');
      }
      throw new Error(`Failed to update review status: ${error.message}`);
    }

    return mapRowToReview(data as ReviewRow);
  },

  /**
   * Count reviews by subject in a time period
   */
  async countBySubjectInPeriod(
    subjectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const client = getClient();
    
    const { count, error } = await client
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId)
      .gte('submitted_at', startDate.toISOString())
      .lte('submitted_at', endDate.toISOString());
    
    if (error) {
      throw new Error(`Failed to count reviews: ${error.message}`);
    }

    return count ?? 0;
  },

  /**
   * Get review statistics for a subject
   */
  async getSubjectStats(subjectId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const client = getClient();
    
    const { data, error } = await client
      .from('reviews')
      .select('ratings')
      .eq('subject_id', subjectId)
      .eq('status', ReviewStatus.PUBLISHED);
    
    if (error) {
      throw new Error(`Failed to get review stats: ${error.message}`);
    }

    const reviews = data ?? [];
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const review of reviews) {
      const rating = (review.ratings as Record<string, number>)?.overall ?? 0;
      sum += rating;
      if (rating >= 1 && rating <= 5) {
        const roundedRating = Math.round(rating) as 1 | 2 | 3 | 4 | 5;
        ratingDistribution[roundedRating]++;
      }
    }

    return {
      totalReviews,
      averageRating: sum / totalReviews,
      ratingDistribution,
    };
  },

  /**
   * Find pending review invitations
   */
  async findExpiredPendingReviews(): Promise<Review[]> {
    const client = getClient();
    
    const { data, error } = await client
      .from('reviews')
      .select('*')
      .eq('status', ReviewStatus.PENDING_SUBMISSION)
      .lt('submission_deadline', new Date().toISOString());
    
    if (error) {
      throw new Error(`Failed to fetch expired reviews: ${error.message}`);
    }

    return (data as ReviewRow[] ?? []).map(mapRowToReview);
  },

  /**
   * Bulk expire reviews
   */
  async bulkExpire(reviewIds: string[]): Promise<number> {
    if (reviewIds.length === 0) return 0;
    
    const client = getClient();
    
    const { error, count } = await client
      .from('reviews')
      .update({ 
        status: ReviewStatus.EXPIRED,
        updated_at: new Date().toISOString(),
      })
      .in('id', reviewIds);
    
    if (error) {
      throw new Error(`Failed to expire reviews: ${error.message}`);
    }

    return count ?? 0;
  },
};

export type ReviewRepository = typeof reviewRepository;
