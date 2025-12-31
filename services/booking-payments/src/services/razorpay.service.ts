/**
 * Razorpay Service
 *
 * Handles all Razorpay API interactions.
 * This is the ONLY service that touches the Razorpay secret key.
 */

import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { config } from '../env.js';
import { logger } from './logger.service.js';
import { idempotencyStore } from '../utils/idempotency.js';
import type { FeeCalculation } from '../types/payment.types.js';

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  captured: boolean;
  email: string;
  contact: string;
  notes: Record<string, string>;
  created_at: number;
}

interface RazorpayRefund {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  notes: Record<string, string>;
  receipt: string | null;
  status: string;
  speed_requested: string;
  speed_processed: string;
  created_at: number;
}

/** Razorpay service for payment operations */
class RazorpayService {
  private readonly razorpay: Razorpay;
  private readonly isLive: boolean;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
    this.isLive = config.features.livePayments;

    logger.info(
      { isLive: this.isLive },
      `Razorpay service initialized in ${this.isLive ? 'LIVE' : 'TEST'} mode`
    );
  }

  /**
   * Create a Razorpay order for a booking.
   * Uses idempotency key to prevent duplicate orders.
   */
  async createOrder(params: {
    bookingId: string;
    userId: string;
    userEmail: string;
    fees: FeeCalculation;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    receipt: string;
  }> {
    // Check idempotency
    const existing = await idempotencyStore.get(params.idempotencyKey);
    if (existing) {
      logger.info(
        { idempotencyKey: params.idempotencyKey },
        'Returning cached order'
      );
      return existing as {
        orderId: string;
        amount: number;
        currency: string;
        receipt: string;
      };
    }

    const order = await this.razorpay.orders.create({
      amount: params.fees.totalAmountCents, // Amount in paise (smallest currency unit)
      currency: 'INR',
      receipt: `booking_${params.bookingId}`,
      notes: {
        booking_id: params.bookingId,
        user_id: params.userId,
        user_email: params.userEmail,
        base_price_cents: params.fees.basePriceCents.toString(),
        booking_fee_cents: params.fees.bookingFeeCents.toString(),
        platform_commission_cents: params.fees.platformCommissionCents.toString(),
        ...params.metadata,
      },
    }) as RazorpayOrder;

    const result = {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    };

    // Cache for idempotency
    await idempotencyStore.set(params.idempotencyKey, result);

    logger.info(
      {
        bookingId: params.bookingId,
        orderId: order.id,
        amountCents: params.fees.totalAmountCents,
      },
      'Razorpay order created'
    );

    return result;
  }

  /**
   * Retrieve an order by ID.
   */
  async getOrder(orderId: string): Promise<RazorpayOrder> {
    return this.razorpay.orders.fetch(orderId) as Promise<RazorpayOrder>;
  }

  /**
   * Retrieve a payment by ID.
   */
  async getPayment(paymentId: string): Promise<RazorpayPayment> {
    return this.razorpay.payments.fetch(paymentId) as Promise<RazorpayPayment>;
  }

  /**
   * Capture a payment (for authorized payments).
   */
  async capturePayment(paymentId: string, amount: number): Promise<RazorpayPayment> {
    return this.razorpay.payments.capture(paymentId, amount, 'INR') as Promise<RazorpayPayment>;
  }

  /**
   * Create a refund for a payment.
   * Uses idempotency key to prevent duplicate refunds.
   */
  async createRefund(params: {
    paymentId: string;
    amountCents: number;
    bookingId: string;
    refundId: string;
    idempotencyKey: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayRefund> {
    // Check idempotency
    const existing = await idempotencyStore.get(params.idempotencyKey);
    if (existing) {
      logger.info(
        { idempotencyKey: params.idempotencyKey },
        'Returning cached refund'
      );
      return existing as RazorpayRefund;
    }

    const refund = await this.razorpay.payments.refund(params.paymentId, {
      amount: params.amountCents,
      speed: 'normal',
      notes: {
        booking_id: params.bookingId,
        refund_id: params.refundId,
        ...params.notes,
      },
      receipt: `refund_${params.refundId}`,
    }) as RazorpayRefund;

    // Cache for idempotency
    await idempotencyStore.set(params.idempotencyKey, refund);

    logger.info(
      {
        bookingId: params.bookingId,
        refundId: params.refundId,
        razorpayRefundId: refund.id,
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
    payload: string,
    signature: string,
    webhookSecret: string = config.razorpay.webhookSecret
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify payment signature (for order completion verification).
   */
  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const text = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(text)
      .digest('hex');

    return expectedSignature === params.signature;
  }

  /**
   * Get the Razorpay instance for advanced operations.
   * Use sparingly - prefer specific methods.
   */
  getRazorpayInstance(): Razorpay {
    return this.razorpay;
  }
}

export const razorpayService = new RazorpayService();
