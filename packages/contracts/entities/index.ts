/**
 * Entities Barrel Export
 * Re-exports all domain entity interfaces
 */

export {
  type User,
  type ObfuscatedUser,
} from './user';

export {
  type Agent,
  type ObfuscatedAgent,
  type RevealedAgent,
  type AgentContactDetails,
} from './agent';

export {
  type Admin,
  type AdminRole,
  type AdminPermission,
  type AdminActionContext,
} from './admin';

export {
  type TravelRequest,
  type TravelRequestDestination,
  type TravelRequestDates,
  type TravelRequestBudget,
  type TravelRequestTravelers,
  type TravelRequestPreferences,
} from './travel-request';

export {
  type ItineraryOption,
  type ItinerarySubmissionFormat,
  type ObfuscatedItineraryItem,
  type RevealedItineraryItem,
  type ItineraryPricing,
} from './itinerary-option';

export {
  type Booking,
  type BookingFinancials,
  type BookingTimeline,
  type CancellationPolicy,
} from './booking';

export {
  type Payment,
  type PaymentMethod,
  type PaymentBreakdown,
  type PaymentRefund,
  type AgentPayout,
} from './payment';

export {
  type Message,
  type MessageType,
  type MessageSender,
  type MessageAttachment,
  type Conversation,
  type SystemMessageTemplate,
} from './message';

export {
  type Dispute,
  type DisputeCategory,
  type DisputeEvidence,
  type DisputeResolution,
  type DisputeTimelineEntry,
  SUBJECTIVE_DISPUTE_CATEGORIES,
  REFUNDABLE_DISPUTE_CATEGORIES,
} from './dispute';

export {
  type Review,
  type ReviewRatings,
  type AgentRatingsSummary,
} from './review';

export {
  type AuditEvent,
  type AuditEventCategory,
  type AuditEventSeverity,
  type AuditEventActor,
  type AuditEventTarget,
  type AuditEventStateChange,
  type AuditAction,
} from './audit-event';
