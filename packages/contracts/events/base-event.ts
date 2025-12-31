/**
 * Base Event Contract
 * All events must extend this interface
 * 
 * Constitution rule enforced:
 * - Rule 18: Every state change MUST emit an audit event
 */

export interface BaseEvent<TPayload = unknown> {
  /** Unique event ID */
  readonly eventId: string;
  
  /** Event type identifier */
  readonly eventType: string;
  
  /** Event version for schema evolution */
  readonly eventVersion: number;
  
  /** When the event occurred */
  readonly timestamp: Date;
  
  /** Correlation ID for distributed tracing */
  readonly correlationId: string;
  
  /** Causation ID (ID of event that caused this event) */
  readonly causationId: string | null;
  
  /** Actor who triggered the event */
  readonly actorId: string;
  
  /** Actor type */
  readonly actorType: 'user' | 'agent' | 'admin' | 'system';
  
  /** Event payload */
  readonly payload: TPayload;
  
  /** Additional metadata */
  readonly metadata: Record<string, unknown>;
}

/**
 * Event type constants
 */
export const EVENT_TYPES = {
  // Request events
  REQUEST_CREATED: 'request.created',
  REQUEST_UPDATED: 'request.updated',
  REQUEST_CANCELLED: 'request.cancelled',
  REQUEST_EXPIRED: 'request.expired',
  
  // Agent matching events
  AGENTS_MATCHED: 'agents.matched',
  AGENT_CONFIRMED: 'agent.confirmed',
  AGENT_DECLINED: 'agent.declined',
  AGENT_REVEALED: 'agent.revealed',
  
  // Itinerary events
  ITINERARY_SUBMITTED: 'itinerary.submitted',
  ITINERARY_SELECTED: 'itinerary.selected',
  
  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  
  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_ISSUED: 'refund.issued',
  
  // Dispute events
  DISPUTE_OPENED: 'dispute.opened',
  DISPUTE_ESCALATED: 'dispute.escalated',
  DISPUTE_RESOLVED: 'dispute.resolved',
  
  // Audit events
  AUDIT_LOGGED: 'audit.logged',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
