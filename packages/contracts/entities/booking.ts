/**
 * Booking Entity
 * Represents a confirmed booking on the platform
 * 
 * Constitution rules enforced:
 * - Rule 1: Platform is Merchant of Record
 * - Rule 3: Platform earns commission only on completed bookings
 * - Rule 14: Refunds follow strict lifecycle state machines
 */

import type { BookingState } from '../states/booking-state';

export interface BookingFinancials {
  readonly subtotal: number;
  readonly platformCommission: number;
  readonly bookingFee: number;
  readonly totalCharged: number;
  readonly currency: string;
  readonly agentPayout: number;
  readonly platformRevenue: number;
  readonly refundedAmount: number;
  readonly netRevenue: number;
}

export interface BookingTimeline {
  readonly createdAt: Date;
  readonly confirmedAt: Date | null;
  readonly paidAt: Date | null;
  readonly completedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly refundedAt: Date | null;
  readonly disputeOpenedAt: Date | null;
  readonly disputeResolvedAt: Date | null;
}

export interface Booking {
  readonly id: string;
  readonly requestId: string;
  readonly itineraryId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly state: BookingState;
  readonly financials: BookingFinancials;
  readonly timeline: BookingTimeline;
  readonly paymentId: string | null;
  readonly disputeId: string | null;
  readonly travelStartDate: Date;
  readonly travelEndDate: Date;
  readonly cancellationReason: string | null;
  readonly cancellationInitiator: 'user' | 'agent' | 'platform' | null;
  readonly refundEligible: boolean;
  readonly reviewId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Booking cancellation policy
 */
export interface CancellationPolicy {
  readonly fullRefundDeadline: Date;
  readonly partialRefundDeadline: Date;
  readonly partialRefundPercentage: number;
  readonly noRefundAfter: Date;
}
