/**
 * Refund Service
 *
 * Handles refund requests with strict enforcement:
 * - SUBJECTIVE COMPLAINTS ARE NEVER REFUNDABLE
 * - All refunds are audited
 * - Admin approval required for certain cases
 */

import { v4 as uuid } from 'uuid';
import { config } from '../env.js';
import { logger } from './logger.service.js';
import { razorpayService } from './razorpay.service.js';
import { auditService } from './audit.service.js';
import { eventPublisher } from '../events/publisher.js';
import {
  RefundReason,
  isRefundableReason,
  requiresAdminApproval,
  SubjectiveComplaint,
} from '../types/payment.types.js';
import type {
  RefundRequest,
  CreateRefundDTO,
  RefundResponseDTO,
} from '../types/payment.types.js';
import type { EventMetadata } from '../types/events.types.js';
import {
  createRefundContext,
  calculateRefundAmount,
} from '../state-machine/refund.machine.js';

/** Refund service for processing refund requests */
class RefundService {
  private readonly refundWindowDays: number;

  constructor() {
    // Note: automaticRefundsEnabled feature flag reserved for future use
    // config.features.automaticRefunds
    this.refundWindowDays = config.limits.refundWindowDays;
  }

  /**
   * Create a refund request.
   * Validates that the reason is refundable (not subjective).
   */
  async createRefundRequest(
    dto: CreateRefundDTO,
    metadata: EventMetadata
  ): Promise<RefundResponseDTO | { error: string }> {
    // ENFORCE: Subjective complaints are NEVER refundable
    if (!isRefundableReason(dto.reason)) {
      const subjectiveTypes = Object.values(SubjectiveComplaint).join(', ');
      logger.warn(
        {
          bookingId: dto.bookingId,
          reason: dto.reason,
        },
        'Refund rejected: subjective complaint'
      );

      return {
        error: `Refund reason "${dto.reason}" is not eligible for refund. Subjective complaints (${subjectiveTypes}) are never refundable per platform policy.`,
      };
    }

    const refundId = uuid();

    // Initialize refund context (validates eligibility)
    const contextResult = createRefundContext({
      refundId,
      bookingId: dto.bookingId,
      paymentId: '', // Will be populated from booking lookup
      requestedBy: dto.requestedBy,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails,
      amountCents: dto.amountCents ?? 0, // Will be calculated if not specified
    });

    if ('error' in contextResult) {
      return { error: contextResult.error };
    }

    const needsAdmin = requiresAdminApproval(dto.reason);

    // Record the request
    const request: RefundRequest = {
      id: refundId,
      bookingId: dto.bookingId,
      paymentId: '', // Populated from booking
      requestedBy: dto.requestedBy,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails,
      amountCents: dto.amountCents ?? 0,
      requiresAdminApproval: needsAdmin,
      approvedBy: null,
      approvedAt: null,
      deniedBy: null,
      deniedAt: null,
      denialReason: null,
      processedAt: null,
      stripeRefundId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Emit refund requested event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'refund.requested',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: dto.bookingId,
      payload: {
        refundId,
        bookingId: dto.bookingId,
        paymentId: request.paymentId,
        amountCents: request.amountCents,
        reason: dto.reason,
        requiresAdminApproval: needsAdmin,
      },
      metadata,
    });

    logger.info(
      {
        refundId,
        bookingId: dto.bookingId,
        reason: dto.reason,
        requiresAdminApproval: needsAdmin,
      },
      'Refund request created'
    );

