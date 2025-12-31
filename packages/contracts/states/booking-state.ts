/**
 * Booking State Machine
 * Defines the lifecycle of a booking
 * 
 * Constitution rules enforced:
 * - Rule 3: Platform earns commission only on COMPLETED bookings
 * - Rule 14: Refunds follow strict lifecycle state machines
 */

export enum BookingState {
  /** Booking created, awaiting payment authorization */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  
  /** Payment authorized, awaiting capture */
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',
  
  /** Payment captured, booking confirmed */
  CONFIRMED = 'CONFIRMED',
  
  /** Trip is currently in progress */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /** Trip completed successfully - commission earned (rule 3) */
  COMPLETED = 'COMPLETED',
  
  /** Cancelled before trip started */
  CANCELLED_PRE_TRIP = 'CANCELLED_PRE_TRIP',
  
  /** Cancelled during trip */
  CANCELLED_DURING_TRIP = 'CANCELLED_DURING_TRIP',
  
  /** Refund in progress */
  REFUND_PENDING = 'REFUND_PENDING',
  
  /** Full refund issued */
  REFUNDED_FULL = 'REFUNDED_FULL',
  
  /** Partial refund issued */
  REFUNDED_PARTIAL = 'REFUNDED_PARTIAL',
  
  /** Under dispute (rule 15) */
  DISPUTED = 'DISPUTED',
  
  /** Dispute resolved */
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
}

/**
 * Valid state transitions for BookingState
 * Enforces the strict refund lifecycle (rule 14)
 */
export const BOOKING_STATE_TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
  [BookingState.PENDING_PAYMENT]: [BookingState.PAYMENT_AUTHORIZED, BookingState.CANCELLED_PRE_TRIP],
  [BookingState.PAYMENT_AUTHORIZED]: [BookingState.CONFIRMED, BookingState.CANCELLED_PRE_TRIP, BookingState.REFUND_PENDING],
  [BookingState.CONFIRMED]: [BookingState.IN_PROGRESS, BookingState.CANCELLED_PRE_TRIP, BookingState.DISPUTED],
  [BookingState.IN_PROGRESS]: [BookingState.COMPLETED, BookingState.CANCELLED_DURING_TRIP, BookingState.DISPUTED],
  [BookingState.COMPLETED]: [BookingState.DISPUTED], // Can still dispute after completion
  [BookingState.CANCELLED_PRE_TRIP]: [BookingState.REFUND_PENDING],
  [BookingState.CANCELLED_DURING_TRIP]: [BookingState.REFUND_PENDING, BookingState.DISPUTED],
  [BookingState.REFUND_PENDING]: [BookingState.REFUNDED_FULL, BookingState.REFUNDED_PARTIAL, BookingState.DISPUTED],
  [BookingState.REFUNDED_FULL]: [],
  [BookingState.REFUNDED_PARTIAL]: [BookingState.DISPUTED],
  [BookingState.DISPUTED]: [BookingState.DISPUTE_RESOLVED],
  [BookingState.DISPUTE_RESOLVED]: [BookingState.REFUND_PENDING, BookingState.COMPLETED],
} as const;

/**
 * Booking states where commission is earned (rule 3)
 */
export const COMMISSION_ELIGIBLE_STATES: readonly BookingState[] = [
  BookingState.COMPLETED,
] as const;

/**
 * Booking states eligible for refund consideration
 */
export const REFUND_ELIGIBLE_STATES: readonly BookingState[] = [
  BookingState.PAYMENT_AUTHORIZED,
  BookingState.CONFIRMED,
  BookingState.IN_PROGRESS,
  BookingState.CANCELLED_PRE_TRIP,
  BookingState.CANCELLED_DURING_TRIP,
  BookingState.DISPUTED,
] as const;
