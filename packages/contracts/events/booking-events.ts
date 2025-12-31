/**
 * Booking Events
 * Events related to booking lifecycle
 * 
 * Constitution rules enforced:
 * - Rule 3: Platform earns commission only on completed bookings
 * - Rule 14: Refunds follow strict lifecycle state machines
 */

import type { BaseEvent } from './base-event';
import type { BookingState } from '../states/booking-state';
import type { BookingFinancials } from '../entities/booking';

/**
 * BookingConfirmed Event Payload
 * Fired when booking is confirmed after payment capture
 */
export interface BookingConfirmedPayload {
  readonly bookingId: string;
  readonly requestId: string;
  readonly itineraryId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly paymentId: string;
  readonly financials: BookingFinancials;
  readonly travelStartDate: Date;
  readonly travelEndDate: Date;
  readonly previousState: BookingState;
  readonly newState: BookingState;
  readonly confirmedAt: Date;
}

export type BookingConfirmedEvent = BaseEvent<BookingConfirmedPayload>;

/**
 * BookingCancelled Event Payload
 * Constitution rule 14: Triggers refund state machine
 */
export interface BookingCancelledPayload {
  readonly bookingId: string;
  readonly requestId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly paymentId: string;
  readonly cancellationReason: string;
  readonly cancellationInitiator: 'user' | 'agent' | 'platform';
  readonly previousState: BookingState;
  readonly newState: BookingState;
  readonly cancelledAt: Date;
  readonly refundEligible: boolean;
  readonly estimatedRefundAmount: number | null;
  readonly refundPercentage: number | null;
}

export type BookingCancelledEvent = BaseEvent<BookingCancelledPayload>;

/**
 * BookingCompleted Event Payload
 * Constitution rule 3: Commission is earned at this point
 */
export interface BookingCompletedPayload {
  readonly bookingId: string;
  readonly requestId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly paymentId: string;
  readonly financials: BookingFinancials;
  readonly previousState: BookingState;
  readonly newState: BookingState;
  readonly completedAt: Date;
  /** Commission earned by platform (rule 3) */
  readonly commissionEarned: number;
  /** Amount to be paid to agent */
  readonly agentPayoutAmount: number;
}

export type BookingCompletedEvent = BaseEvent<BookingCompletedPayload>;
