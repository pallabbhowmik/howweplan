/**
 * Domain Event Types
 * 
 * Contracts for events consumed by the notification service.
 * These types represent the shared contract between services.
 * 
 * IMPORTANT: This service does NOT contain business logic.
 * It only reacts to domain events and sends notifications.
 */

/**
 * Base event structure
 */
export interface DomainEvent<T = unknown> {
  /** Unique event ID */
  eventId: string;
  /** Event type identifier */
  eventType: string;
  /** Event version for schema evolution */
  version: number;
  /** Timestamp when event occurred */
  timestamp: Date;
  /** Source service that emitted the event */
  source: string;
  /** Correlation ID for distributed tracing */
  correlationId: string;
  /** Event payload */
  payload: T;
}

// =============================================================================
// BOOKING EVENTS
// =============================================================================

export interface BookingCreatedPayload {
  bookingId: string;
  userId: string;
  agentId: string;
  tripRequestId: string;
  itineraryId: string;
  totalAmount: number;
  currency: string;
  userEmail: string;
  userFirstName: string;
}

export interface BookingConfirmedPayload {
  bookingId: string;
  userId: string;
  agentId: string;
  userEmail: string;
  userFirstName: string;
  agentEmail: string;
  agentFirstName: string;
  tripSummary: string;
  departureDate: string;
  returnDate: string;
  totalAmount: number;
  currency: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  userId: string;
  agentId: string;
  userEmail: string;
  agentEmail: string;
  reason: string;
  cancelledBy: 'user' | 'agent' | 'admin' | 'system';
  refundAmount?: number;
  currency?: string;
}

export interface PaymentReceivedPayload {
  bookingId: string;
  userId: string;
  paymentId: string;
  amount: number;
  currency: string;
  userEmail: string;
  userFirstName: string;
}

export interface PaymentFailedPayload {
  bookingId: string;
  userId: string;
  paymentId: string;
  amount: number;
  currency: string;
  userEmail: string;
  userFirstName: string;
  failureReason: string;
}

// =============================================================================
// AGENT EVENTS
// =============================================================================

export interface AgentAssignedPayload {
  tripRequestId: string;
  agentId: string;
  userId: string;
  agentEmail: string;
  agentFirstName: string;
  userEmail: string;
  userFirstName: string;
  tripSummary: string;
}

export interface AgentConfirmedPayload {
  tripRequestId: string;
  agentId: string;
  userId: string;
  agentEmail: string;
  agentFirstName: string;
  agentPhotoUrl?: string;
  userEmail: string;
  userFirstName: string;
}

export interface ItinerarySubmittedPayload {
  itineraryId: string;
  tripRequestId: string;
  agentId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  /** Obfuscated itinerary summary for pre-payment viewing */
  obfuscatedSummary: string;
}

export interface ItineraryRevisionRequestedPayload {
  itineraryId: string;
  tripRequestId: string;
  agentId: string;
  userId: string;
  agentEmail: string;
  agentFirstName: string;
  revisionNotes: string;
}

// =============================================================================
// CHAT EVENTS
// =============================================================================

export interface ChatMessageReceivedPayload {
  chatId: string;
  messageId: string;
  senderId: string;
  senderType: 'user' | 'agent';
  recipientId: string;
  recipientEmail: string;
  recipientFirstName: string;
  messagePreview: string;
  tripRequestId?: string;
}

// =============================================================================
// REFUND EVENTS
// =============================================================================

export interface RefundRequestedPayload {
  refundId: string;
  bookingId: string;
  userId: string;
  agentId: string;
  userEmail: string;
  agentEmail: string;
  amount: number;
  currency: string;
  reason: string;
}

export interface RefundApprovedPayload {
  refundId: string;
  bookingId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  amount: number;
  currency: string;
  estimatedArrival: string;
}

export interface RefundRejectedPayload {
  refundId: string;
  bookingId: string;
  userId: string;
  userEmail: string;
  userFirstName: string;
  reason: string;
}

// =============================================================================
// DISPUTE EVENTS
// =============================================================================

export interface DisputeOpenedPayload {
  disputeId: string;
  bookingId: string;
  userId: string;
  agentId: string;
  userEmail: string;
  agentEmail: string;
  adminEmail: string;
  description: string;
}

export interface DisputeResolvedPayload {
  disputeId: string;
  bookingId: string;
  userId: string;
  agentId: string;
  userEmail: string;
  agentEmail: string;
  resolution: string;
  resolvedBy: string;
}

// =============================================================================
// USER EVENTS
// =============================================================================

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  firstName: string;
  verificationToken: string;
}

export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
  firstName: string;
  resetToken: string;
  expiresAt: string;
}

export interface EmailVerifiedPayload {
  userId: string;
  email: string;
  firstName: string;
}

// =============================================================================
// EVENT TYPE CONSTANTS
// =============================================================================

export const EventTypes = {
  // Booking events
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',

  // Agent events
  AGENT_ASSIGNED: 'agent.assigned',
  AGENT_CONFIRMED: 'agent.confirmed',
  ITINERARY_SUBMITTED: 'itinerary.submitted',
  ITINERARY_REVISION_REQUESTED: 'itinerary.revision_requested',

  // Chat events
  CHAT_MESSAGE_RECEIVED: 'chat.message_received',

  // Refund events
  REFUND_REQUESTED: 'refund.requested',
  REFUND_APPROVED: 'refund.approved',
  REFUND_REJECTED: 'refund.rejected',

  // Dispute events
  DISPUTE_OPENED: 'dispute.opened',
  DISPUTE_RESOLVED: 'dispute.resolved',

  // User events (from identity service)
  USER_REGISTERED: 'identity.user.registered',
  PASSWORD_RESET_REQUESTED: 'identity.user.password_reset_requested',
  EMAIL_VERIFIED: 'identity.user.email_verified',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
