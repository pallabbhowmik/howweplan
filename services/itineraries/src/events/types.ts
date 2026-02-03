/**
 * Event types published and consumed by the itineraries service.
 * 
 * All events follow a consistent structure:
 * - type: Event name (domain.action format)
 * - payload: Event-specific data
 * - metadata: Standard metadata (timestamp, correlationId, source)
 */

/**
 * Base event metadata.
 */
export interface EventMetadata {
  timestamp: string;
  correlationId: string;
  source: string;
  traceId?: string;
  spanId?: string;
}

/**
 * Base event structure.
 */
export interface BaseEvent<T = unknown> {
  type: string;
  payload: T;
  metadata: EventMetadata;
}

// ============================================================
// PUBLISHED EVENTS
// ============================================================

/**
 * Emitted when a new itinerary submission is created.
 */
export interface ItinerarySubmittedPayload {
  submissionId: string;
  requestId: string;
  agentId: string;
  travelerId: string;
  source: 'PDF_UPLOAD' | 'EXTERNAL_LINK' | 'FREE_TEXT' | 'STRUCTURED_INPUT';
}

export type ItinerarySubmittedEvent = BaseEvent<ItinerarySubmittedPayload>;

/**
 * Emitted when an itinerary is updated.
 */
export interface ItineraryUpdatedPayload {
  itineraryId: string;
  requestId: string;
  agentId: string;
  travelerId: string;
  version: number;
  changedBy: string;
  changedByRole: 'AGENT' | 'ADMIN' | 'SYSTEM';
}

export type ItineraryUpdatedEvent = BaseEvent<ItineraryUpdatedPayload>;

/**
 * Emitted when an agent updates their proposal.
 */
export interface ItineraryProposalUpdatedPayload {
  itineraryId: string;
  requestId: string;
  agentId: string;
  travelerId: string;
  version: number;
  previousVersion: number;
  changeReason: string;
  updatedAt: string;
  proposalSummary: {
    title?: string;
    totalPrice?: number;
    currency: string;
  };
}

export type ItineraryProposalUpdatedEvent = BaseEvent<ItineraryProposalUpdatedPayload>;

/**
 * Emitted when a new version is created.
 */
export interface VersionCreatedPayload {
  versionId: string;
  itineraryId: string;
  version: number;
  changedBy: string;
  changedByRole: 'AGENT' | 'ADMIN' | 'SYSTEM';
}

export type VersionCreatedEvent = BaseEvent<VersionCreatedPayload>;

/**
 * Emitted when an itinerary is disclosed (revealed).
 */
export interface ItineraryDisclosedPayload {
  itineraryId: string;
  bookingId: string;
  disclosureState: 'REVEALED';
  disclosedAt: string;
}

export type ItineraryDisclosedEvent = BaseEvent<ItineraryDisclosedPayload>;

/**
 * Emitted when itinerary status changes.
 */
export interface ItineraryStatusChangedPayload {
  itineraryId: string;
  requestId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedByRole: 'AGENT' | 'ADMIN' | 'SYSTEM';
  reason?: string;
}

export type ItineraryStatusChangedEvent = BaseEvent<ItineraryStatusChangedPayload>;

// ============================================================
// CONSUMED EVENTS
// ============================================================

/**
 * Booking paid event - triggers disclosure.
 */
export interface BookingPaidPayload {
  bookingId: string;
  itineraryId: string;
  travelerId: string;
  agentId: string;
  paidAt: string;
  amount: number;
  currency: string;
}

export type BookingPaidEvent = BaseEvent<BookingPaidPayload>;

/**
 * Booking cancelled event - triggers re-obfuscation.
 */
export interface BookingCancelledPayload {
  bookingId: string;
  itineraryId: string;
  travelerId: string;
  cancelledAt: string;
  reason: string;
}

export type BookingCancelledEvent = BaseEvent<BookingCancelledPayload>;

// ============================================================
// AUDIT EVENTS
// ============================================================

/**
 * Audit event for all state changes.
 */
export interface AuditEventPayload {
  eventType: string;
  entityType: 'submission' | 'itinerary' | 'itinerary_version';
  entityId: string;
  actorId: string;
  actorRole: 'TRAVELER' | 'AGENT' | 'ADMIN' | 'SYSTEM';
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export type AuditEvent = BaseEvent<AuditEventPayload>;

// ============================================================
// EVENT TYPE REGISTRY
// ============================================================

/**
 * All published event types.
 */
export type PublishedEvent =
  | ItinerarySubmittedEvent
  | ItineraryUpdatedEvent
  | ItineraryProposalUpdatedEvent
  | VersionCreatedEvent
  | ItineraryDisclosedEvent
  | ItineraryStatusChangedEvent
  | AuditEvent;

/**
 * All consumed event types.
 */
export type ConsumedEvent =
  | BookingPaidEvent
  | BookingCancelledEvent;

/**
 * Event type constants.
 */
export const EventTypes = {
  // Published
  ITINERARY_SUBMITTED: 'itinerary.submitted',
  ITINERARY_UPDATED: 'itinerary.updated',
  ITINERARY_PROPOSAL_UPDATED: 'itinerary.proposal_updated',
  ITINERARY_VERSION_CREATED: 'itinerary.version.created',
  ITINERARY_DISCLOSED: 'itinerary.disclosed',
  ITINERARY_STATUS_CHANGED: 'itinerary.status_changed',
  AUDIT: 'audit',

  // Consumed
  BOOKING_PAID: 'booking.paid',
  BOOKING_CANCELLED: 'booking.cancelled',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];
