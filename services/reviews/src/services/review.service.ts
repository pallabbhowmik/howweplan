/**
 * Review Service
 * 
 * Core business logic for review management.
 * Orchestrates review lifecycle, moderation, and publishing.
 */

import { operationalLimits } from '../config/env';
import {
  Review,
  ReviewStatus,
  ReviewerType,
  ReviewRatings,
  ModerationResult,
  ModerationDecision,
  AuditEventType,
  AuditActorType,
  createPendingReview,
  createAuditEvent,
  isWithinSubmissionWindow,
  canBeModerated,
  validateAdminAuditEvent,
} from '../models';
import { reviewRepository, auditRepository } from '../repositories';
import { gamingDetectionService, GamingRecommendation } from './gaming-detection.service';
// Score recalculation is triggered via events, not direct import

// =============================================================================
// TYPES
// =============================================================================

export interface CreateReviewContext {
  bookingId: string;
  travelerId: string;
  agentId: string;
  tripCompletedAt: Date;
  bookingValue: number;
}

export interface SubmitReviewInput {
  reviewId: string;
  ratings: ReviewRatings;
  title?: string;
  content: string;
}

export interface ModerationInput {
  reviewId: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUIRE_EDIT';
  reason: string;
  adminId: string;
  rejectionCategory?: string;
}

export interface ReviewServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// =============================================================================
// ERROR CODES
// =============================================================================

const ErrorCodes = {
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
  BOOKING_VALUE_TOO_LOW: 'REVIEW_012',
  INVALID_STATE_TRANSITION: 'REVIEW_013',
};

// =============================================================================
// REVIEW SERVICE
// =============================================================================

