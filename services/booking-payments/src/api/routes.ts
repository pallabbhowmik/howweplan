/**
 * API Routes
 *
 * Defines all HTTP routes for the booking-payments service.
 */

import { Router } from 'express';
import {
  createBooking,
  getBooking,
  cancelBooking,
  confirmByAgent,
  completeTrip,
} from './booking.controller.js';
import {
  createCheckoutSession,
  getFeeBreakdown,
} from './payment.controller.js';
import {
  createRefundRequest,
  approveRefund,
  denyRefund,
  getRefundStats,
} from './refund.controller.js';
import { handleRazorpayWebhook } from '../webhooks/razorpay.handler.js';

export const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'booking-payments',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// BOOKING ROUTES
// ============================================================================

/** Create a new booking */
router.post('/api/v1/bookings', createBooking);

/** Get booking by ID */
router.get('/api/v1/bookings/:bookingId', getBooking);

/** Cancel a booking */
router.post('/api/v1/bookings/:bookingId/cancel', cancelBooking);

/** Agent confirms booking */
router.post('/api/v1/bookings/:bookingId/confirm', confirmByAgent);

/** Mark trip as completed */
router.post('/api/v1/bookings/:bookingId/complete', completeTrip);

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

/** Create checkout session for booking */
router.post('/api/v1/bookings/:bookingId/checkout', createCheckoutSession);

/** Get fee breakdown for an amount */
router.get('/api/v1/payments/fees', getFeeBreakdown);

// ============================================================================
// REFUND ROUTES
// ============================================================================

/** Get refund statistics (admin) */
router.get('/api/v1/admin/refunds/stats', getRefundStats);

/** Create a refund request */
router.post('/api/v1/refunds', createRefundRequest);

/** Approve a refund (admin) */
router.post('/api/v1/refunds/:refundId/approve', approveRefund);

/** Deny a refund (admin) */
router.post('/api/v1/refunds/:refundId/deny', denyRefund);

// ============================================================================
// WEBHOOK ROUTES
// ============================================================================

/** Razorpay webhook handler - uses raw body */
router.post(
  '/api/v1/webhooks/razorpay',
  // Note: The main app configures raw body parsing for this route
  handleRazorpayWebhook
);
