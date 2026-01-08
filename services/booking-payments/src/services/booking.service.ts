/**
 * Booking Service
 *
 * Core business logic for booking operations.
 * Orchestrates state machine transitions and event emission.
 */

import { v4 as uuid } from 'uuid';
import pg from 'pg';
import { logger } from './logger.service.js';
import { feeCalculator } from './fee-calculator.service.js';
import { auditService } from './audit.service.js';
import { eventPublisher } from '../events/publisher.js';
import { idempotencyStore } from '../utils/idempotency.js';
import { config } from '../env.js';
import {
  BookingState,
  CancellationReason,
  isValidBookingTransition,
} from '../types/booking.types.js';
import { PaymentState } from '../types/payment.types.js';
import type {
  Booking,
  CreateBookingDTO,
  BookingResponseDTO,
  CancelBookingDTO,
  BookingTransitionResult,
} from '../types/booking.types.js';
import type { EventMetadata } from '../types/events.types.js';

const { Pool } = pg;

// Database connection pool for bookings queries
const pool = new Pool({
  connectionString: config.database.databaseUrl,
});

/** Booking service for managing booking lifecycle */
class BookingService {
  /**
   * Create a new booking.
   * Uses idempotency key to prevent duplicate bookings.
   */
  async createBooking(
    dto: CreateBookingDTO,
    metadata: EventMetadata
  ): Promise<Booking | { error: string }> {
    // Check idempotency
    const existing = await idempotencyStore.get(dto.idempotencyKey);
    if (existing) {
      logger.info(
        { idempotencyKey: dto.idempotencyKey },
        'Returning cached booking'
      );
      return existing as Booking;
    }

    // Validate price
    const priceValidation = feeCalculator.validatePrice(dto.basePriceCents);
    if (!priceValidation.valid) {
      return { error: priceValidation.error! };
    }

    // Calculate fees
    const fees = feeCalculator.calculate(dto.basePriceCents);

    const bookingId = uuid();
    const now = new Date();

    const booking: Booking = {
      id: bookingId,
      userId: dto.userId,
      agentId: dto.agentId,
      itineraryId: dto.itineraryId,
      state: BookingState.PENDING_PAYMENT,
      paymentState: PaymentState.NOT_STARTED,

      tripStartDate: new Date(dto.tripStartDate),
      tripEndDate: new Date(dto.tripEndDate),
      destinationCity: dto.destinationCity,
      destinationCountry: dto.destinationCountry,
      travelerCount: dto.travelerCount,

      basePriceCents: fees.basePriceCents,
      bookingFeeCents: fees.bookingFeeCents,
      platformCommissionCents: fees.platformCommissionCents,
      totalAmountCents: fees.totalAmountCents,
      agentPayoutCents: fees.agentPayoutCents,

      // Generic payment provider fields
      paymentIntentId: null,
      checkoutSessionId: null,
      chargeId: null,
      // Deprecated Stripe-specific fields (kept for backward compatibility)
      stripePaymentIntentId: null,
      stripeCheckoutSessionId: null,
      stripeChargeId: null,

      cancellationReason: null,
      cancelledAt: null,
      cancelledBy: null,
      agentConfirmedAt: null,
      tripStartedAt: null,
      tripCompletedAt: null,
      settledAt: null,

      escrowReleasedAt: null,
      escrowReleaseEligibleAt: null,

      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Cache for idempotency
    await idempotencyStore.set(dto.idempotencyKey, booking);

    // Emit booking created event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'booking.created',
      timestamp: now.toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: bookingId,
      payload: {
        bookingId,
        userId: dto.userId,
        agentId: dto.agentId,
        itineraryId: dto.itineraryId,
        basePriceCents: fees.basePriceCents,
        totalAmountCents: fees.totalAmountCents,
        tripStartDate: dto.tripStartDate,
        tripEndDate: dto.tripEndDate,
      },
      metadata,
    });

    logger.info(
      {
        bookingId,
        userId: dto.userId,
        agentId: dto.agentId,
        totalAmountCents: fees.totalAmountCents,
      },
      'Booking created'
    );

