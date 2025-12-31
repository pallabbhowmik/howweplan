/**
 * Event Definitions for Dispute Service
 * 
 * This module defines all events that the dispute service:
 * - Publishes (outgoing events)
 * - Subscribes to (incoming events from other services)
 * 
 * Events are the ONLY way modules communicate per architecture rules.
 * Each state change MUST emit an audit event per business rules.
 */

import { DisputeCategory, DisputeState, ResolutionType } from './domain.js';

// =============================================================================
// EVENT BASE TYPES
// =============================================================================

/**
 * Base event structure that all events must follow.
 */
export interface BaseEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: string;
  readonly occurredAt: string;
  readonly source: string;
  readonly correlationId: string;
  readonly causationId: string | null;
}

/**
 * Event metadata for tracing and debugging.
 */
export interface EventMetadata {
  readonly traceId: string;
  readonly spanId: string;
  readonly userId: string | null;
  readonly sessionId: string | null;
}

// =============================================================================
// OUTGOING EVENTS (Published by Dispute Service)
// =============================================================================

/**
 * Emitted when a new dispute is created.
 */
export interface DisputeCreatedEvent extends BaseEvent {
  readonly eventType: 'dispute.created';
  readonly payload: {
    readonly disputeId: string;
    readonly bookingId: string;
    readonly travelerId: string;
    readonly agentId: string;
    readonly category: DisputeCategory;
    readonly title: string;
    readonly isSubjectiveComplaint: boolean;
    readonly bookingAmount: number;
    readonly currency: string;
    readonly agentResponseDeadline: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when evidence is submitted to a dispute.
 */
export interface EvidenceSubmittedEvent extends BaseEvent {
  readonly eventType: 'dispute.evidence_submitted';
  readonly payload: {
    readonly disputeId: string;
    readonly evidenceId: string;
    readonly submittedBy: string;
    readonly submitterType: 'traveler' | 'agent';
    readonly evidenceType: string;
    readonly totalEvidenceCount: number;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when an agent responds to a dispute.
 */
export interface AgentRespondedEvent extends BaseEvent {
  readonly eventType: 'dispute.agent_responded';
  readonly payload: {
    readonly disputeId: string;
    readonly agentId: string;
    readonly acceptsResponsibility: boolean;
    readonly hasProposedResolution: boolean;
    readonly respondedAt: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when a dispute state changes.
 * This is the primary audit event for state transitions.
 */
export interface DisputeStateChangedEvent extends BaseEvent {
  readonly eventType: 'dispute.state_changed';
  readonly payload: {
    readonly disputeId: string;
    readonly previousState: DisputeState;
    readonly newState: DisputeState;
    readonly changedBy: string;
    readonly changedByType: 'traveler' | 'agent' | 'admin' | 'system';
    readonly reason: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when a dispute is assigned to an admin.
 */
export interface DisputeAssignedEvent extends BaseEvent {
  readonly eventType: 'dispute.assigned';
  readonly payload: {
    readonly disputeId: string;
    readonly adminId: string;
    readonly previousAdminId: string | null;
    readonly assignedAt: string;
    readonly reason: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when a dispute is escalated.
 */
export interface DisputeEscalatedEvent extends BaseEvent {
  readonly eventType: 'dispute.escalated';
  readonly payload: {
    readonly disputeId: string;
    readonly escalatedBy: string;
    readonly priority: 'high' | 'critical';
    readonly reason: string;
    readonly escalatedAt: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when a dispute is resolved.
 */
export interface DisputeResolvedEvent extends BaseEvent {
  readonly eventType: 'dispute.resolved';
  readonly payload: {
    readonly disputeId: string;
    readonly bookingId: string;
    readonly travelerId: string;
    readonly agentId: string;
    readonly resolution: ResolutionType;
    readonly refundAmount: number | null;
    readonly currency: string;
    readonly adminId: string;
    readonly reason: string;
    readonly resolvedAt: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when a refund is approved and should be processed.
 * The booking-payments service listens to this event.
 */
export interface RefundApprovedEvent extends BaseEvent {
  readonly eventType: 'dispute.refund_approved';
  readonly payload: {
    readonly disputeId: string;
    readonly bookingId: string;
    readonly travelerId: string;
    readonly agentId: string;
    readonly refundAmount: number;
    readonly currency: string;
    readonly refundType: 'full' | 'partial';
    readonly approvedBy: string;
    readonly approvalReason: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when a dispute is withdrawn by the traveler.
 */
export interface DisputeWithdrawnEvent extends BaseEvent {
  readonly eventType: 'dispute.withdrawn';
  readonly payload: {
    readonly disputeId: string;
    readonly travelerId: string;
    readonly reason: string;
    readonly withdrawnAt: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted when a dispute expires due to inactivity.
 */
export interface DisputeExpiredEvent extends BaseEvent {
  readonly eventType: 'dispute.expired';
  readonly payload: {
    readonly disputeId: string;
    readonly lastActivityAt: string;
    readonly expiredAt: string;
    readonly expirationReason: 'no_evidence' | 'no_agent_response' | 'inactivity';
  };
  readonly metadata: EventMetadata;
}

/**
 * Emitted for agent response deadline warnings.
 */
export interface AgentResponseDeadlineWarningEvent extends BaseEvent {
  readonly eventType: 'dispute.agent_deadline_warning';
  readonly payload: {
    readonly disputeId: string;
    readonly agentId: string;
    readonly deadline: string;
    readonly hoursRemaining: number;
  };
  readonly metadata: EventMetadata;
}

// =============================================================================
// INCOMING EVENTS (Subscribed by Dispute Service)
// =============================================================================

/**
 * Event from booking-payments service when refund is issued.
 */
export interface RefundIssuedEvent extends BaseEvent {
  readonly eventType: 'payment.refund_issued';
  readonly payload: {
    readonly refundId: string;
    readonly disputeId: string;
    readonly bookingId: string;
    readonly amount: number;
    readonly currency: string;
    readonly stripeRefundId: string;
    readonly issuedAt: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event from booking service with booking details.
 */
export interface BookingDetailsEvent extends BaseEvent {
  readonly eventType: 'booking.details_requested';
  readonly payload: {
    readonly bookingId: string;
    readonly travelerId: string;
    readonly agentId: string;
    readonly status: string;
    readonly totalAmount: number;
    readonly currency: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly destination: string;
    readonly itineraryId: string;
    readonly chatThreadId: string;
    readonly completedAt: string | null;
  };
  readonly metadata: EventMetadata;
}

// =============================================================================
// EVENT TYPE UNIONS
// =============================================================================

/**
 * All events published by the dispute service.
 */
export type DisputeServiceOutgoingEvent =
  | DisputeCreatedEvent
  | EvidenceSubmittedEvent
  | AgentRespondedEvent
  | DisputeStateChangedEvent
  | DisputeAssignedEvent
  | DisputeEscalatedEvent
  | DisputeResolvedEvent
  | RefundApprovedEvent
  | DisputeWithdrawnEvent
  | DisputeExpiredEvent
  | AgentResponseDeadlineWarningEvent;

/**
 * All events the dispute service subscribes to.
 */
export type DisputeServiceIncomingEvent =
  | RefundIssuedEvent
  | BookingDetailsEvent;

/**
 * Event type string literals for type-safe event handling.
 */
export type DisputeEventType = DisputeServiceOutgoingEvent['eventType'];
export type IncomingEventType = DisputeServiceIncomingEvent['eventType'];
