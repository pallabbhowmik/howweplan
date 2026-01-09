/**
 * Trust Review Entity
 * 
 * Immutable review model for trust & reputation system.
 * Reviews can only be created after booking completion.
 * 
 * CONSTITUTION RULES ENFORCED:
 * - Reviews only from completed bookings
 * - One review per booking
 * - Reviews are immutable after submission
 * - No editing or deletion (only admin soft-hide)
 */

// =============================================================================
// REVIEW ENTITY
// =============================================================================

/**
 * Trust Review - the immutable review record.
 * This extends the existing Review entity with trust-specific fields.
 */
export interface TrustReview {
  readonly reviewId: string;
  readonly bookingId: string;
  readonly agentId: string;
  readonly userId: string;
  
  // Rating dimensions (1-5 scale)
  readonly rating: number;
  readonly planningQuality: number;
  readonly responsiveness: number;
  readonly accuracyVsPromise: number;
  
  // Optional text feedback (post-completion only)
  readonly comment: string | null;
  
  // Immutability guarantee
  readonly isImmutable: true;
  
  // Timestamps
  readonly createdAt: Date;
  
  // Visibility control (admin only)
  readonly isHidden: boolean;
  readonly hiddenAt: Date | null;
  readonly hiddenBy: string | null;
  readonly hiddenReason: string | null;
}

// =============================================================================
// REVIEW SUBMISSION
// =============================================================================

/**
 * Input for submitting a new review.
 * All ratings are required; comment is optional.
 */
export interface TrustReviewSubmission {
  readonly bookingId: string;
  readonly rating: number;
  readonly planningQuality: number;
  readonly responsiveness: number;
  readonly accuracyVsPromise: number;
  readonly comment?: string;
}

/**
 * Review eligibility status.
 * Tracks whether a user can submit a review for a booking.
 */
export interface ReviewEligibility {
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly isEligible: boolean;
  readonly reason: string | null;
  readonly expiresAt: Date | null;
  readonly alreadyReviewed: boolean;
}

// =============================================================================
// REVIEW VALIDATION
// =============================================================================

/**
 * Validates rating values are within acceptable range.
 */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Validates all ratings in a review submission.
 */
export function validateReviewRatings(submission: TrustReviewSubmission): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!isValidRating(submission.rating)) {
    errors.push('Overall rating must be between 1 and 5');
  }
  if (!isValidRating(submission.planningQuality)) {
    errors.push('Planning quality rating must be between 1 and 5');
  }
  if (!isValidRating(submission.responsiveness)) {
    errors.push('Responsiveness rating must be between 1 and 5');
  }
  if (!isValidRating(submission.accuracyVsPromise)) {
    errors.push('Accuracy rating must be between 1 and 5');
  }
  
  if (submission.comment && submission.comment.length > 2000) {
    errors.push('Comment must not exceed 2000 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// REVIEW WINDOW CONFIGURATION
// =============================================================================

/**
 * Configuration for review submission window.
 */
export interface ReviewWindowConfig {
  /** Days after booking completion when review can be submitted */
  readonly windowDays: number;
  /** Minimum days after completion before review can be submitted (cooling off) */
  readonly coolingOffDays: number;
}

export const DEFAULT_REVIEW_WINDOW_CONFIG: ReviewWindowConfig = {
  windowDays: 30,
  coolingOffDays: 0, // Can review immediately after completion
};

/**
 * Calculates the review submission window for a booking.
 */
export function calculateReviewWindow(
  completedAt: Date,
  config: ReviewWindowConfig = DEFAULT_REVIEW_WINDOW_CONFIG
): {
  startsAt: Date;
  expiresAt: Date;
  isOpen: boolean;
} {
  const startsAt = new Date(completedAt);
  startsAt.setDate(startsAt.getDate() + config.coolingOffDays);
  
  const expiresAt = new Date(completedAt);
  expiresAt.setDate(expiresAt.getDate() + config.windowDays);
  
  const now = new Date();
  const isOpen = now >= startsAt && now <= expiresAt;
  
  return { startsAt, expiresAt, isOpen };
}

// =============================================================================
// AGGREGATED REVIEW STATS
// =============================================================================

/**
 * Aggregated review statistics for an agent.
 * Used for calculating trust metrics.
 */
export interface AggregatedReviewStats {
  readonly agentId: string;
  readonly totalReviews: number;
  readonly averageOverallRating: number | null;
  readonly averagePlanningQuality: number | null;
  readonly averageResponsiveness: number | null;
  readonly averageAccuracy: number | null;
  readonly ratingDistribution: {
    readonly '1': number;
    readonly '2': number;
    readonly '3': number;
    readonly '4': number;
    readonly '5': number;
  };
  readonly lastReviewedAt: Date | null;
  readonly calculatedAt: Date;
}
