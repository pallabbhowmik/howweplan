/**
 * Razorpay Webhook Handler
 *
 * Handles all Razorpay webhook events with idempotent processing.
 * Webhooks ensure we're notified of payment state changes.
 */

import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { logger as log } from '../services/logger.service.js';
import { razorpayService } from '../services/razorpay.service.js';
import { idempotencyStore } from '../utils/idempotency.js';
import { paymentService } from '../services/payment.service.js';

/**
 * Event metadata for audit trail.
 */
const eventMetadata = {
  actorType: 'system' as const,
  actorId: 'razorpay-webhook',
  ipAddress: null,
};

/**
 * Main Razorpay webhook handler.
 * Verifies signature and routes to appropriate handler.
 */
export async function handleRazorpayWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature || typeof signature !== 'string') {
      log.warn('Missing Razorpay signature');
      res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      return;
    }

    // Verify webhook signature
    const rawBody = JSON.stringify(req.body);
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      log.warn('Invalid Razorpay signature');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.body;

    // Check idempotency - Razorpay may retry webhooks
    const idempotencyKey = `razorpay_webhook_${event.event}_${event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id}`;
    const alreadyProcessed = await idempotencyStore.get(idempotencyKey);

    if (alreadyProcessed) {
      log.info(
        { eventType: event.event, idempotencyKey },
        'Webhook already processed (idempotent)'
      );
      res.status(200).json({ received: true, processed: 'already' });
      return;
    }

    log.info(
      {
        eventType: event.event,
        paymentId: event.payload?.payment?.entity?.id,
        orderId: event.payload?.order?.entity?.id,
      },
      'Processing Razorpay webhook'
    );

    // Route to specific handler
    await routeEvent(event, log);

    // Mark as processed
    await idempotencyStore.set(idempotencyKey, { processed: true });

    res.status(200).json({ received: true });
  } catch (error) {
    log.error({ error }, 'Webhook processing failed');
    // Return 200 to prevent Razorpay retries for unrecoverable errors
    res.status(200).json({ received: true, error: 'Processing failed' });
  }
}

/**
 * Route event to appropriate handler.
 */
async function routeEvent(
  event: any,
  log: typeof import('../services/logger.service.js').logger
): Promise<void> {
  switch (event.event) {
    case 'payment.captured':
      await handlePaymentCaptured(event.payload.payment.entity, log);
      break;

    case 'payment.failed':
      await handlePaymentFailed(event.payload.payment.entity, log);
      break;

    case 'order.paid':
      await handleOrderPaid(event.payload.order.entity, log);
      break;

    case 'refund.processed':
      await handleRefundProcessed(event.payload.refund.entity, log);
      break;

    case 'refund.failed':
      await handleRefundFailed(event.payload.refund.entity, log);
      break;

    default:
      log.info({ eventType: event.event }, 'Unhandled webhook event type');
  }
}

/**
 * Handle payment.captured event.
 */
async function handlePaymentCaptured(
  payment: any,
  log: typeof import('../services/logger.service.js').logger
): Promise<void> {
  const bookingId = payment.notes?.booking_id;

  if (!bookingId) {
    log.warn({ paymentId: payment.id }, 'Payment missing booking_id in notes');
    return;
  }

  await paymentService.handlePaymentSuccess({
    bookingId,
    paymentId: payment.id,
    orderId: payment.order_id,
    amountCents: payment.amount,
    metadata: {
      ...eventMetadata,
      correlationId: bookingId,
    },
  });

  log.info(
    {
      bookingId,
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount,
    },
    'Payment captured webhook processed'
  );
}

/**
 * Handle payment.failed event.
 */
async function handlePaymentFailed(
  payment: any,
  log: typeof import('../services/logger.service.js').logger
): Promise<void> {
  const bookingId = payment.notes?.booking_id;

  if (!bookingId) {
    log.warn({ paymentId: payment.id }, 'Payment missing booking_id in notes');
    return;
  }

  await paymentService.handlePaymentFailure({
    bookingId,
    paymentId: payment.id,
    failureCode: payment.error_code || 'unknown',
    failureMessage: payment.error_description || 'Payment failed',
    amountCents: payment.amount,
    metadata: {
      ...eventMetadata,
      correlationId: bookingId,
    },
  });

  log.info(
    {
      bookingId,
      paymentId: payment.id,
      errorCode: payment.error_code,
    },
    'Payment failed webhook processed'
  );
}

/**
 * Handle order.paid event.
 */
async function handleOrderPaid(
  order: any,
  log: typeof import('../services/logger.service.js').logger
): Promise<void> {
  const bookingId = order.notes?.booking_id;

  if (!bookingId) {
    log.warn({ orderId: order.id }, 'Order missing booking_id in notes');
    return;
  }

  log.info(
    {
      bookingId,
      orderId: order.id,
      amount: order.amount,
    },
    'Order paid webhook processed'
  );
}

/**
 * Handle refund.processed event.
 */
async function handleRefundProcessed(
  refund: any,
  log: typeof import('../services/logger.service.js').logger
): Promise<void> {
  log.info(
    {
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount,
    },
    'Refund processed webhook received'
  );
}

/**
 * Handle refund.failed event.
 */
async function handleRefundFailed(
  refund: any,
  log: typeof import('../services/logger.service.js').logger
): Promise<void> {
  log.warn(
    {
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount,
    },
    'Refund failed webhook received'
  );
}
