/**
 * Request State Machine
 * Defines the lifecycle of a travel request
 */

export enum RequestState {
  /** Initial state when user creates a request */
  DRAFT = 'DRAFT',
  
  /** Request submitted and awaiting agent matching */
  SUBMITTED = 'SUBMITTED',
  
  /** Agents have been matched to the request */
  AGENTS_MATCHED = 'AGENTS_MATCHED',
  
  /** At least one agent has confirmed interest */
  AGENT_CONFIRMED = 'AGENT_CONFIRMED',
  
  /** Itineraries have been submitted by agents */
  ITINERARIES_RECEIVED = 'ITINERARIES_RECEIVED',
  
  /** User has selected an itinerary */
  ITINERARY_SELECTED = 'ITINERARY_SELECTED',
  
  /** Chat requirement met, ready for payment */
  READY_FOR_PAYMENT = 'READY_FOR_PAYMENT',
  
  /** Payment in progress */
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  
  /** Booking confirmed and active */
  BOOKED = 'BOOKED',
  
  /** Trip completed successfully */
  COMPLETED = 'COMPLETED',
  
  /** Request cancelled by user */
  CANCELLED = 'CANCELLED',
  
  /** Request expired without completion */
  EXPIRED = 'EXPIRED',
}

/**
 * Valid state transitions for RequestState
 * Enforces the state machine rules
 */
export const REQUEST_STATE_TRANSITIONS: Record<RequestState, readonly RequestState[]> = {
  [RequestState.DRAFT]: [RequestState.SUBMITTED, RequestState.CANCELLED],
  [RequestState.SUBMITTED]: [RequestState.AGENTS_MATCHED, RequestState.CANCELLED, RequestState.EXPIRED],
  [RequestState.AGENTS_MATCHED]: [RequestState.AGENT_CONFIRMED, RequestState.CANCELLED, RequestState.EXPIRED],
  [RequestState.AGENT_CONFIRMED]: [RequestState.ITINERARIES_RECEIVED, RequestState.CANCELLED, RequestState.EXPIRED],
  [RequestState.ITINERARIES_RECEIVED]: [RequestState.ITINERARY_SELECTED, RequestState.CANCELLED, RequestState.EXPIRED],
  [RequestState.ITINERARY_SELECTED]: [RequestState.READY_FOR_PAYMENT, RequestState.CANCELLED],
  [RequestState.READY_FOR_PAYMENT]: [RequestState.PAYMENT_PENDING, RequestState.CANCELLED],
  [RequestState.PAYMENT_PENDING]: [RequestState.BOOKED, RequestState.READY_FOR_PAYMENT, RequestState.CANCELLED],
  [RequestState.BOOKED]: [RequestState.COMPLETED, RequestState.CANCELLED],
  [RequestState.COMPLETED]: [],
  [RequestState.CANCELLED]: [],
  [RequestState.EXPIRED]: [],
} as const;
