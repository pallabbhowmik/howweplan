/**
 * Payment Service
 *
 * Orchestrates payment operations including checkout,
 * confirmation, and state management.
 */

import { v4 as uuid } from 'uuid';
import { logger } from './logger.service.js';
import { razorpayService } from './razorpay.service.js';
import { feeCalculator } from './fee-calculator.service.js';
import { escrowService } from './escrow.service.js';
import { auditService } from './audit.service.js';
import { eventPublisher } from '../events/publisher.js';
import { PaymentState, isValidPaymentTransition } from '../types/payment.types.js';
import type {
  CreateCheckoutDTO,
  CheckoutSessionDTO,
} from '../types/payment.types.js';
import type { Booking } from '../types/booking.types.js';
import type { EventMetadata } from '../types/events.types.js';

/** Payment service for managing payment lifecycle */
class PaymentService {
  /**
   * Create a Razorpay order for a booking.
   * Payment MUST happen before contact release.
   */
  async createCheckout(
    dto: CreateCheckoutDTO,
    booking: Booking,
    userEmail: string,
    metadata: EventMetadata
  ): Promise<CheckoutSessionDTO | { error: string }> {
    // Validate booking state
    if (
      booking.state !== 'PENDING_PAYMENT' &&
      booking.paymentState !== PaymentState.NOT_STARTED &&
      booking.paymentState !== PaymentState.FAILED
    ) {
      return {
        error: `Cannot create checkout for booking in state ${booking.state}`,
      };
    }

    // Calculate fees
    const fees = feeCalculator.calculate(booking.basePriceCents);

    // Create Razorpay order
    const order = await razorpayService.createOrder({
      bookingId: booking.id,
      userId: booking.userId,
      userEmail,
      fees,
      idempotencyKey: dto.idempotencyKey,
      metadata: {
        agent_id: booking.agentId,
        itinerary_id: booking.itineraryId,
      },
    });

    // Emit payment initiated event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'payment.initiated',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: booking.id,
      payload: {
        bookingId: booking.id,
        paymentId: uuid(),
        amountCents: fees.totalAmountCents,
        razorpayOrderId: order.orderId,
      },
      metadata,
    });

    logger.info(
      {
        bookingId: booking.id,
        orderId: order.orderId,
        amountCents: fees.totalAmountCents,
      },
      'Razorpay order created'
    );

    return {
      sessionId: order.orderId,
      checkoutUrl: dto.successUrl, // Frontend will handle Razorpay checkout
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };
  }

  /**
   * Handle successful payment from Razorpay webhook.
   * Idempotent - safe to call multiple times with same payment.
   */
  async handlePaymentSuccess(params: {
    bookingId: string;
    paymentId: string;
    orderId: string;
    amountCents: number;
    metadata: EventMetadata;
  }): Promise<{ success: boolean; error?: string }> {
    const { bookingId, paymentId, orderId, amountCents, metadata } = params;

    // Record the successful charge
    await auditService.recordMoneyMovement({
      bookingId,
      paymentId: paymentId,
      movementType: 'charge',
      amountCents,
      fromAccount: 'razorpay_customer',
      toAccount: 'platform_razorpay',
      stripeTransactionId: paymentId,
      metadata,
    });

    // Emit payment succeeded event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'payment.succeeded',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: bookingId,
      payload: {
        bookingId,
        paymentId: paymentId,
        amountCents,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
      },
      metadata,
    });

    logger.info(
      {
        bookingId,
        paymentId,
        orderId,
        amountCents,
      },
      'Payment succeeded'
    );

    return { success: true };
  }

  /**
   * Handle failed payment from Razorpay webhook.
   */
  async handlePaymentFailure(params: {
    bookingId: string;
    paymentId: string;
    failureCode: string;
    failureMessage: string;
    amountCents: number;
    metadata: EventMetadata;
  }): Promise<void> {
    const { bookingId, paymentId, failureCode, failureMessage, amountCents, metadata } =
      params;

    // Emit payment failed event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'payment.failed',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: bookingId,
      payload: {
        bookingId,
        paymentId: paymentId,
        amountCents,
        failureCode,
        failureMessage,
      },
      metadata,
    });

    logger.warn(
      {
        bookingId,
        paymentId,
        failureCode,
        failureMessage,
      },
      'Payment failed'
    );
  }

  /**
   * Start escrow hold after payment confirmation.
   */
  async startEscrow(params: {
    booking: Booking;
    chargeId: string;
    metadata: EventMetadata;
  }): Promise<void> {
    const { booking, chargeId, metadata } = params;

    await escrowService.startHold({
      escrowId: uuid(),
      bookingId: booking.id,
      paymentId: booking.stripePaymentIntentId ?? uuid(),
      agentId: booking.agentId,
      amountCents: booking.totalAmountCents,
      platformCommissionCents: booking.platformCommissionCents,
      stripeChargeId: chargeId,
      metadata,
    });

    logger.info(
      {
        bookingId: booking.id,
        amountCents: booking.totalAmountCents,
      },
      'Escrow started'
    );
  }

  /**
   * Transition payment to a new state.
   * Validates transition and emits audit event.
   */
  async transitionState(params: {
    paymentId: string;
    bookingId: string;
    currentState: PaymentState;
    targetState: PaymentState;
    metadata: EventMetadata;
  }): Promise<{ success: boolean; error?: string }> {
    const { paymentId, bookingId, currentState, targetState, metadata } = params;

    // Validate transition
    if (!isValidPaymentTransition(currentState, targetState)) {
      logger.warn(
        {
          paymentId,
          bookingId,
          currentState,
          targetState,
        },
        'Invalid payment state transition'
      );
      return {
        success: false,
        error: `Invalid transition from ${currentState} to ${targetState}`,
      };
    }

    // Record state change
    await auditService.recordStateChange({
      bookingId,
      paymentId,
      entityType: 'payment',
      previousState: currentState,
      newState: targetState,
      metadata,
    });

    // Emit state changed event
    await eventPublisher.publish({
      eventId: uuid(),
      eventType: 'payment.state_changed',
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'booking-payments',
      correlationId: bookingId,
      payload: {
        bookingId,
        paymentId,
        previousState: currentState,
        newState: targetState,
      },
      metadata,
    });

    logger.info(
      {
        paymentId,
        bookingId,
        previousState: currentState,
        newState: targetState,
      },
      'Payment state transitioned'
    );

    return { success: true };
  }

  /**
   * Get fee breakdown for display.
   */
  getFeeBreakdown(basePriceCents: number): {
    basePrice: string;
    bookingFee: string;
    total: string;
  } {
    return feeCalculator.getDisplayBreakdown(basePriceCents);
  }
}

export const paymentService = new PaymentService();
