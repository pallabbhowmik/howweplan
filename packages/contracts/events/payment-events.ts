/**
 * Payment Events
 * Events related to payment lifecycle
 * 
 * Constitution rules enforced:
 * - Rule 1: Platform is Merchant of Record
 * - Rule 2: Payment processing fees passed to user
 * - Rule 8: Exact details revealed after payment
 * - Rule 11: Full contact details released after payment
 */

import type { BaseEvent } from './base-event';
import type { PaymentState } from '../states/payment-state';
import type { PaymentBreakdown } from '../entities/payment';

/**
 * PaymentAuthorized Event Payload
 * Funds are held but not yet captured
 */
export interface PaymentAuthorizedPayload {
  readonly paymentId: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly breakdown: PaymentBreakdown;
  readonly externalPaymentId: string;
  readonly externalPaymentIntentId: string;
  readonly previousState: PaymentState;
  readonly newState: PaymentState;
  readonly authorizedAt: Date;
}

export type PaymentAuthorizedEvent = BaseEvent<PaymentAuthorizedPayload>;

/**
 * PaymentCaptured Event Payload
 * Funds are captured - this triggers:
 * - Rule 8: Exact details revealed
 * - Rule 11: Full contact details released
 */
export interface PaymentCapturedPayload {
  readonly paymentId: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly breakdown: PaymentBreakdown;
  readonly externalPaymentId: string;
  readonly capturedAt: Date;
  readonly previousState: PaymentState;
  readonly newState: PaymentState;
  /** Flags that these details are now released per constitution rules */
  readonly triggeredReleases: {
    readonly vendorDetailsRevealed: boolean; // Rule 8
    readonly agentContactRevealed: boolean; // Rule 11
  };
}

export type PaymentCapturedEvent = BaseEvent<PaymentCapturedPayload>;

/**
 * RefundIssued Event Payload
 * Constitution rule 14: Refunds follow strict lifecycle state machines
 */
export interface RefundIssuedPayload {
  readonly refundId: string;
  readonly paymentId: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly reason: string;
  readonly refundType: 'full' | 'partial';
  readonly initiatedBy: 'user' | 'agent' | 'platform' | 'dispute';
  readonly disputeId: string | null;
  readonly previousState: PaymentState;
  readonly newState: PaymentState;
  readonly issuedAt: Date;
}

export type RefundIssuedEvent = BaseEvent<RefundIssuedPayload>;
