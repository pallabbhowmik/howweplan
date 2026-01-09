/**
 * Trust Review Service
 * 
 * Business logic for the trust & reputation review system.
 * Enforces strict rules for review submission.
 * 
 * RULES ENFORCED:
 * - Reviews ONLY after booking status = COMPLETED
 * - One review per booking
 * - Reviews are immutable after submission
 * - No editing or deletion (only admin soft-hide)
 */

import {
  type TrustReview,
  type TrustReviewSubmission,
  type ReviewEligibility,
  validateReviewRatings,
  calculateReviewWindow,
  DEFAULT_REVIEW_WINDOW_CONFIG,
} from '@tripcomposer/contracts';
import { trustReviewRepository } from '../repositories/trust-review.repository';
import { bookingVerificationService } from './booking-verification.service';
import { trustEventPublisher } from '../events/trust-event.publisher';
import { auditRepository } from '../repositories';

// =============================================================================
// ERROR CODES
// =============================================================================

export const TrustReviewErrorCodes = {
  BOOKING_NOT_COMPLETED: 'TRUST_REVIEW_001',
  REVIEW_ALREADY_EXISTS: 'TRUST_REVIEW_002',
  REVIEW_WINDOW_EXPIRED: 'TRUST_REVIEW_003',
  INVALID_RATINGS: 'TRUST_REVIEW_004',
  BOOKING_NOT_FOUND: 'TRUST_REVIEW_005',
  UNAUTHORIZED: 'TRUST_REVIEW_006',
  REVIEW_NOT_FOUND: 'TRUST_REVIEW_007',
  REVIEW_IMMUTABLE: 'TRUST_REVIEW_008',
  NOT_ELIGIBLE: 'TRUST_REVIEW_009',
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface TrustReviewResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export const trustReviewService = {
  /**
   * Check if a user can submit a review for a booking.
   * Enforces: booking must be COMPLETED, no existing review, window open.
   */
  async checkEligibility(
    bookingId: string,
    userId: string
  ): Promise<TrustReviewResult<ReviewEligibility>> {
    // 1. Verify booking exists and get details
    const bookingResult = await bookingVerificationService.getCompletedBooking(bookingId);
    
    if (!bookingResult.success || !bookingResult.data) {
      return {
        success: false,
        error: {
          code: TrustReviewErrorCodes.BOOKING_NOT_FOUND,
          message: 'Booking not found',
        },
      };
    }

    const booking = bookingResult.data;

    // 2. Verify booking is COMPLETED - this is the core rule
    if (booking.state !== 'COMPLETED') {
      return {
        success: true,
        data: {
          bookingId,
          userId,
          agentId: booking.agentId,
          isEligible: false,
          reason: 'Reviews can only be submitted for completed bookings',
          expiresAt: null,
          alreadyReviewed: false,
        },
      };
    }

    // 3. Verify user is the customer for this booking
    if (booking.userId !== userId) {
      return {
        success: false,
        error: {
          code: TrustReviewErrorCodes.UNAUTHORIZED,
          message: 'You are not authorized to review this booking',
        },
      };
    }

    // 4. Check if review already exists (one review per booking)
    const existingReview = await trustReviewRepository.findByBookingAndUser(
      bookingId,
      userId
    );

    if (existingReview) {
      return {
        success: true,
        data: {
          bookingId,
          userId,
          agentId: booking.agentId,
          isEligible: false,
          reason: 'You have already submitted a review for this booking',
          expiresAt: null,
          alreadyReviewed: true,
        },
      };
    }

    // 5. Check review submission window
    const completedAt = booking.timeline.completedAt;
    if (!completedAt) {
      return {
        success: true,
        data: {
          bookingId,
          userId,
          agentId: booking.agentId,
          isEligible: false,
          reason: 'Booking completion date not found',
          expiresAt: null,
          alreadyReviewed: false,
        },
      };
    }

    const window = calculateReviewWindow(completedAt, DEFAULT_REVIEW_WINDOW_CONFIG);

    if (!window.isOpen) {
      const reason = new Date() < window.startsAt
        ? 'Review window has not opened yet'
        : 'Review submission window has expired';

      return {
        success: true,
        data: {
          bookingId,
          userId,
          agentId: booking.agentId,
          isEligible: false,
          reason,
          expiresAt: window.expiresAt,
          alreadyReviewed: false,
        },
      };
    }

    // 6. User is eligible to submit review
    return {
      success: true,
      data: {
        bookingId,
        userId,
        agentId: booking.agentId,
        isEligible: true,
        reason: null,
        expiresAt: window.expiresAt,
        alreadyReviewed: false,
      },
    };
  },

  /**
   * Submit a review for a completed booking.
   * Creates an IMMUTABLE review record.
   */
  async submitReview(
    submission: TrustReviewSubmission,
    userId: string
  ): Promise<TrustReviewResult<TrustReview>> {
    // 1. Check eligibility first
    const eligibility = await this.checkEligibility(submission.bookingId, userId);
    
    if (!eligibility.success || !eligibility.data) {
      return {
        success: false,
        error: eligibility.error || {
          code: TrustReviewErrorCodes.NOT_ELIGIBLE,
          message: 'Unable to verify eligibility',
        },
      };
    }

    if (!eligibility.data.isEligible) {
      return {
        success: false,
        error: {
          code: TrustReviewErrorCodes.NOT_ELIGIBLE,
          message: eligibility.data.reason || 'Not eligible to submit review',
          details: {
            alreadyReviewed: eligibility.data.alreadyReviewed,
            expiresAt: eligibility.data.expiresAt,
          },
        },
      };
    }

    // 2. Validate ratings
    const validation = validateReviewRatings(submission);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: TrustReviewErrorCodes.INVALID_RATINGS,
          message: 'Invalid review ratings',
          details: { errors: validation.errors },
        },
      };
    }

    // 3. Create the immutable review record
    const now = new Date();
    const review: TrustReview = {
      reviewId: crypto.randomUUID(),
      bookingId: submission.bookingId,
      agentId: eligibility.data.agentId,
      userId,
      rating: submission.rating,
      planningQuality: submission.planningQuality,
      responsiveness: submission.responsiveness,
      accuracyVsPromise: submission.accuracyVsPromise,
      comment: submission.comment || null,
      isImmutable: true,
      createdAt: now,
      isHidden: false,
      hiddenAt: null,
      hiddenBy: null,
      hiddenReason: null,
    };

    // 4. Save the review (immutable insert - no update allowed)
    await trustReviewRepository.create(review);

    // 5. Record audit event
    await auditRepository.recordBatch([{
      eventType: 'TRUST_REVIEW_SUBMITTED',
      actorType: 'USER',
      actorId: userId,
      targetType: 'REVIEW',
      targetId: review.reviewId,
      details: {
        bookingId: submission.bookingId,
        agentId: eligibility.data.agentId,
        rating: submission.rating,
        isImmutable: true,
      },
      timestamp: now,
    }]);

    // 6. Emit ReviewSubmitted event for downstream processing
    await trustEventPublisher.publishReviewSubmitted({
      reviewId: review.reviewId,
      bookingId: review.bookingId,
      userId: review.userId,
      agentId: review.agentId,
      rating: review.rating,
      planningQuality: review.planningQuality,
      responsiveness: review.responsiveness,
      accuracyVsPromise: review.accuracyVsPromise,
      hasComment: !!review.comment,
      submittedAt: now,
    });

    return {
      success: true,
      data: review,
    };
  },

  /**
   * Get a review by ID.
   * Returns null if review is hidden (unless caller is admin).
   */
  async getReview(
    reviewId: string,
    includeHidden: boolean = false
  ): Promise<TrustReviewResult<TrustReview | null>> {
    const review = await trustReviewRepository.findById(reviewId);

    if (!review) {
      return {
        success: true,
        data: null,
      };
    }

    if (review.isHidden && !includeHidden) {
      return {
        success: true,
        data: null, // Don't expose hidden reviews to non-admins
      };
    }

    return {
      success: true,
      data: review,
    };
  },

  /**
   * Get all reviews for an agent.
   * Only returns published (non-hidden) reviews.
   */
  async getAgentReviews(
    agentId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<TrustReviewResult<{ reviews: TrustReview[]; total: number }>> {
    const result = await trustReviewRepository.findByAgent(agentId, {
      includeHidden: false,
      limit: options.limit || 20,
      offset: options.offset || 0,
    });

    return {
      success: true,
      data: result,
    };
  },

  /**
   * Admin: Hide a review (soft-delete).
   * Reviews cannot be deleted, only hidden.
   */
  async hideReview(
    reviewId: string,
    adminId: string,
    reason: string
  ): Promise<TrustReviewResult<TrustReview>> {
    const review = await trustReviewRepository.findById(reviewId);

    if (!review) {
      return {
        success: false,
        error: {
          code: TrustReviewErrorCodes.REVIEW_NOT_FOUND,
          message: 'Review not found',
        },
      };
    }

    if (review.isHidden) {
      return {
        success: false,
        error: {
          code: TrustReviewErrorCodes.REVIEW_IMMUTABLE,
          message: 'Review is already hidden',
        },
      };
    }

    // Update hidden status (this is allowed as it's admin moderation, not user edit)
    const updatedReview = await trustReviewRepository.updateHiddenStatus(
      reviewId,
      true,
      adminId,
      reason
    );

    // Record audit event
    await auditRepository.recordBatch([{
      eventType: 'TRUST_REVIEW_HIDDEN',
      actorType: 'ADMIN',
      actorId: adminId,
      targetType: 'REVIEW',
      targetId: reviewId,
      details: {
        reason,
        agentId: review.agentId,
      },
      timestamp: new Date(),
    }]);

    // Emit event
    await trustEventPublisher.publishReviewHidden({
      reviewId,
      agentId: review.agentId,
      adminId,
      reason,
      hiddenAt: new Date(),
    });

    return {
      success: true,
      data: updatedReview,
    };
  },

  /**
   * Get review for a specific booking (if exists).
   */
  async getReviewByBooking(
    bookingId: string
  ): Promise<TrustReviewResult<TrustReview | null>> {
    const review = await trustReviewRepository.findByBooking(bookingId);
    return {
      success: true,
      data: review,
    };
  },
};
