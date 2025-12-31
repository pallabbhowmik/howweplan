/**
 * Request Validators
 *
 * Zod schemas for validating API requests.
 * All inputs are validated, even from internal services.
 */

import { z } from 'zod';
import { CancellationReason } from '../types/booking.types.js';
import { RefundReason } from '../types/payment.types.js';

/** UUID v4 format validator */
const uuidSchema = z.string().uuid();

/** ISO date string validator */
const isoDateSchema = z.string().datetime();

/** Positive integer (cents) validator */
const centsSchema = z.number().int().positive();

/** Create booking request schema */
export const createBookingSchema = z.object({
  userId: uuidSchema,
  agentId: uuidSchema,
  itineraryId: uuidSchema,
  tripStartDate: isoDateSchema,
  tripEndDate: isoDateSchema,
  destinationCity: z.string().min(1).max(100),
  destinationCountry: z.string().min(2).max(100),
  travelerCount: z.number().int().min(1).max(50),
  basePriceCents: centsSchema,
  idempotencyKey: z.string().min(16).max(255),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/** Create checkout session request schema */
export const createCheckoutSchema = z.object({
  bookingId: uuidSchema,
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  idempotencyKey: z.string().min(16).max(255),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

/** Cancel booking request schema */
export const cancelBookingSchema = z.object({
  bookingId: uuidSchema,
  reason: z.nativeEnum(CancellationReason),
  cancelledBy: uuidSchema,
  adminReason: z.string().min(10).max(1000).optional(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

/** Create refund request schema */
export const createRefundSchema = z.object({
  bookingId: uuidSchema,
  reason: z.nativeEnum(RefundReason),
  reasonDetails: z.string().min(10).max(2000),
  requestedBy: uuidSchema,
  amountCents: centsSchema.optional(),
  adminReason: z.string().min(10).max(1000).optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;

/** Approve refund request schema */
export const approveRefundSchema = z.object({
  refundId: uuidSchema,
  approvedBy: uuidSchema,
  reason: z.string().min(10).max(1000),
  amountCents: centsSchema.optional(),
});

export type ApproveRefundInput = z.infer<typeof approveRefundSchema>;

/** Deny refund request schema */
export const denyRefundSchema = z.object({
  refundId: uuidSchema,
  deniedBy: uuidSchema,
  reason: z.string().min(10).max(1000),
});

export type DenyRefundInput = z.infer<typeof denyRefundSchema>;

/** Validate input and return typed result or error */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessages = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, error: errorMessages.join(', ') };
}
