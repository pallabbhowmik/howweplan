/**
 * Escrow Service
 *
 * Manages the escrow-light state machine for holding funds
 * between payment confirmation and trip completion.
 *
 * Funds are held for a configurable period (default 14 days)
 * after trip completion before release to agent.
 */

import { config } from '../env.js';
import { logger } from './logger.service.js';
import { auditService } from './audit.service.js';
import { eventPublisher } from '../events/publisher.js';
import type { EventMetadata } from '../types/events.types.js';

/** Escrow status */
export const EscrowStatus = {
  NOT_STARTED: 'NOT_STARTED',
  HOLDING: 'HOLDING',
  PENDING_RELEASE: 'PENDING_RELEASE',
  RELEASED: 'RELEASED',
  CANCELLED: 'CANCELLED',
} as const;

export type EscrowStatus = (typeof EscrowStatus)[keyof typeof EscrowStatus];

/** Escrow record */
export interface EscrowRecord {
  readonly id: string;
  readonly bookingId: string;
  readonly paymentId: string;
  readonly agentId: string;
  readonly amountCents: number;
  readonly platformCommissionCents: number;
  readonly agentPayoutCents: number;
  readonly status: EscrowStatus;
  readonly holdStartedAt: Date | null;
  readonly releaseEligibleAt: Date | null;
  readonly releasedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly stripeChargeId: string;
  readonly stripeTransferId: string | null;
}

/** Escrow service for managing fund holds */
class EscrowService {
  private readonly holdDays: number;

  constructor() {
    this.holdDays = config.limits.escrowHoldDays;
  }

  /**
   * Calculate when funds become eligible for release.
   * Default: 14 days after trip completion.
   */
  calculateReleaseDate(tripCompletedAt: Date): Date {
    const releaseDate = new Date(tripCompletedAt);
    releaseDate.setDate(releaseDate.getDate() + this.holdDays);
    return releaseDate;
  }

  /**
   * Start escrow hold after payment confirmation.
   */
  async startHold(params: {
    escrowId: string;
    bookingId: string;
    paymentId: string;
    agentId: string;
    amountCents: number;
    platformCommissionCents: number;
    stripeChargeId: string;
    metadata: EventMetadata;
  }): Promise<EscrowRecord> {
    const agentPayoutCents = params.amountCents - params.platformCommissionCents;
    const now = new Date();

    const record: EscrowRecord = {
      id: params.escrowId,
      bookingId: params.bookingId,
      paymentId: params.paymentId,
      agentId: params.agentId,
      amountCents: params.amountCents,
      platformCommissionCents: params.platformCommissionCents,
      agentPayoutCents,
      status: EscrowStatus.HOLDING,
      holdStartedAt: now,
      releaseEligibleAt: null,
      releasedAt: null,
      cancelledAt: null,
      stripeChargeId: params.stripeChargeId,
      stripeTransferId: null,
    };

    // Record the money movement
    await auditService.recordMoneyMovement({
      bookingId: params.bookingId,
      paymentId: params.paymentId,
      movementType: 'escrow_hold',
      amountCents: params.amountCents,
      fromAccount: 'stripe_customer',
      toAccount: 'platform_escrow',
      stripeTransactionId: params.stripeChargeId,
      metadata: params.metadata,
    });

    // Emit event
    await eventPublisher.publish({
      eventId: params.escrowId,
      eventType: 'escrow.started',
      timestamp: now.toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: params.bookingId,
      payload: {
        bookingId: params.bookingId,
        paymentId: params.paymentId,
        amountCents: params.amountCents,
        releaseDate: 'pending_trip_completion',
      },
      metadata: params.metadata,
    });

    logger.info(
      {
        escrowId: params.escrowId,
        bookingId: params.bookingId,
        amountCents: params.amountCents,
      },
      'Escrow hold started'
    );

    return record;
  }

