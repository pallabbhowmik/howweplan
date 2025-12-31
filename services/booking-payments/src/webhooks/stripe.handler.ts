/**
 * Stripe Webhook Handler
 *
 * Handles all Stripe webhook events with idempotent processing.
 * Verifies webhook signatures to prevent tampering.
 */

import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { v4 as uuid } from 'uuid';
import { config } from '../env.js';
import { stripeService } from '../services/stripe.service.js';
import { paymentService } from '../services/payment.service.js';
import { createRequestLogger } from '../services/logger.service.js';
import { auditService } from '../services/audit.service.js';
import { eventPublisher } from '../events/publisher.js';
import { idempotencyStore } from '../utils/idempotency.js';
import type { EventMetadata } from '../types/events.types.js';

/** System metadata for webhook-triggered actions */
const SYSTEM_METADATA: EventMetadata = {
  actorId: 'stripe-webhook',
  actorType: 'system',
};

/**
 * Main Stripe webhook handler.
 * Verifies signature and routes to appropriate handler.
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const correlationId = uuid();
  const log = createRequestLogger(correlationId);

  try {
    // Get raw body and signature
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      log.warn('Missing Stripe signature');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      // req.body should be raw buffer for webhook verification
      const rawBody = req.body as Buffer;
      event = stripeService.verifyWebhookSignature(rawBody, signature);
    } catch (err) {
      log.warn({ error: err }, 'Invalid Stripe signature');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Check idempotency - Stripe may retry webhooks
    const idempotencyKey = `stripe_webhook_${event.id}`;
    const alreadyProcessed = await idempotencyStore.exists(idempotencyKey);

    if (alreadyProcessed) {
      log.info({ eventId: event.id }, 'Webhook already processed');
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    log.info(
      {
        eventId: event.id,
        eventType: event.type,
      },
      'Processing Stripe webhook'
    );

    // Route to appropriate handler
    await routeWebhookEvent(event, log);

    // Mark as processed
    await idempotencyStore.set(idempotencyKey, { processedAt: new Date() });

    res.status(200).json({ received: true });
  } catch (error) {
    log.error({ error }, 'Webhook processing failed');
    // Return 200 to prevent Stripe retries for unrecoverable errors
    // In production, send to dead letter queue for investigation
    res.status(200).json({ received: true, error: 'Processing failed' });
  }
}

/**
 * Route webhook event to appropriate handler.
 */
async function routeWebhookEvent(
  event: Stripe.Event,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, log);
      break;

    case 'checkout.session.expired':
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session, log);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, log);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, log);
      break;

    case 'charge.succeeded':
      await handleChargeSucceeded(event.data.object as Stripe.Charge, log);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge, log);
      break;

    case 'charge.dispute.created':
      if (config.features.disputeWebhooks) {
        await handleDisputeCreated(event.data.object as Stripe.Dispute, log);
      }
      break;

    case 'charge.dispute.closed':
      if (config.features.disputeWebhooks) {
        await handleDisputeClosed(event.data.object as Stripe.Dispute, log);
      }
      break;

    default:
      log.debug({ eventType: event.type }, 'Unhandled webhook event type');
  }
}

/**
 * Handle checkout.session.completed event.
 * This means the customer completed payment.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  const bookingId = session.metadata?.['booking_id'];
  const paymentIntentId = session.payment_intent as string;

  if (!bookingId) {
    log.warn({ sessionId: session.id }, 'Checkout session missing booking_id metadata');
    return;
  }

  log.info(
    {
      sessionId: session.id,
      bookingId,
      paymentIntentId,
      amountTotal: session.amount_total,
    },
    'Checkout session completed'
  );

  // Payment success will be handled by payment_intent.succeeded
  // This event confirms the checkout flow completed
}

/**
 * Handle checkout.session.expired event.
 */
async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  const bookingId = session.metadata?.['booking_id'];

  if (!bookingId) {
    return;
  }

  log.info(
    {
      sessionId: session.id,
      bookingId,
    },
    'Checkout session expired'
  );

  // In production, this would update the booking state
  // and potentially notify the user
}

