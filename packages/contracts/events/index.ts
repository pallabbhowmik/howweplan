/**
 * Events Barrel Export
 * Re-exports all event contracts
 */

export {
  type BaseEvent,
  EVENT_TYPES,
  type EventType,
} from './base-event';

export {
  type RequestCreatedPayload,
  type RequestCreatedEvent,
  type AgentsMatchedPayload,
  type AgentsMatchedEvent,
  type AgentConfirmedPayload,
  type AgentConfirmedEvent,
  type AgentRevealedPayload,
  type AgentRevealedEvent,
} from './request-events';

export {
  type PaymentAuthorizedPayload,
  type PaymentAuthorizedEvent,
  type PaymentCapturedPayload,
  type PaymentCapturedEvent,
  type RefundIssuedPayload,
  type RefundIssuedEvent,
} from './payment-events';

export {
  type BookingConfirmedPayload,
  type BookingConfirmedEvent,
  type BookingCancelledPayload,
  type BookingCancelledEvent,
  type BookingCompletedPayload,
  type BookingCompletedEvent,
} from './booking-events';

export {
  type DisputeOpenedPayload,
  type DisputeOpenedEvent,
  type DisputeEscalatedPayload,
  type DisputeEscalatedEvent,
  type DisputeResolvedPayload,
  type DisputeResolvedEvent,
} from './dispute-events';

export {
  type AuditLoggedPayload,
  type AuditLoggedEvent,
  type AdminActionPayload,
  type AdminActionEvent,
} from './audit-events';

// =============================================================================
// TRUST & REPUTATION EVENTS
// =============================================================================

export {
  TRUST_EVENT_TYPES,
  type TrustEventType,
  type ReviewSubmittedPayload,
  type ReviewSubmittedEvent,
  type ReviewHiddenPayload,
  type ReviewHiddenEvent,
  type BadgeAssignedPayload,
  type BadgeAssignedEvent,
  type BadgeRevokedPayload,
  type BadgeRevokedEvent,
  type AgentViolationDetectedPayload,
  type AgentViolationDetectedEvent,
  type ViolationResolvedPayload,
  type ViolationResolvedEvent,
  type TrustLevelChangedPayload,
  type TrustLevelChangedEvent,
  type AgentStatsRecalculatedPayload,
  type AgentStatsRecalculatedEvent,
  type ReviewUnlockedPayload,
  type ReviewUnlockedEvent,
} from './trust-events';
