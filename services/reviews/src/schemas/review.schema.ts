/**
 * Review API Schemas
 * 
 * Input/output validation schemas for review-related API endpoints.
 * These schemas enforce business rules at the API boundary.
 */

import { z } from 'zod';
import { ReviewerType, ReviewStatus, RatingScoreSchema, ReviewRatingsSchema } from '../models';

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

/**
 * Submit a new review
 */
export const SubmitReviewRequestSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  ratings: ReviewRatingsSchema,
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .optional(),
  content: z.string()
    .min(20, 'Review must be at least 20 characters')
    .max(2000, 'Review cannot exceed 2000 characters'),
});

export type SubmitReviewRequest = z.infer<typeof SubmitReviewRequestSchema>;

/**
 * Save review as draft
 */
export const SaveDraftRequestSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  ratings: ReviewRatingsSchema.partial().optional(),
  title: z.string().max(100, 'Title cannot exceed 100 characters').optional(),
  content: z.string().max(2000, 'Content cannot exceed 2000 characters').optional(),
});

export type SaveDraftRequest = z.infer<typeof SaveDraftRequestSchema>;

/**
 * Get reviews with filtering
 */
export const GetReviewsQuerySchema = z.object({
  agentId: z.string().uuid().optional(),
  travelerId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
  reviewerType: z.nativeEnum(ReviewerType).optional(),
  minRating: RatingScoreSchema.optional(),
  maxRating: RatingScoreSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'rating', 'publishedAt']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetReviewsQuery = z.infer<typeof GetReviewsQuerySchema>;

/**
 * Admin: Moderate a review
 */
export const ModerateReviewRequestSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID format'),
  decision: z.enum(['APPROVE', 'REJECT', 'REQUIRE_EDIT']),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
  rejectionCategory: z.enum([
    'PROFANITY',
    'PII',
    'SPAM',
    'GAMING',
    'OFF_TOPIC',
    'OTHER',
  ]).optional(),
});

export type ModerateReviewRequest = z.infer<typeof ModerateReviewRequestSchema>;

/**
 * Admin: Hide/unhide a review
 */
export const ToggleReviewVisibilityRequestSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID format'),
  hidden: z.boolean(),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export type ToggleReviewVisibilityRequest = z.infer<typeof ToggleReviewVisibilityRequestSchema>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Public review response (visible to everyone)
 */
export const PublicReviewResponseSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  reviewerType: z.nativeEnum(ReviewerType),
  // Reviewer identity is partially anonymized
  reviewerDisplayName: z.string(),  // "John D." format
  reviewerAvatarUrl: z.string().url().nullable(),
  ratings: ReviewRatingsSchema,
  title: z.string().nullable(),
  content: z.string(),
  publishedAt: z.date(),
  // Trip context (non-identifying)
  tripMonth: z.string(),  // "December 2025" format
  tripType: z.string().nullable(),  // "Family vacation", etc.
});

export type PublicReviewResponse = z.infer<typeof PublicReviewResponseSchema>;

/**
 * Review response for the reviewer themselves
 */
export const OwnReviewResponseSchema = PublicReviewResponseSchema.extend({
  status: z.nativeEnum(ReviewStatus),
  submittedAt: z.date().nullable(),
  submissionDeadline: z.date(),
  moderationFeedback: z.string().nullable(),
});

export type OwnReviewResponse = z.infer<typeof OwnReviewResponseSchema>;

/**
 * Admin view of a review (full details)
 */
export const AdminReviewResponseSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  reviewerType: z.nativeEnum(ReviewerType),
  subjectId: z.string().uuid(),
  subjectType: z.nativeEnum(ReviewerType),
  ratings: ReviewRatingsSchema,
  title: z.string().nullable(),
  content: z.string(),
  status: z.nativeEnum(ReviewStatus),
  gamingScore: z.number().nullable(),
  gamingFlags: z.array(z.string()),
  moderation: z.object({
    decision: z.string(),
    confidence: z.number(),
    flags: z.array(z.string()),
    moderatedAt: z.date(),
    moderatedBy: z.string(),
    reason: z.string().nullable(),
  }).nullable(),
  tripCompletedAt: z.date(),
  submissionDeadline: z.date(),
  submittedAt: z.date().nullable(),
  publishedAt: z.date().nullable(),
  version: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AdminReviewResponse = z.infer<typeof AdminReviewResponseSchema>;

/**
 * Paginated response wrapper
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      totalItems: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  });

/**
 * Review eligibility check response
 */
export const ReviewEligibilityResponseSchema = z.object({
  bookingId: z.string().uuid(),
  canSubmitReview: z.boolean(),
  reason: z.string().nullable(),
  submissionDeadline: z.date().nullable(),
  existingReviewId: z.string().uuid().nullable(),
  existingReviewStatus: z.nativeEnum(ReviewStatus).nullable(),
});

export type ReviewEligibilityResponse = z.infer<typeof ReviewEligibilityResponseSchema>;

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

export const ReviewErrorCodes = {
  BOOKING_NOT_FOUND: 'REVIEW_001',
  BOOKING_NOT_COMPLETED: 'REVIEW_002',
  SUBMISSION_WINDOW_EXPIRED: 'REVIEW_003',
  REVIEW_ALREADY_SUBMITTED: 'REVIEW_004',
  REVIEW_NOT_FOUND: 'REVIEW_005',
  NOT_AUTHORIZED: 'REVIEW_006',
  INVALID_RATING: 'REVIEW_007',
  CONTENT_TOO_SHORT: 'REVIEW_008',
  MODERATION_REQUIRED: 'REVIEW_009',
  ALREADY_MODERATED: 'REVIEW_010',
  GAMING_DETECTED: 'REVIEW_011',
} as const;

export const ReviewErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ReviewError = z.infer<typeof ReviewErrorSchema>;