  /**
   * Update escrow release date after trip completion.
   */
  scheduleRelease(params: {
    escrowId: string;
    bookingId: string;
    tripCompletedAt: Date;
    metadata: EventMetadata;
  }): Promise<Date> {
    const releaseDate = this.calculateReleaseDate(params.tripCompletedAt);

    logger.info(
      {
        escrowId: params.escrowId,
        bookingId: params.bookingId,
        releaseDate: releaseDate.toISOString(),
      },
      'Escrow release scheduled'
    );

    return Promise.resolve(releaseDate);
  }

  /**
   * Release funds from escrow to agent.
   * Called after hold period expires and no disputes.
   */
  async releaseFunds(params: {
    escrow: EscrowRecord;
    metadata: EventMetadata;
  }): Promise<void> {
    const { escrow, metadata } = params;

    if (escrow.status !== EscrowStatus.HOLDING && escrow.status !== EscrowStatus.PENDING_RELEASE) {
      throw new Error(`Cannot release escrow in status: ${escrow.status}`);
    }

    // Record commission
    await auditService.recordMoneyMovement({
      bookingId: escrow.bookingId,
      paymentId: escrow.paymentId,
      movementType: 'commission',
      amountCents: escrow.platformCommissionCents,
      fromAccount: 'platform_escrow',
      toAccount: 'platform_revenue',
      stripeTransactionId: escrow.stripeChargeId,
      metadata,
    });

    // Record agent payout
    await auditService.recordMoneyMovement({
      bookingId: escrow.bookingId,
      paymentId: escrow.paymentId,
      movementType: 'payout',
      amountCents: escrow.agentPayoutCents,
      fromAccount: 'platform_escrow',
      toAccount: `agent_${escrow.agentId}`,
      stripeTransactionId: escrow.stripeChargeId,
      metadata,
    });

    // Emit release event
    await eventPublisher.publish({
      eventId: `${escrow.id}_release`,
      eventType: 'escrow.released',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: escrow.bookingId,
      payload: {
        bookingId: escrow.bookingId,
        paymentId: escrow.paymentId,
        agentId: escrow.agentId,
        amountCents: escrow.amountCents,
        platformCommissionCents: escrow.platformCommissionCents,
        agentPayoutCents: escrow.agentPayoutCents,
      },
      metadata,
    });

    logger.info(
      {
        escrowId: escrow.id,
        bookingId: escrow.bookingId,
        agentId: escrow.agentId,
        agentPayoutCents: escrow.agentPayoutCents,
        platformCommissionCents: escrow.platformCommissionCents,
      },
      'Escrow funds released'
    );
  }

  /**
   * Cancel escrow and prepare for refund.
   * Called when booking is cancelled or disputed.
   */
  async cancelHold(params: {
    escrow: EscrowRecord;
    reason: string;
    metadata: EventMetadata;
  }): Promise<void> {
    const { escrow, reason, metadata } = params;

    if (escrow.status === EscrowStatus.RELEASED) {
      throw new Error('Cannot cancel already released escrow');
    }

    logger.info(
      {
        escrowId: escrow.id,
        bookingId: escrow.bookingId,
        reason,
      },
      'Escrow hold cancelled'
    );

    // Audit the cancellation
    await auditService.recordStateChange({
      bookingId: escrow.bookingId,
      paymentId: escrow.paymentId,
      entityType: 'payment',
      previousState: escrow.status,
      newState: EscrowStatus.CANCELLED,
      metadata: {
        ...metadata,
        reason,
      },
    });
  }

  /**
   * Check if escrow is eligible for release.
   */
  isEligibleForRelease(escrow: EscrowRecord): boolean {
    if (escrow.status !== EscrowStatus.HOLDING && escrow.status !== EscrowStatus.PENDING_RELEASE) {
      return false;
    }

    if (!escrow.releaseEligibleAt) {
      return false;
    }

    return new Date() >= escrow.releaseEligibleAt;
  }
}

export const escrowService = new EscrowService();