/**
 * Handle payment_intent.succeeded event.
 * This confirms payment was successfully captured.
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  const bookingId = paymentIntent.metadata?.['booking_id'];
  const chargeId = paymentIntent.latest_charge as string;

  if (!bookingId) {
    log.warn({ paymentIntentId: paymentIntent.id }, 'Payment intent missing booking_id');
    return;
  }

  log.info(
    {
      paymentIntentId: paymentIntent.id,
      bookingId,
      chargeId,
      amount: paymentIntent.amount,
    },
    'Payment intent succeeded'
  );

  await paymentService.handlePaymentSuccess({
    bookingId,
    paymentIntentId: paymentIntent.id,
    chargeId,
    amountCents: paymentIntent.amount,
    metadata: SYSTEM_METADATA,
  });
}

/**
 * Handle payment_intent.payment_failed event.
 */
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  const bookingId = paymentIntent.metadata?.['booking_id'];
  const error = paymentIntent.last_payment_error;

  if (!bookingId) {
    return;
  }

  log.warn(
    {
      paymentIntentId: paymentIntent.id,
      bookingId,
      failureCode: error?.code,
      failureMessage: error?.message,
    },
    'Payment intent failed'
  );

  await paymentService.handlePaymentFailure({
    bookingId,
    paymentIntentId: paymentIntent.id,
    failureCode: error?.code ?? 'unknown',
    failureMessage: error?.message ?? 'Payment failed',
    amountCents: paymentIntent.amount,
    metadata: SYSTEM_METADATA,
  });
}

/**
 * Handle charge.succeeded event.
 */
async function handleChargeSucceeded(
  charge: Stripe.Charge,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  const bookingId = charge.metadata?.['booking_id'];

  if (!bookingId) {
    return;
  }

  log.info(
    {
      chargeId: charge.id,
      bookingId,
      amount: charge.amount,
    },
    'Charge succeeded'
  );

  // Record the charge for audit
  await auditService.recordMoneyMovement({
    bookingId,
    paymentId: charge.payment_intent as string,
    movementType: 'charge',
    amountCents: charge.amount,
    fromAccount: 'customer',
    toAccount: 'platform_stripe',
    stripeTransactionId: charge.id,
    metadata: SYSTEM_METADATA,
  });
}

/**
 * Handle charge.refunded event.
 */
async function handleChargeRefunded(
  charge: Stripe.Charge,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  const bookingId = charge.metadata?.['booking_id'];
  const refundedAmount = charge.amount_refunded;

  if (!bookingId) {
    return;
  }

  log.info(
    {
      chargeId: charge.id,
      bookingId,
      refundedAmount,
      fullyRefunded: charge.refunded,
    },
    'Charge refunded'
  );

  // Record the refund for audit
  await auditService.recordMoneyMovement({
    bookingId,
    paymentId: charge.payment_intent as string,
    movementType: 'refund',
    amountCents: refundedAmount,
    fromAccount: 'platform_stripe',
    toAccount: 'customer',
    stripeTransactionId: charge.id,
    metadata: SYSTEM_METADATA,
  });
}

/**
 * Handle charge.dispute.created event.
 * Disputes require admin arbitration per business rules.
 */
async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  const charge = dispute.charge as Stripe.Charge | string;
  const chargeId = typeof charge === 'string' ? charge : charge.id;

  log.warn(
    {
      disputeId: dispute.id,
      chargeId,
      reason: dispute.reason,
      amount: dispute.amount,
    },
    'Dispute created - requires admin attention'
  );

  // Emit dispute opened event
  await eventPublisher.publish({
    eventId: uuid(),
    eventType: 'dispute.opened',
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'booking-payments',
    correlationId: chargeId,
    payload: {
      bookingId: '', // Would be looked up from charge metadata
      paymentId: '',
      stripeDisputeId: dispute.id,
      reason: dispute.reason,
      amountCents: dispute.amount,
    },
    metadata: SYSTEM_METADATA,
  });
}

/**
 * Handle charge.dispute.closed event.
 */
async function handleDisputeClosed(
  dispute: Stripe.Dispute,
  log: ReturnType<typeof createRequestLogger>
): Promise<void> {
  const outcome = dispute.status === 'won' ? 'won' : 'lost';

  log.info(
    {
      disputeId: dispute.id,
      status: dispute.status,
      outcome,
    },
    'Dispute closed'
  );

  // Emit dispute resolved event
  await eventPublisher.publish({
    eventId: uuid(),
    eventType: 'dispute.resolved',
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'booking-payments',
    correlationId: dispute.id,
    payload: {
      bookingId: '', // Would be looked up
      paymentId: '',
      stripeDisputeId: dispute.id,
      outcome,
      amountCents: dispute.amount,
    },
    metadata: SYSTEM_METADATA,
  });
}
