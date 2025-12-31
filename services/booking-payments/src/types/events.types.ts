/**
 * Event Types
 *
 * All events emitted by the booking-payments service.
 * Events are the ONLY way this module communicates with other modules.
 */

import type { BookingState, CancellationReason } from './booking.types.js';
import type { PaymentState, RefundReason } from './payment.types.js';

/** Base event structure */
export interface BaseEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly timestamp: string;
  readonly version: string;
  readonly source: 'booking-payments';
  readonly correlationId: string;
}

/** Event metadata for audit trail */
export interface EventMetadata {
  readonly actorId: string;
  readonly actorType: 'user' | 'agent' | 'admin' | 'system';
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly reason?: string;
}

// ============================================================================
// BOOKING EVENTS
// ============================================================================

export interface BookingCreatedEvent extends BaseEvent {
  readonly eventType: 'booking.created';
  readonly payload: {
    readonly bookingId: string;
    readonly userId: string;
    readonly agentId: string;
    readonly itineraryId: string;
    readonly basePriceCents: number;
    readonly totalAmountCents: number;
    readonly tripStartDate: string;
    readonly tripEndDate: string;
  };
  readonly metadata: EventMetadata;
}

export interface BookingStateChangedEvent extends BaseEvent {
  readonly eventType: 'booking.state_changed';
  readonly payload: {
    readonly bookingId: string;
    readonly previousState: BookingState;
    readonly newState: BookingState;
    readonly reason?: string;
  };
  readonly metadata: EventMetadata;
}

export interface BookingCancelledEvent extends BaseEvent {
  readonly eventType: 'booking.cancelled';
  readonly payload: {
    readonly bookingId: string;
    readonly userId: string;
    readonly agentId: string;
    readonly cancellationReason: CancellationReason;
    readonly cancelledBy: string;
    readonly refundEligible: boolean;
  };
  readonly metadata: EventMetadata;
}

export interface BookingConfirmedByAgentEvent extends BaseEvent {
  readonly eventType: 'booking.agent_confirmed';
  readonly payload: {
    readonly bookingId: string;
    readonly userId: string;
    readonly agentId: string;
    readonly confirmedAt: string;
  };
  readonly metadata: EventMetadata;
}

export interface BookingCompletedEvent extends BaseEvent {
  readonly eventType: 'booking.completed';
  readonly payload: {
    readonly bookingId: string;
    readonly userId: string;
    readonly agentId: string;
    readonly completedAt: string;
    readonly escrowReleaseDate: string;
  };
  readonly metadata: EventMetadata;
}

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

export interface PaymentInitiatedEvent extends BaseEvent {
  readonly eventType: 'payment.initiated';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly amountCents: number;
    readonly stripeCheckoutSessionId: string;
  };
  readonly metadata: EventMetadata;
}

export interface PaymentSucceededEvent extends BaseEvent {
  readonly eventType: 'payment.succeeded';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly amountCents: number;
    readonly stripePaymentIntentId: string;
    readonly stripeChargeId: string;
  };
  readonly metadata: EventMetadata;
}

export interface PaymentFailedEvent extends BaseEvent {
  readonly eventType: 'payment.failed';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly amountCents: number;
    readonly failureCode: string;
    readonly failureMessage: string;
  };
  readonly metadata: EventMetadata;
}

export interface PaymentStateChangedEvent extends BaseEvent {
  readonly eventType: 'payment.state_changed';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly previousState: PaymentState;
    readonly newState: PaymentState;
  };
  readonly metadata: EventMetadata;
}

// ============================================================================
// ESCROW EVENTS
// ============================================================================

export interface EscrowStartedEvent extends BaseEvent {
  readonly eventType: 'escrow.started';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly amountCents: number;
    readonly releaseDate: string;
  };
  readonly metadata: EventMetadata;
}

export interface EscrowReleasedEvent extends BaseEvent {
  readonly eventType: 'escrow.released';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly agentId: string;
    readonly amountCents: number;
    readonly platformCommissionCents: number;
    readonly agentPayoutCents: number;
  };
  readonly metadata: EventMetadata;
}

// ============================================================================
// REFUND EVENTS
// ============================================================================

export interface RefundRequestedEvent extends BaseEvent {
  readonly eventType: 'refund.requested';
  readonly payload: {
    readonly refundId: string;
    readonly bookingId: string;
    readonly paymentId: string;
    readonly amountCents: number;
    readonly reason: RefundReason;
    readonly requiresAdminApproval: boolean;
  };
  readonly metadata: EventMetadata;
}

export interface RefundApprovedEvent extends BaseEvent {
  readonly eventType: 'refund.approved';
  readonly payload: {
    readonly refundId: string;
    readonly bookingId: string;
    readonly amountCents: number;
    readonly approvedBy: string;
  };
  readonly metadata: EventMetadata;
}

export interface RefundDeniedEvent extends BaseEvent {
  readonly eventType: 'refund.denied';
  readonly payload: {
    readonly refundId: string;
    readonly bookingId: string;
    readonly deniedBy: string;
    readonly denialReason: string;
  };
  readonly metadata: EventMetadata;
}

export interface RefundIssuedEvent extends BaseEvent {
  readonly eventType: 'refund.issued';
  readonly payload: {
    readonly refundId: string;
    readonly bookingId: string;
    readonly paymentId: string;
    readonly amountCents: number;
    readonly stripeRefundId: string;
    readonly isPartial: boolean;
  };
  readonly metadata: EventMetadata;
}

// ============================================================================
// DISPUTE EVENTS
// ============================================================================

export interface DisputeOpenedEvent extends BaseEvent {
  readonly eventType: 'dispute.opened';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly stripeDisputeId: string;
    readonly reason: string;
    readonly amountCents: number;
  };
  readonly metadata: EventMetadata;
}

export interface DisputeResolvedEvent extends BaseEvent {
  readonly eventType: 'dispute.resolved';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly stripeDisputeId: string;
    readonly outcome: 'won' | 'lost';
    readonly amountCents: number;
  };
  readonly metadata: EventMetadata;
}

// ============================================================================
// AUDIT EVENTS
// ============================================================================

export interface AuditEvent extends BaseEvent {
  readonly eventType: 'audit.money_movement';
  readonly payload: {
    readonly bookingId: string;
    readonly paymentId: string;
    readonly movementType:
      | 'charge'
      | 'escrow_hold'
      | 'escrow_release'
      | 'refund'
      | 'commission'
      | 'payout';
    readonly amountCents: number;
    readonly fromAccount: string;
    readonly toAccount: string;
    readonly stripeTransactionId: string;
  };
  readonly metadata: EventMetadata;
}

// ============================================================================
// EVENT UNION TYPE
// ============================================================================

export type BookingPaymentEvent =
  | BookingCreatedEvent
  | BookingStateChangedEvent
  | BookingCancelledEvent
  | BookingConfirmedByAgentEvent
  | BookingCompletedEvent
  | PaymentInitiatedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentStateChangedEvent
  | EscrowStartedEvent
  | EscrowReleasedEvent
  | RefundRequestedEvent
  | RefundApprovedEvent
  | RefundDeniedEvent
  | RefundIssuedEvent
  | DisputeOpenedEvent
  | DisputeResolvedEvent
  | AuditEvent;

export type EventType = BookingPaymentEvent['eventType'];
