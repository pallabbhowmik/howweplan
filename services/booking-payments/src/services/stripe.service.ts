/**
 * Stripe Service
 *
 * Handles all Stripe API interactions.
 * This is the ONLY service that touches the Stripe secret key.
 */

import Stripe from 'stripe';
import { config } from '../env.js';
import { logger } from './logger.service.js';
import { idempotencyStore } from '../utils/idempotency.js';
import type { FeeCalculation } from '../types/payment.types.js';

/** Stripe service for payment operations */
class StripeService {
  private readonly stripe: Stripe;
  private readonly isLive: boolean;

  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    });
    this.isLive = config.features.livePayments;

    logger.info(
      { isLive: this.isLive },
      `Stripe service initialized in ${this.isLive ? 'LIVE' : 'TEST'} mode`
    );
  }

  /**
   * Create a Stripe Checkout session for a booking.
   * Uses idempotency key to prevent duplicate sessions.
   */
  async createCheckoutSession(params: {
    bookingId: string;
    userId: string;
    userEmail: string;
    fees: FeeCalculation;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): Promise<{
    sessionId: string;
    checkoutUrl: string;
    expiresAt: Date;
  }> {
    // Check idempotency
    const existing = await idempotencyStore.get(params.idempotencyKey);
    if (existing) {
      logger.info(
        { idempotencyKey: params.idempotencyKey },
        'Returning cached checkout session'
      );
      return existing as {
        sessionId: string;
        checkoutUrl: string;
        expiresAt: Date;
      };
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: params.userEmail,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Travel Booking',
                description: `Booking ID: ${params.bookingId}`,
              },
              unit_amount: params.fees.totalAmountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          capture_method: 'automatic',
          metadata: {
            booking_id: params.bookingId,
            user_id: params.userId,
            base_price_cents: params.fees.basePriceCents.toString(),
            booking_fee_cents: params.fees.bookingFeeCents.toString(),
            platform_commission_cents: params.fees.platformCommissionCents.toString(),
            ...params.metadata,
          },
        },
        metadata: {
          booking_id: params.bookingId,
          user_id: params.userId,
        },
        success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: params.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
      },
      {
        idempotencyKey: params.idempotencyKey,
      }
    );

    const result = {
      sessionId: session.id,
      checkoutUrl: session.url!,
      expiresAt: new Date(session.expires_at * 1000),
    };

    // Cache for idempotency
    await idempotencyStore.set(params.idempotencyKey, result);

    logger.info(
      {
        bookingId: params.bookingId,
        sessionId: session.id,
        amountCents: params.fees.totalAmountCents,
      },
      'Checkout session created'
    );

    return result;
  }

  /**
   * Retrieve a checkout session by ID.
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    });
  }

  /**
   * Retrieve a payment intent by ID.
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Create a refund for a charge.
   * Uses idempotency key to prevent duplicate refunds.
   */
  async createRefund(params: {
    chargeId: string;
    amountCents: number;
    reason: Stripe.RefundCreateParams.Reason;
    bookingId: string;
    refundId: string;
    idempotencyKey: string;
  }): Promise<Stripe.Refund> {
    // Check idempotency
    const existing = await idempotencyStore.get(params.idempotencyKey);
    if (existing) {
      logger.info(
        { idempotencyKey: params.idempotencyKey },
        'Returning cached refund'
      );
      return existing as Stripe.Refund;
    }

    const refund = await this.stripe.refunds.create(
      {
        charge: params.chargeId,
        amount: params.amountCents,
        reason: params.reason,
        metadata: {
          booking_id: params.bookingId,
          refund_id: params.refundId,
        },
      },
      {
        idempotencyKey: params.idempotencyKey,
      }
    );

    // Cache for idempotency
    await idempotencyStore.set(params.idempotencyKey, refund);

    logger.info(
      {
        bookingId: params.bookingId,
        refundId: params.refundId,
        stripeRefundId: refund.id,
        amountCents: params.amountCents,
      },
      'Refund created'
    );

    return refund;
  }

  /**
   * Verify a webhook signature.
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  }

  /**
   * Get the Stripe instance for advanced operations.
   * Use sparingly - prefer specific methods.
   */
  getStripeInstance(): Stripe {
    return this.stripe;
  }
}

export const stripeService = new StripeService();
