/**
 * Payment Types
 *
 * Type definitions for payment entities, escrow states, and refunds.
 * All monetary values are in cents to avoid floating-point issues.
 */

/** Payment lifecycle states */
export const PaymentState = {
  /** Payment not yet initiated */
  NOT_STARTED: 'NOT_STARTED',
  /** Checkout session created, awaiting customer action */
  INITIATED: 'INITIATED',
  /** Payment is being processed by Stripe */
  PROCESSING: 'PROCESSING',
  /** Payment succeeded */
  SUCCEEDED: 'SUCCEEDED',
  /** Payment failed */
  FAILED: 'FAILED',
  /** Funds held in escrow */
  IN_ESCROW: 'IN_ESCROW',
  /** Funds released to agent */
  RELEASED: 'RELEASED',
  /** Refund has been requested */
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  /** Refund approved (pending processing) */
  REFUND_APPROVED: 'REFUND_APPROVED',
  /** Refund denied by admin */
  REFUND_DENIED: 'REFUND_DENIED',
  /** Refund processed successfully */
  REFUNDED: 'REFUNDED',
  /** Partial refund issued */
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;

export type PaymentState = (typeof PaymentState)[keyof typeof PaymentState];

/** Refund request reasons - SUBJECTIVE complaints are NEVER refundable */
export const RefundReason = {
  /** Agent did not show up - REFUNDABLE */
  AGENT_NO_SHOW: 'AGENT_NO_SHOW',
  /** Service was not delivered as promised - REFUNDABLE */
  SERVICE_NOT_DELIVERED: 'SERVICE_NOT_DELIVERED',
  /** Agent cancelled the booking - REFUNDABLE */
  AGENT_CANCELLED: 'AGENT_CANCELLED',
  /** User cancelled before agent confirmation - FULL REFUND */
  USER_CANCELLED_BEFORE_CONFIRM: 'USER_CANCELLED_BEFORE_CONFIRM',
  /** User cancelled after agent confirmation - PARTIAL REFUND */
  USER_CANCELLED_AFTER_CONFIRM: 'USER_CANCELLED_AFTER_CONFIRM',
  /** Objective quality issue verified by admin - REFUNDABLE */
  VERIFIED_QUALITY_ISSUE: 'VERIFIED_QUALITY_ISSUE',
  /** Duplicate charge - REFUNDABLE */
  DUPLICATE_CHARGE: 'DUPLICATE_CHARGE',
  /** Admin override - REQUIRES REASON */
  ADMIN_OVERRIDE: 'ADMIN_OVERRIDE',
} as const;

export type RefundReason = (typeof RefundReason)[keyof typeof RefundReason];

/** Non-refundable subjective complaint types */
export const SubjectiveComplaint = {
  /** "Tour guide was boring" - NOT REFUNDABLE */
  GUIDE_PERSONALITY: 'GUIDE_PERSONALITY',
  /** "Hotel wasn't as nice as I expected" - NOT REFUNDABLE */
  UNMET_EXPECTATIONS: 'UNMET_EXPECTATIONS',
  /** "Weather was bad" - NOT REFUNDABLE */
  WEATHER: 'WEATHER',
  /** "I changed my mind about the destination" - NOT REFUNDABLE */
  CHANGED_MIND: 'CHANGED_MIND',
  /** General dissatisfaction without objective cause - NOT REFUNDABLE */
  GENERAL_DISSATISFACTION: 'GENERAL_DISSATISFACTION',
} as const;

export type SubjectiveComplaint = (typeof SubjectiveComplaint)[keyof typeof SubjectiveComplaint];

/** Refund eligibility rules */
export const REFUNDABLE_REASONS: readonly RefundReason[] = [
  RefundReason.AGENT_NO_SHOW,
  RefundReason.SERVICE_NOT_DELIVERED,
  RefundReason.AGENT_CANCELLED,
  RefundReason.USER_CANCELLED_BEFORE_CONFIRM,
  RefundReason.USER_CANCELLED_AFTER_CONFIRM,
  RefundReason.VERIFIED_QUALITY_ISSUE,
  RefundReason.DUPLICATE_CHARGE,
  RefundReason.ADMIN_OVERRIDE,
] as const;

/** Reasons requiring admin approval */
export const ADMIN_APPROVAL_REQUIRED: readonly RefundReason[] = [
  RefundReason.VERIFIED_QUALITY_ISSUE,
  RefundReason.ADMIN_OVERRIDE,
] as const;

/** Payment record stored in database */
export interface PaymentRecord {
  readonly id: string;
  readonly bookingId: string;
  readonly state: PaymentState;

  /** Stripe identifiers */
  readonly stripePaymentIntentId: string | null;
  readonly stripeCheckoutSessionId: string | null;
  readonly stripeChargeId: string | null;
  readonly stripeRefundId: string | null;

  /** Amounts (all in cents) */
  readonly amountCents: number;
  readonly bookingFeeCents: number;
  readonly platformCommissionCents: number;
  readonly stripeFeesCents: number;
  readonly netAmountCents: number;
  readonly refundedAmountCents: number;

  /** Escrow tracking */
  readonly escrowStartedAt: Date | null;
  readonly escrowReleaseAt: Date | null;
  readonly escrowReleasedAt: Date | null;

  /** Idempotency */
  readonly idempotencyKey: string;
  readonly idempotencyKeyExpiresAt: Date;

  /** Metadata */
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

/** Refund request entity */
export interface RefundRequest {
  readonly id: string;
  readonly bookingId: string;
  readonly paymentId: string;
  readonly requestedBy: string;
  readonly reason: RefundReason;
  readonly reasonDetails: string;
  readonly amountCents: number;

  /** Approval workflow */
  readonly requiresAdminApproval: boolean;
  readonly approvedBy: string | null;
  readonly approvedAt: Date | null;
  readonly deniedBy: string | null;
  readonly deniedAt: Date | null;
  readonly denialReason: string | null;

  /** Processing */
  readonly processedAt: Date | null;
  readonly stripeRefundId: string | null;

  /** Audit */
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Input DTO for checkout session creation */
export interface CreateCheckoutDTO {
  readonly bookingId: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly idempotencyKey: string;
}

/** Output DTO for checkout session */
export interface CheckoutSessionDTO {
  readonly sessionId: string;
  readonly checkoutUrl: string;
  readonly expiresAt: string;
}

/** Input DTO for refund request */
export interface CreateRefundDTO {
  readonly bookingId: string;
  readonly reason: RefundReason;
  readonly reasonDetails: string;
  readonly requestedBy: string;
  readonly amountCents?: number;
  readonly adminReason?: string;
}

/** Output DTO for refund response */
export interface RefundResponseDTO {
  readonly id: string;
  readonly bookingId: string;
  readonly reason: RefundReason;
  readonly amountCents: number;
  readonly status: 'PENDING' | 'APPROVED' | 'DENIED' | 'PROCESSED';
  readonly requiresAdminApproval: boolean;
  readonly createdAt: string;
}

/** Fee calculation result */
export interface FeeCalculation {
  readonly basePriceCents: number;
  readonly bookingFeeCents: number;
  readonly totalAmountCents: number;
  readonly platformCommissionCents: number;
  readonly agentPayoutCents: number;
  readonly stripeFeeEstimateCents: number;
}

/** Valid state transitions for payment */
export const VALID_PAYMENT_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  [PaymentState.NOT_STARTED]: [PaymentState.INITIATED],
  [PaymentState.INITIATED]: [
    PaymentState.PROCESSING,
    PaymentState.FAILED,
  ],
  [PaymentState.PROCESSING]: [
    PaymentState.SUCCEEDED,
    PaymentState.FAILED,
  ],
  [PaymentState.SUCCEEDED]: [
    PaymentState.IN_ESCROW,
    PaymentState.REFUND_REQUESTED,
  ],
  [PaymentState.FAILED]: [PaymentState.INITIATED],
  [PaymentState.IN_ESCROW]: [
    PaymentState.RELEASED,
    PaymentState.REFUND_REQUESTED,
  ],
  [PaymentState.RELEASED]: [PaymentState.REFUND_REQUESTED],
  [PaymentState.REFUND_REQUESTED]: [
    PaymentState.REFUND_APPROVED,
    PaymentState.REFUND_DENIED,
  ],
  [PaymentState.REFUND_APPROVED]: [
    PaymentState.REFUNDED,
    PaymentState.PARTIALLY_REFUNDED,
  ],
  [PaymentState.REFUND_DENIED]: [],
  [PaymentState.REFUNDED]: [],
  [PaymentState.PARTIALLY_REFUNDED]: [PaymentState.REFUND_REQUESTED],
};

/** Check if a payment state transition is valid */
export function isValidPaymentTransition(
  from: PaymentState,
  to: PaymentState
): boolean {
  const validTargets = VALID_PAYMENT_TRANSITIONS[from];
  return validTargets?.includes(to) ?? false;
}

/** Check if a refund reason is valid (not subjective) */
export function isRefundableReason(reason: RefundReason): boolean {
  return REFUNDABLE_REASONS.includes(reason);
}

/** Check if a refund reason requires admin approval */
export function requiresAdminApproval(reason: RefundReason): boolean {
  return ADMIN_APPROVAL_REQUIRED.includes(reason);
}