    return booking;
  }

  /**
   * Transition booking to a new state.
   * Validates transition and emits audit event.
   */
  async transitionState(params: {
    booking: Booking;
    targetState: BookingState;
    metadata: EventMetadata;
    reason?: string;
  }): Promise<BookingTransitionResult> {
    const { booking, targetState, metadata, reason } = params;

    // Validate transition
    if (!isValidBookingTransition(booking.state, targetState)) {
      logger.warn(
        {
          bookingId: booking.id,
          currentState: booking.state,
          targetState,
        },
        'Invalid state transition attempted'
      );
      return {
        success: false,
        booking: null,
        previousState: booking.state,
        newState: null,
        error: `Invalid transition from ${booking.state} to ${targetState}`,
      };
    }

    const previousState = booking.state;

    // Record state change
    await auditService.recordStateChange({
      bookingId: booking.id,
      entityType: 'booking',
      previousState,
      newState: targetState,
      metadata: reason ? { ...metadata, reason } : metadata,
    });

    // Emit state changed event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'booking.state_changed',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: booking.id,
      payload: {
        bookingId: booking.id,
        previousState,
        newState: targetState,
        ...(reason && { reason }),
      },
      metadata,
    });

    logger.info(
      {
        bookingId: booking.id,
        previousState,
        newState: targetState,
      },
      'Booking state transitioned'
    );

    // Create updated booking
    const updatedBooking: Booking = {
      ...booking,
      state: targetState,
      updatedAt: new Date(),
      version: booking.version + 1,
    };

    return {
      success: true,
      booking: updatedBooking,
      previousState,
      newState: targetState,
    };
  }

  /**
   * Cancel a booking.
   * Determines refund eligibility based on state.
   */
  async cancelBooking(
    dto: CancelBookingDTO,
    booking: Booking,
    metadata: EventMetadata
  ): Promise<BookingTransitionResult & { refundEligible: boolean }> {
    // Check if cancellation is allowed from current state
    if (!isValidBookingTransition(booking.state, BookingState.CANCELLED)) {
      return {
        success: false,
        booking: null,
        previousState: booking.state,
        newState: null,
        error: `Cannot cancel booking in state ${booking.state}`,
        refundEligible: false,
      };
    }

    // Determine refund eligibility
    const refundEligible = this.isRefundEligibleOnCancel(booking, dto.reason);

    // Transition to cancelled
    const result = await this.transitionState({
      booking,
      targetState: BookingState.CANCELLED,
      metadata: {
        ...metadata,
        reason: dto.adminReason ?? dto.reason,
      },
    });

    if (!result.success || !result.booking) {
      return { ...result, refundEligible: false };
    }

    // Update booking with cancellation details
    const cancelledBooking: Booking = {
      ...result.booking,
      cancellationReason: dto.reason,
      cancelledAt: new Date(),
      cancelledBy: dto.cancelledBy,
    };

    // Emit cancellation event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'booking.cancelled',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: booking.id,
      payload: {
        bookingId: booking.id,
        userId: booking.userId,
        agentId: booking.agentId,
        cancellationReason: dto.reason,
        cancelledBy: dto.cancelledBy,
        refundEligible,
      },
      metadata,
    });

    logger.info(
      {
        bookingId: booking.id,
        reason: dto.reason,
        cancelledBy: dto.cancelledBy,
        refundEligible,
      },
      'Booking cancelled'
    );

    return {
      success: true,
      booking: cancelledBooking,
      previousState: result.previousState,
      newState: BookingState.CANCELLED,
      refundEligible,
    };
  }

  /**
   * Record agent confirmation.
   * Full agent identity is revealed ONLY after this.
   */
  async confirmByAgent(
    booking: Booking,
    metadata: EventMetadata
  ): Promise<BookingTransitionResult> {
    const result = await this.transitionState({
      booking,
      targetState: BookingState.AGENT_CONFIRMED,
      metadata,
    });

    if (!result.success || !result.booking) {
      return result;
    }

    const confirmedBooking: Booking = {
      ...result.booking,
      agentConfirmedAt: new Date(),
    };

    // Emit confirmation event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'booking.agent_confirmed',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: booking.id,
      payload: {
        bookingId: booking.id,
        userId: booking.userId,
        agentId: booking.agentId,
        confirmedAt: confirmedBooking.agentConfirmedAt!.toISOString(),
      },
      metadata,
    });

    logger.info(
      {
        bookingId: booking.id,
        agentId: booking.agentId,
      },
      'Booking confirmed by agent'
    );

    return {
      ...result,
      booking: confirmedBooking,
    };
  }

  /**
   * Mark trip as completed.
   * Starts escrow release countdown.
   */
  async completeTrip(
    booking: Booking,
    metadata: EventMetadata
  ): Promise<BookingTransitionResult> {
    const result = await this.transitionState({
      booking,
      targetState: BookingState.COMPLETED,
      metadata,
    });

    if (!result.success || !result.booking) {
      return result;
    }

    const completedBooking: Booking = {
      ...result.booking,
      tripCompletedAt: new Date(),
    };

    // Emit completion event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'booking.completed',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: booking.id,
      payload: {
        bookingId: booking.id,
        userId: booking.userId,
        agentId: booking.agentId,
        completedAt: completedBooking.tripCompletedAt!.toISOString(),
        escrowReleaseDate: '', // Will be set by escrow service
      },
      metadata,
    });

    logger.info(
      {
        bookingId: booking.id,
      },
      'Trip completed'
    );

    return {
      ...result,
      booking: completedBooking,
    };
  }

  /**
   * Convert booking entity to response DTO.
   * Omits sensitive fields based on state.
   */
  toResponseDTO(booking: Booking): BookingResponseDTO {
    const dto: BookingResponseDTO = {
      id: booking.id,
      userId: booking.userId,
      agentId: booking.agentId,
      itineraryId: booking.itineraryId,
      state: booking.state,
      paymentState: booking.paymentState,
      tripStartDate: booking.tripStartDate.toISOString(),
      tripEndDate: booking.tripEndDate.toISOString(),
      destinationCity: booking.destinationCity,
      destinationCountry: booking.destinationCountry,
      travelerCount: booking.travelerCount,
      basePriceCents: booking.basePriceCents,
      bookingFeeCents: booking.bookingFeeCents,
      platformCommissionCents: booking.platformCommissionCents,
      totalAmountCents: booking.totalAmountCents,
      agentPayoutCents: booking.agentPayoutCents,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };

    // Include optional fields based on state
    if (booking.agentConfirmedAt) {
      (dto as { agentConfirmedAt?: string }).agentConfirmedAt =
        booking.agentConfirmedAt.toISOString();
    }

    if (booking.tripCompletedAt) {
      (dto as { tripCompletedAt?: string }).tripCompletedAt =
        booking.tripCompletedAt.toISOString();
    }

    if (booking.cancelledAt) {
      (dto as { cancelledAt?: string }).cancelledAt =
        booking.cancelledAt.toISOString();
      (dto as { cancellationReason?: CancellationReason }).cancellationReason =
        booking.cancellationReason!;
    }

    return dto;
  }

  /**
   * Determine if a cancelled booking is eligible for refund.
   */
  private isRefundEligibleOnCancel(
    booking: Booking,
    reason: CancellationReason
  ): boolean {
    // Agent-initiated cancellations are always refundable
    if (
      reason === CancellationReason.AGENT_DECLINED ||
      reason === CancellationReason.AGENT_UNAVAILABLE
    ) {
      return true;
    }

    // Payment failures don't need refunds (never charged)
    if (reason === CancellationReason.PAYMENT_FAILED) {
      return false;
    }

    // Expired bookings before payment don't need refunds
    if (
      reason === CancellationReason.EXPIRED &&
      booking.state === BookingState.PENDING_PAYMENT
    ) {
      return false;
    }

    // User cancellations depend on state
    if (reason === CancellationReason.USER_REQUESTED) {
      // Before agent confirmation = full refund minus fee
      if (
        booking.state === BookingState.PAYMENT_CONFIRMED ||
        booking.state === BookingState.PENDING_PAYMENT
      ) {
        return true;
      }
      // After agent confirmation = partial refund
      return booking.agentConfirmedAt !== null;
    }

    // Admin cancellations are handled case by case
    return reason === CancellationReason.ADMIN_CANCELLED;
  }

  /**
   * List bookings for a user.
   * Agents see bookings where they are the agent.
   * Users see their own bookings.
   * Admins can see all bookings.
   */
  async listUserBookings(
    userId: string,
    userRole: string,
    options: { limit?: number; offset?: number; status?: string | undefined }
  ): Promise<BookingResponseDTO[]> {
    const { limit = 20, offset = 0, status } = options;

    let query = `
      SELECT 
        b.id,
        b.user_id,
        b.agent_id,
        b.itinerary_id,
        b.state,
        b.payment_state,
        b.travel_start_date,
        b.travel_end_date,
        b.base_price_cents,
        b.booking_fee_cents,
        b.platform_commission_cents,
        b.total_amount_cents,
        b.cancellation_reason,
        b.cancelled_at,
        b.confirmed_at,
        b.completed_at,
        b.created_at,
        b.updated_at
      FROM bookings b
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    // Role-based filtering
    if (userRole === 'agent') {
      params.push(userId);
      query += ` AND b.agent_id = $${params.length}`;
    } else if (userRole !== 'admin') {
      // Regular users see only their bookings
      params.push(userId);
      query += ` AND b.user_id = $${params.length}`;
    }
    // Admins see all bookings (no user filter)

    // Status filter
    if (status) {
      params.push(status.toUpperCase());
      query += ` AND b.state = $${params.length}`;
    }

    // Ordering and pagination
    query += ` ORDER BY b.created_at DESC`;
    params.push(limit);
    query += ` LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    try {
      const result = await pool.query(query, params);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        agentId: row.agent_id,
        itineraryId: row.itinerary_id,
        state: row.state,
        paymentState: row.payment_state,
        tripStartDate: row.travel_start_date?.toISOString?.() || row.travel_start_date,
        tripEndDate: row.travel_end_date?.toISOString?.() || row.travel_end_date,
        destinationCity: null, // Column doesn't exist in schema
        destinationCountry: null, // Column doesn't exist in schema
        travelerCount: null, // Column doesn't exist in schema
        basePriceCents: row.base_price_cents,
        bookingFeeCents: row.booking_fee_cents,
        platformCommissionCents: row.platform_commission_cents,
        totalAmountCents: row.total_amount_cents,
        agentPayoutCents: null, // Column doesn't exist in schema - calculated from commission
        cancellationReason: row.cancellation_reason,
        cancelledAt: row.cancelled_at?.toISOString?.() || row.cancelled_at,
        agentConfirmedAt: row.confirmed_at?.toISOString?.() || row.confirmed_at,
        tripCompletedAt: row.completed_at?.toISOString?.() || row.completed_at,
        createdAt: row.created_at?.toISOString?.() || row.created_at,
        updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error({ error: errorMessage, stack: errorStack }, 'Failed to list user bookings');
      // Return empty array instead of throwing to avoid breaking the UI
      return [];
    }
  }
}

export const bookingService = new BookingService();
