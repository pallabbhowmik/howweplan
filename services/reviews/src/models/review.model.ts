/**
 * Review Model
 * 
 * Core domain model representing a user review for a completed booking.
 * Reviews are immutable once published - edits create new versions.
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

export enum ReviewStatus {
  PENDING_SUBMISSION = 'PENDING_SUBMISSION',   // Booking completed, awaiting review
  DRAFT = 'DRAFT',                             // User started but not submitted
  SUBMITTED = 'SUBMITTED',                     // Submitted, pending moderation
  UNDER_MODERATION = 'UNDER_MODERATION',       // Being reviewed by system/admin
  PUBLISHED = 'PUBLISHED',                     // Visible to public
  REJECTED = 'REJECTED',                       // Failed moderation
  HIDDEN = 'HIDDEN',                           // Admin action - hidden from public
  EXPIRED = 'EXPIRED',                         // Submission window closed
}

export enum ReviewerType {
  TRAVELER = 'TRAVELER',
  AGENT = 'AGENT',
}

export enum ModerationDecision {
  APPROVED = 'APPROVED',
  REJECTED_PROFANITY = 'REJECTED_PROFANITY',
  REJECTED_PII = 'REJECTED_PII',
  REJECTED_SPAM = 'REJECTED_SPAM',
  REJECTED_GAMING = 'REJECTED_GAMING',
  REJECTED_OFF_TOPIC = 'REJECTED_OFF_TOPIC',
  REQUIRES_MANUAL_REVIEW = 'REQUIRES_MANUAL_REVIEW',
}

// =============================================================================
// VALUE OBJECTS
// =============================================================================

export const RatingScoreSchema = z.number().int().min(1).max(5);
export type RatingScore = z.infer<typeof RatingScoreSchema>;

export const ReviewRatingsSchema = z.object({
  overall: RatingScoreSchema,
  communication: RatingScoreSchema.optional(),
  accuracy: RatingScoreSchema.optional(),
  value: RatingScoreSchema.optional(),
  responsiveness: RatingScoreSchema.optional(),
});
export type ReviewRatings = z.infer<typeof ReviewRatingsSchema>;

export const ModerationResultSchema = z.object({
  decision: z.nativeEnum(ModerationDecision),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string()),
  moderatedAt: z.date(),
  moderatedBy: z.union([z.literal('SYSTEM'), z.string().uuid()]),
  reason: z.string().optional(),
});
export type ModerationResult = z.infer<typeof ModerationResultSchema>;

// =============================================================================
// REVIEW MODEL
// =============================================================================

export const ReviewSchema = z.object({
  // Identity
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  
  // Participants
  reviewerId: z.string().uuid(),
  reviewerType: z.nativeEnum(ReviewerType),
  subjectId: z.string().uuid(),  // Agent or Traveler being reviewed
  subjectType: z.nativeEnum(ReviewerType),
  
  // Content
  ratings: ReviewRatingsSchema,
  title: z.string().min(5).max(100).optional(),
  content: z.string().min(20).max(2000),
  
  // Status
  status: z.nativeEnum(ReviewStatus),
  
  // Moderation
  moderation: ModerationResultSchema.nullable(),
  
  // Gaming detection
  gamingScore: z.number().min(0).max(1).nullable(),  // 0 = legitimate, 1 = definitely gaming
  gamingFlags: z.array(z.string()),
  
  // Metadata
  tripCompletedAt: z.date(),
  submissionDeadline: z.date(),
  submittedAt: z.date().nullable(),
  publishedAt: z.date().nullable(),
  
  // Versioning
  version: z.number().int().positive(),
  previousVersionId: z.string().uuid().nullable(),
  
  // Audit
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Review = z.infer<typeof ReviewSchema>;

// =============================================================================
// REVIEW ELIGIBILITY
// =============================================================================

export const ReviewEligibilitySchema = z.object({
  bookingId: z.string().uuid(),
  travelerId: z.string().uuid(),
  agentId: z.string().uuid(),
  tripCompletedAt: z.date(),
  submissionDeadline: z.date(),
  bookingValue: z.number().positive(),
  isEligible: z.boolean(),
  ineligibilityReason: z.string().nullable(),
  travelerCanReview: z.boolean(),
  agentCanReview: z.boolean(),
  travelerReviewId: z.string().uuid().nullable(),
  agentReviewId: z.string().uuid().nullable(),
});

export type ReviewEligibility = z.infer<typeof ReviewEligibilitySchema>;

// =============================================================================
// REVIEW INVITATION
// =============================================================================

export const ReviewInvitationSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  recipientId: z.string().uuid(),
  recipientType: z.nativeEnum(ReviewerType),
  sentAt: z.date(),
  remindersSent: z.number().int().nonnegative(),
  lastReminderAt: z.date().nullable(),
  respondedAt: z.date().nullable(),
  expiresAt: z.date(),
});

export type ReviewInvitation = z.infer<typeof ReviewInvitationSchema>;

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createPendingReview(params: {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewerType: ReviewerType;
  subjectId: string;
  subjectType: ReviewerType;
  tripCompletedAt: Date;
  submissionWindowDays: number;
}): Omit<Review, 'ratings' | 'content'> & { ratings: null; content: null } {
  const now = new Date();
  const deadline = new Date(params.tripCompletedAt);
  deadline.setDate(deadline.getDate() + params.submissionWindowDays);

  return {
    id: params.id,
    bookingId: params.bookingId,
    reviewerId: params.reviewerId,
    reviewerType: params.reviewerType,
    subjectId: params.subjectId,
    subjectType: params.subjectType,
    ratings: null,
    title: undefined,
    content: null,
    status: ReviewStatus.PENDING_SUBMISSION,
    moderation: null,
    gamingScore: null,
    gamingFlags: [],
    tripCompletedAt: params.tripCompletedAt,
    submissionDeadline: deadline,
    submittedAt: null,
    publishedAt: null,
    version: 1,
    previousVersionId: null,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isPublishedReview(review: Review): boolean {
  return review.status === ReviewStatus.PUBLISHED;
}

export function canBeModerated(review: Review): boolean {
  return review.status === ReviewStatus.SUBMITTED || 
         review.status === ReviewStatus.UNDER_MODERATION;
}

export function isWithinSubmissionWindow(review: Review): boolean {
  return new Date() < review.submissionDeadline;
}
