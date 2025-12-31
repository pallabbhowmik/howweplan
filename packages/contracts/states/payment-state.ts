/**
 * Payment State Machine
 * Defines the lifecycle of a payment
 * 
 * Constitution rules enforced:
 * - Rule 1: Platform is Merchant of Record
 * - Rule 2: Payment processing fees passed to user
 * - Rule 14: Refunds follow strict lifecycle state machines
 */

export enum PaymentState {
  /** Payment intent created */
  INITIATED = 'INITIATED',
  
  /** Awaiting user payment action */
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  
  /** Payment processing */
  PROCESSING = 'PROCESSING',
  
  /** Payment authorized, funds held */
  AUTHORIZED = 'AUTHORIZED',
  
  /** Payment captured, funds transferred */
  CAPTURED = 'CAPTURED',
  
  /** Payment failed */
  FAILED = 'FAILED',
  
  /** Payment cancelled before completion */
  CANCELLED = 'CANCELLED',
  
  /** Partial refund issued */
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  
  /** Full refund issued */
  FULLY_REFUNDED = 'FULLY_REFUNDED',
  
  /** Refund in progress */
  REFUND_PROCESSING = 'REFUND_PROCESSING',
  
  /** Payment disputed with payment processor */
  CHARGEBACK_INITIATED = 'CHARGEBACK_INITIATED',
  
  /** Chargeback resolved */
  CHARGEBACK_RESOLVED = 'CHARGEBACK_RESOLVED',
}

/**
 * Valid state transitions for PaymentState
 * Enforces strict refund lifecycle (rule 14)
 */
export const PAYMENT_STATE_TRANSITIONS: Record<PaymentState, readonly PaymentState[]> = {
  [PaymentState.INITIATED]: [PaymentState.AWAITING_PAYMENT, PaymentState.CANCELLED],
  [PaymentState.AWAITING_PAYMENT]: [PaymentState.PROCESSING, PaymentState.CANCELLED, PaymentState.FAILED],
  [PaymentState.PROCESSING]: [PaymentState.AUTHORIZED, PaymentState.FAILED],
  [PaymentState.AUTHORIZED]: [PaymentState.CAPTURED, PaymentState.CANCELLED, PaymentState.REFUND_PROCESSING],
  [PaymentState.CAPTURED]: [PaymentState.REFUND_PROCESSING, PaymentState.CHARGEBACK_INITIATED],
  [PaymentState.FAILED]: [],
  [PaymentState.CANCELLED]: [],
  [PaymentState.REFUND_PROCESSING]: [PaymentState.PARTIALLY_REFUNDED, PaymentState.FULLY_REFUNDED, PaymentState.FAILED],
  [PaymentState.PARTIALLY_REFUNDED]: [PaymentState.REFUND_PROCESSING, PaymentState.CHARGEBACK_INITIATED],
  [PaymentState.FULLY_REFUNDED]: [],
  [PaymentState.CHARGEBACK_INITIATED]: [PaymentState.CHARGEBACK_RESOLVED],
  [PaymentState.CHARGEBACK_RESOLVED]: [],
} as const;

/**
 * Terminal payment states (no further transitions)
 */
export const TERMINAL_PAYMENT_STATES: readonly PaymentState[] = [
  PaymentState.FAILED,
  PaymentState.CANCELLED,
  PaymentState.FULLY_REFUNDED,
  PaymentState.CHARGEBACK_RESOLVED,
] as const;

/**
 * Payment states where funds are held/captured
 */
export const FUNDS_HELD_STATES: readonly PaymentState[] = [
  PaymentState.AUTHORIZED,
  PaymentState.CAPTURED,
  PaymentState.PARTIALLY_REFUNDED,
] as const;
