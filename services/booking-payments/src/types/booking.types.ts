/**
 * Booking Types
 *
 * Type definitions for booking entities and DTOs.
 * Strong typing enforced throughout the service.
 */

import type { PaymentState } from './payment.types.js';

/** Booking lifecycle states */
export const BookingState = {
  /** Awaiting payment initiation */
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  /** Payment is being processed */
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  /** Payment confirmed, awaiting agent confirmation */
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  /** Agent has confirmed availability */
  AGENT_CONFIRMED: 'AGENT_CONFIRMED',
  /** Trip is currently in progress */
  IN_PROGRESS: 'IN_PROGRESS',
  /** Trip completed successfully */
  COMPLETED: 'COMPLETED',
  /** Funds released to agent */
  SETTLED: 'SETTLED',
  /** Booking was cancelled */
  CANCELLED: 'CANCELLED',
  /** Payment dispute opened */
  DISPUTED: 'DISPUTED',
  /** Dispute resolved */
  DISPUTE_RESOLVED: 'DISPUTE_RESOLVED',
} as const;

export type BookingState = (typeof BookingState)[keyof typeof BookingState];

/** Cancellation reasons */
export const CancellationReason = {
  USER_REQUESTED: 'USER_REQUESTED',
  AGENT_UNAVAILABLE: 'AGENT_UNAVAILABLE',
  AGENT_DECLINED: 'AGENT_DECLINED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ADMIN_CANCELLED: 'ADMIN_CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type CancellationReason = (typeof CancellationReason)[keyof typeof CancellationReason];

/** Core booking entity stored in database */
export interface Booking {
  readonly id: string;
  readonly userId: string;
  readonly agentId: string;
  readonly itineraryId: string;
  readonly state: BookingState;
  readonly paymentState: PaymentState;

  /** Trip details */
  readonly tripStartDate: Date;
  readonly tripEndDate: Date;
  readonly destinationCity: string;
  readonly destinationCountry: string;
  readonly travelerCount: number;

  /** Financial details (all in cents) */
  readonly basePriceCents: number;
  readonly bookingFeeCents: number;
  readonly platformCommissionCents: number;
  readonly totalAmountCents: number;
  readonly agentPayoutCents: number;

  /** Payment provider references (Razorpay) */
  readonly paymentIntentId: string | null;
  readonly checkoutSessionId: string | null;
  readonly chargeId: string | null;
  
  /** @deprecated Use paymentIntentId - kept for backward compatibility */
  readonly stripePaymentIntentId: string | null;
  /** @deprecated Use checkoutSessionId - kept for backward compatibility */
  readonly stripeCheckoutSessionId: string | null;
  /** @deprecated Use chargeId - kept for backward compatibility */
  readonly stripeChargeId: string | null;

  /** State transitions */
  readonly cancellationReason: CancellationReason | null;
  readonly cancelledAt: Date | null;
  readonly cancelledBy: string | null;
  readonly agentConfirmedAt: Date | null;
  readonly tripStartedAt: Date | null;
  readonly tripCompletedAt: Date | null;
  readonly settledAt: Date | null;

  /** Escrow tracking */
  readonly escrowReleasedAt: Date | null;
  readonly escrowReleaseEligibleAt: Date | null;

  /** Metadata */
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

/** Input DTO for creating a booking */
export interface CreateBookingDTO {
  readonly userId: string;
  readonly agentId: string;
  readonly itineraryId: string;
  readonly tripStartDate: string;
  readonly tripEndDate: string;
  readonly destinationCity: string;
  readonly destinationCountry: string;
  readonly travelerCount: number;
  readonly basePriceCents: number;
  readonly idempotencyKey: string;
}

/** Output DTO for booking response */
export interface BookingResponseDTO {
  readonly id: string;
  readonly bookingNumber?: string | null;
  readonly userId: string;
  readonly agentId: string;
  readonly itineraryId: string | null;
  readonly requestId?: string | null;
  readonly state: BookingState | string; // Accept string for database status values
  readonly paymentState: PaymentState | string; // Accept string for computed payment state
  readonly tripStartDate: string | null;
  readonly tripEndDate: string | null;
  readonly destinationCity?: string | null;
  readonly destinationCountry?: string | null;
  readonly travelerCount?: number | null;
  readonly basePriceCents: number;
  readonly bookingFeeCents: number;
  readonly platformCommissionCents?: number;
  readonly totalAmountCents: number;
  readonly agentPayoutCents?: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;

  /** Conditionally included based on state */
  readonly agentConfirmedAt?: string | null;
  readonly tripCompletedAt?: string | null;
  readonly cancelledAt?: string | null;
  readonly cancellationReason?: CancellationReason | string | null;
}

/** Input DTO for cancellation request */
export interface CancelBookingDTO {
  readonly bookingId: string;
  readonly reason: CancellationReason;
  readonly cancelledBy: string;
  readonly adminReason?: string;
}

/** Booking state transition result */
export interface BookingTransitionResult {
  readonly success: boolean;
  readonly booking: Booking | null;
  readonly previousState: BookingState | null;
  readonly newState: BookingState | null;
  readonly error?: string;
}

/** Booking query filters */
export interface BookingQueryFilters {
  readonly userId?: string;
  readonly agentId?: string;
  readonly state?: BookingState | BookingState[];
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly limit?: number;
  readonly offset?: number;
}

/** Valid state transitions for booking */
export const VALID_BOOKING_TRANSITIONS: Record<BookingState, BookingState[]> = {
  [BookingState.PENDING_PAYMENT]: [
    BookingState.PAYMENT_PROCESSING,
    BookingState.CANCELLED,
  ],
  [BookingState.PAYMENT_PROCESSING]: [
    BookingState.PAYMENT_CONFIRMED,
    BookingState.PENDING_PAYMENT,
    BookingState.CANCELLED,
  ],
  [BookingState.PAYMENT_CONFIRMED]: [
    BookingState.AGENT_CONFIRMED,
    BookingState.CANCELLED,
  ],
  [BookingState.AGENT_CONFIRMED]: [
    BookingState.IN_PROGRESS,
    BookingState.CANCELLED,
    BookingState.DISPUTED,
  ],
  [BookingState.IN_PROGRESS]: [
    BookingState.COMPLETED,
    BookingState.DISPUTED,
  ],
  [BookingState.COMPLETED]: [
    BookingState.SETTLED,
    BookingState.DISPUTED,
  ],
  [BookingState.SETTLED]: [
    BookingState.DISPUTED,
  ],
  [BookingState.CANCELLED]: [],
  [BookingState.DISPUTED]: [
    BookingState.DISPUTE_RESOLVED,
  ],
  [BookingState.DISPUTE_RESOLVED]: [
    BookingState.SETTLED,
  ],
};

/** Check if a state transition is valid */
export function isValidBookingTransition(
  from: BookingState,
  to: BookingState
): boolean {
  const validTargets = VALID_BOOKING_TRANSITIONS[from];
  return validTargets?.includes(to) ?? false;
}