    return {
      id: refundId,
      bookingId: dto.bookingId,
      reason: dto.reason,
      amountCents: request.amountCents,
      status: needsAdmin ? 'PENDING' : 'PENDING',
      requiresAdminApproval: needsAdmin,
      createdAt: request.createdAt.toISOString(),
    };
  }

  /**
   * Approve a refund request (admin action).
   * Requires a reason for audit purposes.
   */
  async approveRefund(params: {
    refundId: string;
    bookingId: string;
    approvedBy: string;
    reason: string;
    amountCents?: number;
    metadata: EventMetadata;
  }): Promise<{ success: boolean; error?: string }> {
    // Admin actions MUST have a reason
    if (!params.reason || params.reason.trim().length === 0) {
      return { success: false, error: 'Admin approval requires a reason' };
    }

    // Record admin action
    await auditService.recordAdminAction({
      adminId: params.approvedBy,
      action: 'refund_approved',
      bookingId: params.bookingId,
      reason: params.reason,
      metadata: { refundId: params.refundId, amountCents: params.amountCents },
    });

    // Emit approval event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'refund.approved',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: params.bookingId,
      payload: {
        refundId: params.refundId,
        bookingId: params.bookingId,
        amountCents: params.amountCents ?? 0,
        approvedBy: params.approvedBy,
      },
      metadata: params.metadata,
    });

    logger.info(
      {
        refundId: params.refundId,
        bookingId: params.bookingId,
        approvedBy: params.approvedBy,
      },
      'Refund approved'
    );

    return { success: true };
  }

  /**
   * Deny a refund request (admin action).
   * Requires a reason for audit purposes.
   */
  async denyRefund(params: {
    refundId: string;
    bookingId: string;
    deniedBy: string;
    reason: string;
    metadata: EventMetadata;
  }): Promise<{ success: boolean; error?: string }> {
    // Admin actions MUST have a reason
    if (!params.reason || params.reason.trim().length === 0) {
      return { success: false, error: 'Admin denial requires a reason' };
    }

    // Record admin action
    await auditService.recordAdminAction({
      adminId: params.deniedBy,
      action: 'refund_denied',
      bookingId: params.bookingId,
      reason: params.reason,
      metadata: { refundId: params.refundId },
    });

    // Emit denial event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'refund.denied',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: params.bookingId,
      payload: {
        refundId: params.refundId,
        bookingId: params.bookingId,
        deniedBy: params.deniedBy,
        denialReason: params.reason,
      },
      metadata: params.metadata,
    });

    logger.info(
      {
        refundId: params.refundId,
        bookingId: params.bookingId,
        deniedBy: params.deniedBy,
        reason: params.reason,
      },
      'Refund denied'
    );

    return { success: true };
  }

  /**
   * Process an approved refund via Stripe.
   */
  async processRefund(params: {
    refundId: string;
    bookingId: string;
    paymentId: string;
    chargeId: string;
    amountCents: number;
    reason: RefundReason;
    metadata: EventMetadata;
  }): Promise<{ success: boolean; razorpayRefundId?: string; error?: string }> {
    const idempotencyKey = `refund_${params.refundId}`;

    try {
      const refund = await razorpayService.createRefund({
        paymentId: params.paymentId,
        amountCents: params.amountCents,
        bookingId: params.bookingId,
        refundId: params.refundId,
        idempotencyKey,
        notes: {
          reason: params.reason,
        },
      });

      // Record the money movement
      await auditService.recordMoneyMovement({
        bookingId: params.bookingId,
        paymentId: params.paymentId,
        movementType: 'refund',
        amountCents: params.amountCents,
        fromAccount: 'platform_escrow',
        toAccount: 'razorpay_customer',
        stripeTransactionId: refund.id,
        metadata: params.metadata,
      });

      // Emit refund issued event
      await eventPublisher.publish({
        eventId: uuid(),
        eventType: 'refund.issued',
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'booking-payments',
        correlationId: params.bookingId,
        payload: {
          refundId: params.refundId,
          bookingId: params.bookingId,
          paymentId: params.paymentId,
          amountCents: params.amountCents,
          razorpayRefundId: refund.id,
          isPartial: false, // Razorpay refunds are either full or partial based on amount
        },
        metadata: params.metadata,
      });

      logger.info(
        {
          refundId: params.refundId,
          bookingId: params.bookingId,
          razorpayRefundId: refund.id,
          amountCents: params.amountCents,
        },
        'Refund processed'
      );

      return { success: true, razorpayRefundId: refund.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        {
          refundId: params.refundId,
          bookingId: params.bookingId,
          error: message,
        },
        'Refund processing failed'
      );
      return { success: false, error: message };
    }
  }

  /**
   * Calculate refund amount based on reason and booking state.
   */
  calculateAmount(params: {
    reason: RefundReason;
    totalAmountCents: number;
    bookingFeeCents: number;
    agentConfirmed: boolean;
  }): { amountCents: number; isPartial: boolean } {
    return calculateRefundAmount(params);
  }

  /**
   * Check if a booking is still within the refund window.
   */
  isWithinRefundWindow(tripCompletedAt: Date): boolean {
    const now = new Date();
    const windowEnd = new Date(tripCompletedAt);
    windowEnd.setDate(windowEnd.getDate() + this.refundWindowDays);
    return now <= windowEnd;
  }
}

export const refundService = new RefundService();