export const reviewService = {
  /**
   * Create pending review records after a booking is completed.
   * Creates one record for traveler to review agent, one for agent to review traveler.
   */
  async createPendingReviews(context: CreateReviewContext): Promise<ReviewServiceResult<{
    travelerReviewId: string;
    agentReviewId: string;
  }>> {
    // Validate booking value meets minimum threshold
    if (context.bookingValue < operationalLimits.minBookingValueForReview) {
      return {
        success: false,
        error: {
          code: ErrorCodes.BOOKING_VALUE_TOO_LOW,
          message: `Booking value must be at least ${operationalLimits.minBookingValueForReview} to submit a review`,
          details: { bookingValue: context.bookingValue, minimum: operationalLimits.minBookingValueForReview },
        },
      };
    }

    const submissionWindowDays = operationalLimits.reviewSubmissionWindowDays;

    // Create traveler -> agent review
    const travelerReview = createPendingReview({
      id: crypto.randomUUID(),
      bookingId: context.bookingId,
      reviewerId: context.travelerId,
      reviewerType: ReviewerType.TRAVELER,
      subjectId: context.agentId,
      subjectType: ReviewerType.AGENT,
      tripCompletedAt: context.tripCompletedAt,
      submissionWindowDays,
    });

    // Create agent -> traveler review
    const agentReview = createPendingReview({
      id: crypto.randomUUID(),
      bookingId: context.bookingId,
      reviewerId: context.agentId,
      reviewerType: ReviewerType.AGENT,
      subjectId: context.travelerId,
      subjectType: ReviewerType.TRAVELER,
      tripCompletedAt: context.tripCompletedAt,
      submissionWindowDays,
    });

    // Save both reviews
    await reviewRepository.create(travelerReview as unknown as Review);
    await reviewRepository.create(agentReview as unknown as Review);

    // Emit audit events
    await auditRepository.recordBatch([
      createAuditEvent({
        eventType: AuditEventType.REVIEW_INVITATION_SENT,
        actorType: AuditActorType.SYSTEM,
        targetType: 'REVIEW',
        targetId: travelerReview.id,
        reviewId: travelerReview.id,
        agentId: context.agentId,
        travelerId: context.travelerId,
        bookingId: context.bookingId,
        newState: { status: ReviewStatus.PENDING_SUBMISSION },
        metadata: { recipientType: ReviewerType.TRAVELER },
      }),
      createAuditEvent({
        eventType: AuditEventType.REVIEW_INVITATION_SENT,
        actorType: AuditActorType.SYSTEM,
        targetType: 'REVIEW',
        targetId: agentReview.id,
        reviewId: agentReview.id,
        agentId: context.agentId,
        travelerId: context.travelerId,
        bookingId: context.bookingId,
        newState: { status: ReviewStatus.PENDING_SUBMISSION },
        metadata: { recipientType: ReviewerType.AGENT },
      }),
    ]);

    return {
      success: true,
      data: {
        travelerReviewId: travelerReview.id,
        agentReviewId: agentReview.id,
      },
    };
  },

  /**
   * Save a review draft (user can continue editing)
   */
  async saveDraft(
    reviewId: string,
    userId: string,
    updates: Partial<Pick<Review, 'ratings' | 'title' | 'content'>>
  ): Promise<ReviewServiceResult<Review>> {
    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      return {
        success: false,
        error: { code: ErrorCodes.REVIEW_NOT_FOUND, message: 'Review not found' },
      };
    }

    if (review.reviewerId !== userId) {
      return {
        success: false,
        error: { code: ErrorCodes.NOT_AUTHORIZED, message: 'Not authorized to edit this review' },
      };
    }

    if (!isWithinSubmissionWindow(review)) {
      return {
        success: false,
        error: { code: ErrorCodes.SUBMISSION_WINDOW_EXPIRED, message: 'Review submission window has expired' },
      };
    }

    if (review.status !== ReviewStatus.PENDING_SUBMISSION && review.status !== ReviewStatus.DRAFT) {
      return {
        success: false,
        error: { 
          code: ErrorCodes.INVALID_STATE_TRANSITION, 
          message: `Cannot save draft when status is ${review.status}`,
        },
      };
    }

    const previousState = { status: review.status, ratings: review.ratings, content: review.content };

    const updatedReview = await reviewRepository.update(review.id, {
      ...updates,
      status: ReviewStatus.DRAFT,
    });

    // Emit audit event
    await auditRepository.record(createAuditEvent({
      eventType: review.status === ReviewStatus.PENDING_SUBMISSION 
        ? AuditEventType.REVIEW_DRAFT_CREATED 
        : AuditEventType.REVIEW_DRAFT_UPDATED,
      actorType: AuditActorType.USER,
      actorId: userId,
      targetType: 'REVIEW',
      targetId: review.id,
      reviewId: review.id,
      agentId: review.subjectType === ReviewerType.AGENT ? review.subjectId : review.reviewerId,
      travelerId: review.subjectType === ReviewerType.TRAVELER ? review.subjectId : review.reviewerId,
      bookingId: review.bookingId,
      previousState,
      newState: { status: ReviewStatus.DRAFT, ratings: updates.ratings, content: updates.content },
    }));

    return { success: true, data: updatedReview };
  },

  /**
   * Submit a review for publication
   */
  async submitReview(
    input: SubmitReviewInput,
    userId: string
  ): Promise<ReviewServiceResult<Review>> {
    const review = await reviewRepository.findById(input.reviewId);

    if (!review) {
      return {
        success: false,
        error: { code: ErrorCodes.REVIEW_NOT_FOUND, message: 'Review not found' },
      };
    }

    if (review.reviewerId !== userId) {
      return {
        success: false,
        error: { code: ErrorCodes.NOT_AUTHORIZED, message: 'Not authorized to submit this review' },
      };
    }

    if (!isWithinSubmissionWindow(review)) {
      return {
        success: false,
        error: { code: ErrorCodes.SUBMISSION_WINDOW_EXPIRED, message: 'Review submission window has expired' },
      };
    }

    const validStatuses = [ReviewStatus.PENDING_SUBMISSION, ReviewStatus.DRAFT];
    if (!validStatuses.includes(review.status)) {
      return {
        success: false,
        error: { 
          code: ErrorCodes.REVIEW_ALREADY_SUBMITTED, 
          message: 'Review has already been submitted',
        },
      };
    }

    // Validate content length
    if (input.content.length < 20) {
      return {
        success: false,
        error: { 
          code: ErrorCodes.CONTENT_TOO_SHORT, 
          message: 'Review content must be at least 20 characters',
        },
      };
    }

    const previousState = { status: review.status };

    // Update review with submitted content
    let updatedReview = await reviewRepository.updateStatus(
      review.id,
      review.version,
      ReviewStatus.SUBMITTED,
      {
        ratings: input.ratings,
        title: input.title,
        content: input.content,
      }
    );

    // Emit submission audit event
    await auditRepository.record(createAuditEvent({
      eventType: AuditEventType.REVIEW_SUBMITTED,
      actorType: AuditActorType.USER,
      actorId: userId,
      targetType: 'REVIEW',
      targetId: review.id,
      reviewId: review.id,
      agentId: review.subjectType === ReviewerType.AGENT ? review.subjectId : review.reviewerId,
      travelerId: review.subjectType === ReviewerType.TRAVELER ? review.subjectId : review.reviewerId,
      bookingId: review.bookingId,
      previousState,
      newState: { status: ReviewStatus.SUBMITTED, ratings: input.ratings },
    }));

    // Run gaming detection
    const gamingResult = await gamingDetectionService.analyzeReview(updatedReview);

    // Update review with gaming score
    updatedReview = await reviewRepository.update(review.id, {
      gamingScore: gamingResult.overallScore,
      gamingFlags: gamingResult.signals.map(s => s.type),
    });

    // Handle based on gaming detection result
    if (gamingResult.recommendation === GamingRecommendation.REJECT) {
      updatedReview = await reviewRepository.updateStatus(
        review.id,
        updatedReview.version,
        ReviewStatus.REJECTED,
        {
          moderation: {
            decision: ModerationDecision.REJECTED_GAMING,
            confidence: gamingResult.overallScore,
            flags: gamingResult.signals.map(s => s.type),
            moderatedAt: new Date(),
            moderatedBy: 'SYSTEM',
            reason: 'Automated gaming detection',
          },
        }
      );

      await auditRepository.record(createAuditEvent({
        eventType: AuditEventType.GAMING_ALERT_TRIGGERED,
        actorType: AuditActorType.SYSTEM,
        targetType: 'REVIEW',
        targetId: review.id,
        reviewId: review.id,
        agentId: review.subjectType === ReviewerType.AGENT ? review.subjectId : review.reviewerId,
        bookingId: review.bookingId,
        metadata: { gamingScore: gamingResult.overallScore, signals: gamingResult.signals },
      }));

      return {
        success: false,
        error: { 
          code: ErrorCodes.GAMING_DETECTED, 
          message: 'Review flagged by automated systems',
        },
      };
    }

    // Auto-publish if gaming score is low, otherwise queue for moderation
    if (gamingResult.overallScore < 0.3) {
      updatedReview = await this.publishReview(review.id);
    } else {
      updatedReview = await reviewRepository.updateStatus(
        review.id,
        updatedReview.version,
        ReviewStatus.UNDER_MODERATION
      );

      await auditRepository.record(createAuditEvent({
        eventType: AuditEventType.REVIEW_MODERATION_STARTED,
        actorType: AuditActorType.SYSTEM,
        targetType: 'REVIEW',
        targetId: review.id,
        reviewId: review.id,
        metadata: { reason: 'Gaming score above threshold', gamingScore: gamingResult.overallScore },
      }));
    }

    return { success: true, data: updatedReview };
  },

  /**
   * Publish a review (internal use after moderation passes)
   */
  async publishReview(reviewId: string): Promise<Review> {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw new Error('Review not found');

    const updatedReview = await reviewRepository.updateStatus(
      reviewId,
      review.version,
      ReviewStatus.PUBLISHED
    );

    await auditRepository.record(createAuditEvent({
      eventType: AuditEventType.REVIEW_PUBLISHED,
      actorType: AuditActorType.SYSTEM,
      targetType: 'REVIEW',
      targetId: reviewId,
      reviewId,
      agentId: review.subjectType === ReviewerType.AGENT ? review.subjectId : review.reviewerId,
      travelerId: review.subjectType === ReviewerType.TRAVELER ? review.subjectId : review.reviewerId,
      bookingId: review.bookingId,
      previousState: { status: review.status },
      newState: { status: ReviewStatus.PUBLISHED },
    }));

    // Trigger score recalculation for the subject
    if (review.subjectType === ReviewerType.AGENT) {
      // Score recalculation would be triggered via event
      // This is just a placeholder - actual implementation would emit an event
    }

    return updatedReview;
  },

  /**
   * Admin: Moderate a review
   */
  async moderateReview(input: ModerationInput): Promise<ReviewServiceResult<Review>> {
    const review = await reviewRepository.findById(input.reviewId);

    if (!review) {
      return {
        success: false,
        error: { code: ErrorCodes.REVIEW_NOT_FOUND, message: 'Review not found' },
      };
    }

    if (!canBeModerated(review)) {
      return {
        success: false,
        error: { 
          code: ErrorCodes.ALREADY_MODERATED, 
          message: `Cannot moderate review in status ${review.status}`,
        },
      };
    }

    const previousState = { status: review.status, moderation: review.moderation };

    let newStatus: ReviewStatus;
    let moderationDecision: ModerationDecision;

    switch (input.decision) {
      case 'APPROVE':
        newStatus = ReviewStatus.PUBLISHED;
        moderationDecision = ModerationDecision.APPROVED;
        break;
      case 'REJECT':
        newStatus = ReviewStatus.REJECTED;
        moderationDecision = this.mapRejectionCategory(input.rejectionCategory);
        break;
      case 'REQUIRE_EDIT':
        newStatus = ReviewStatus.DRAFT;  // Send back to draft for editing
        moderationDecision = ModerationDecision.REQUIRES_MANUAL_REVIEW;
        break;
      default:
        throw new Error(`Unknown moderation decision: ${input.decision}`);
    }

    const moderation: ModerationResult = {
      decision: moderationDecision,
      confidence: 1.0,
      flags: input.rejectionCategory ? [input.rejectionCategory] : [],
      moderatedAt: new Date(),
      moderatedBy: input.adminId,
      reason: input.reason,
    };

    const updatedReview = await reviewRepository.updateStatus(
      review.id,
      review.version,
      newStatus,
      { moderation }
    );

    // Create audit event
    const auditEvent = createAuditEvent({
      eventType: AuditEventType.REVIEW_MODERATION_COMPLETED,
      actorType: AuditActorType.ADMIN,
      actorId: input.adminId,
      targetType: 'REVIEW',
      targetId: review.id,
      reviewId: review.id,
      agentId: review.subjectType === ReviewerType.AGENT ? review.subjectId : review.reviewerId,
      travelerId: review.subjectType === ReviewerType.TRAVELER ? review.subjectId : review.reviewerId,
      bookingId: review.bookingId,
      previousState,
      newState: { status: newStatus, moderation },
      adminReason: input.reason,
    });

    // Validate admin audit event has required reason
    validateAdminAuditEvent(auditEvent);
    await auditRepository.record(auditEvent);

    // If published, also emit publish event
    if (newStatus === ReviewStatus.PUBLISHED) {
      await auditRepository.record(createAuditEvent({
        eventType: AuditEventType.REVIEW_PUBLISHED,
        actorType: AuditActorType.ADMIN,
        actorId: input.adminId,
        targetType: 'REVIEW',
        targetId: review.id,
        reviewId: review.id,
        bookingId: review.bookingId,
        adminReason: input.reason,
      }));
    }

    return { success: true, data: updatedReview };
  },

  /**
   * Admin: Hide a published review
   */
  async hideReview(
    reviewId: string,
    adminId: string,
    reason: string
  ): Promise<ReviewServiceResult<Review>> {
    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      return {
        success: false,
        error: { code: ErrorCodes.REVIEW_NOT_FOUND, message: 'Review not found' },
      };
    }

    if (review.status !== ReviewStatus.PUBLISHED) {
      return {
        success: false,
        error: { 
          code: ErrorCodes.INVALID_STATE_TRANSITION, 
          message: 'Only published reviews can be hidden',
        },
      };
    }

    const previousState = { status: review.status };

    const updatedReview = await reviewRepository.updateStatus(
      review.id,
      review.version,
      ReviewStatus.HIDDEN
    );

    const auditEvent = createAuditEvent({
      eventType: AuditEventType.REVIEW_HIDDEN,
      actorType: AuditActorType.ADMIN,
      actorId: adminId,
      targetType: 'REVIEW',
      targetId: review.id,
      reviewId: review.id,
      bookingId: review.bookingId,
      previousState,
      newState: { status: ReviewStatus.HIDDEN },
      adminReason: reason,
    });

    validateAdminAuditEvent(auditEvent);
    await auditRepository.record(auditEvent);

    return { success: true, data: updatedReview };
  },

  /**
   * Admin: Unhide a hidden review
   */
  async unhideReview(
    reviewId: string,
    adminId: string,
    reason: string
  ): Promise<ReviewServiceResult<Review>> {
    const review = await reviewRepository.findById(reviewId);

    if (!review) {
      return {
        success: false,
        error: { code: ErrorCodes.REVIEW_NOT_FOUND, message: 'Review not found' },
      };
    }

    if (review.status !== ReviewStatus.HIDDEN) {
      return {
        success: false,
        error: { 
          code: ErrorCodes.INVALID_STATE_TRANSITION, 
          message: 'Only hidden reviews can be unhidden',
        },
      };
    }

    const previousState = { status: review.status };

    const updatedReview = await reviewRepository.updateStatus(
      review.id,
      review.version,
      ReviewStatus.PUBLISHED
    );

    const auditEvent = createAuditEvent({
      eventType: AuditEventType.REVIEW_UNHIDDEN,
      actorType: AuditActorType.ADMIN,
      actorId: adminId,
      targetType: 'REVIEW',
      targetId: review.id,
      reviewId: review.id,
      bookingId: review.bookingId,
      previousState,
      newState: { status: ReviewStatus.PUBLISHED },
      adminReason: reason,
    });

    validateAdminAuditEvent(auditEvent);
    await auditRepository.record(auditEvent);

    return { success: true, data: updatedReview };
  },

  /**
   * Expire reviews past their submission deadline (scheduled job)
   */
  async expireOverdueReviews(): Promise<number> {
    const expiredReviews = await reviewRepository.findExpiredPendingReviews();

    if (expiredReviews.length === 0) return 0;

    const expiredIds = expiredReviews.map(r => r.id);
    const expiredCount = await reviewRepository.bulkExpire(expiredIds);

    // Record audit events for all expired reviews
    const auditEvents = expiredReviews.map(review => 
      createAuditEvent({
        eventType: AuditEventType.REVIEW_EXPIRED,
        actorType: AuditActorType.SCHEDULER,
        targetType: 'REVIEW',
        targetId: review.id,
        reviewId: review.id,
        bookingId: review.bookingId,
        previousState: { status: review.status },
        newState: { status: ReviewStatus.EXPIRED },
        metadata: { submissionDeadline: review.submissionDeadline.toISOString() },
      })
    );

    await auditRepository.recordBatch(auditEvents);

    return expiredCount;
  },

  /**
   * Map rejection category string to ModerationDecision enum
   */
  mapRejectionCategory(category?: string): ModerationDecision {
    switch (category) {
      case 'PROFANITY': return ModerationDecision.REJECTED_PROFANITY;
      case 'PII': return ModerationDecision.REJECTED_PII;
      case 'SPAM': return ModerationDecision.REJECTED_SPAM;
      case 'GAMING': return ModerationDecision.REJECTED_GAMING;
      case 'OFF_TOPIC': return ModerationDecision.REJECTED_OFF_TOPIC;
      default: return ModerationDecision.REQUIRES_MANUAL_REVIEW;
    }
  },
};

export type ReviewService = typeof reviewService;
