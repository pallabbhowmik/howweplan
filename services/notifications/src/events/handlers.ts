import {
  DomainEvent,
  EventType,
  EventTypes,
  BookingCreatedPayload,
  BookingConfirmedPayload,
  BookingCancelledPayload,
  PaymentReceivedPayload,
  PaymentFailedPayload,
  AgentAssignedPayload,
  AgentConfirmedPayload,
  ItinerarySubmittedPayload,
  ItineraryProposalUpdatedPayload,
  ItineraryRevisionRequestedPayload,
  ChatMessageReceivedPayload,
  RefundRequestedPayload,
  RefundApprovedPayload,
  RefundRejectedPayload,
  DisputeOpenedPayload,
  DisputeResolvedPayload,
  UserRegisteredPayload,
  PasswordResetRequestedPayload,
  EmailVerifiedPayload,
} from './types';
import { NotificationService } from '../services/notification.service';
import { AuditService } from '../services/audit.service';

/**
 * Event Handler Registry
 * 
 * Maps domain events to notification actions.
 * Contains NO business logic - only maps events to notifications.
 */

export type EventHandler<T = unknown> = (
  event: DomainEvent<T>,
  notificationService: NotificationService,
  auditService: AuditService
) => Promise<void>;

const handlers = new Map<EventType, EventHandler>();

/**
 * Register an event handler
 */
function registerHandler<T>(eventType: EventType, handler: EventHandler<T>): void {
  handlers.set(eventType, handler as EventHandler);
}

/**
 * Get handler for event type
 */
export function getHandler(eventType: string): EventHandler | undefined {
  return handlers.get(eventType as EventType);
}

/**
 * Get all registered event types
 */
export function getRegisteredEventTypes(): string[] {
  return Array.from(handlers.keys());
}

// =============================================================================
// BOOKING EVENT HANDLERS
// =============================================================================

registerHandler<BookingCreatedPayload>(
  EventTypes.BOOKING_CREATED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-booking-created-user`,
      recipient: payload.userEmail,
      templateId: 'booking-created',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        bookingId: payload.bookingId,
        totalAmount: payload.totalAmount,
        currency: payload.currency,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'booking',
      entityId: payload.bookingId,
      action: 'booking_created_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { recipient: payload.userEmail, template: 'booking-created' },
    });
  }
);

registerHandler<BookingConfirmedPayload>(
  EventTypes.BOOKING_CONFIRMED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    // Notify user
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-booking-confirmed-user`,
      recipient: payload.userEmail,
      templateId: 'booking-confirmed-user',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        bookingId: payload.bookingId,
        agentFirstName: payload.agentFirstName,
        tripSummary: payload.tripSummary,
        departureDate: payload.departureDate,
        returnDate: payload.returnDate,
        totalAmount: payload.totalAmount,
        currency: payload.currency,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        agentId: payload.agentId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    // Notify agent
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-booking-confirmed-agent`,
      recipient: payload.agentEmail,
      templateId: 'booking-confirmed-agent',
      priority: 'high',
      variables: {
        firstName: payload.agentFirstName,
        bookingId: payload.bookingId,
        userFirstName: payload.userFirstName,
        tripSummary: payload.tripSummary,
        departureDate: payload.departureDate,
        returnDate: payload.returnDate,
        totalAmount: payload.totalAmount,
        currency: payload.currency,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        agentId: payload.agentId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'booking',
      entityId: payload.bookingId,
      action: 'booking_confirmed_notifications',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { recipients: [payload.userEmail, payload.agentEmail] },
    });
  }
);

registerHandler<BookingCancelledPayload>(
  EventTypes.BOOKING_CANCELLED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    // Notify user
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-booking-cancelled-user`,
      recipient: payload.userEmail,
      templateId: 'booking-cancelled-user',
      priority: 'high',
      variables: {
        bookingId: payload.bookingId,
        reason: payload.reason,
        cancelledBy: payload.cancelledBy,
        refundAmount: payload.refundAmount,
        currency: payload.currency,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    // Notify agent
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-booking-cancelled-agent`,
      recipient: payload.agentEmail,
      templateId: 'booking-cancelled-agent',
      priority: 'normal',
      variables: {
        bookingId: payload.bookingId,
        reason: payload.reason,
        cancelledBy: payload.cancelledBy,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        agentId: payload.agentId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'booking',
      entityId: payload.bookingId,
      action: 'booking_cancelled_notifications',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { cancelledBy: payload.cancelledBy },
    });
  }
);

registerHandler<PaymentReceivedPayload>(
  EventTypes.PAYMENT_RECEIVED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-payment-received`,
      recipient: payload.userEmail,
      templateId: 'payment-received',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        bookingId: payload.bookingId,
        paymentId: payload.paymentId,
        amount: payload.amount,
        currency: payload.currency,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'payment',
      entityId: payload.paymentId,
      action: 'payment_received_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { amount: payload.amount, currency: payload.currency },
    });
  }
);

registerHandler<PaymentFailedPayload>(
  EventTypes.PAYMENT_FAILED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-payment-failed`,
      recipient: payload.userEmail,
      templateId: 'payment-failed',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        bookingId: payload.bookingId,
        amount: payload.amount,
        currency: payload.currency,
        failureReason: payload.failureReason,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'payment',
      entityId: payload.paymentId,
      action: 'payment_failed_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { failureReason: payload.failureReason },
    });
  }
);

// =============================================================================
// AGENT EVENT HANDLERS
// =============================================================================

registerHandler<AgentAssignedPayload>(
  EventTypes.AGENT_ASSIGNED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    // Notify agent of new assignment
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-agent-assigned`,
      recipient: payload.agentEmail,
      templateId: 'agent-assigned',
      priority: 'high',
      variables: {
        firstName: payload.agentFirstName,
        tripRequestId: payload.tripRequestId,
        tripSummary: payload.tripSummary,
        // Note: User details are NOT included (semi-blind pre-confirmation)
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        agentId: payload.agentId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'trip_request',
      entityId: payload.tripRequestId,
      action: 'agent_assigned_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { agentId: payload.agentId },
    });
  }
);

registerHandler<AgentConfirmedPayload>(
  EventTypes.AGENT_CONFIRMED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    // Notify user that agent confirmed (first name + photo only per rules)
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-agent-confirmed-user`,
      recipient: payload.userEmail,
      templateId: 'agent-confirmed-user',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        agentFirstName: payload.agentFirstName,
        agentPhotoUrl: payload.agentPhotoUrl,
        tripRequestId: payload.tripRequestId,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        agentId: payload.agentId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'trip_request',
      entityId: payload.tripRequestId,
      action: 'agent_confirmed_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { agentId: payload.agentId, userId: payload.userId },
    });
  }
);

registerHandler<ItinerarySubmittedPayload>(
  EventTypes.ITINERARY_SUBMITTED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-itinerary-submitted`,
      recipient: payload.userEmail,
      templateId: 'itinerary-submitted',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        itineraryId: payload.itineraryId,
        tripRequestId: payload.tripRequestId,
        // Obfuscated summary per pre-payment rules
        obfuscatedSummary: payload.obfuscatedSummary,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        agentId: payload.agentId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'itinerary',
      entityId: payload.itineraryId,
      action: 'itinerary_submitted_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: {},
    });
  }
);

registerHandler<ItineraryProposalUpdatedPayload>(
  EventTypes.ITINERARY_PROPOSAL_UPDATED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-proposal-updated`,
      recipient: payload.userEmail,
      templateId: 'proposal-updated',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        itineraryId: payload.itineraryId,
        tripRequestId: payload.tripRequestId,
        version: payload.version,
        previousVersion: payload.previousVersion,
        changeReason: payload.changeReason || 'The agent has updated the proposal details.',
        proposalTitle: payload.proposalSummary.title,
        totalPrice: payload.proposalSummary.totalPrice,
        currency: payload.proposalSummary.currency,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        agentId: payload.agentId,
        itineraryId: payload.itineraryId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'itinerary',
      entityId: payload.itineraryId,
      action: 'proposal_updated_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { 
        version: payload.version,
        previousVersion: payload.previousVersion,
        changeReason: payload.changeReason,
      },
    });
  }
);

registerHandler<ItineraryRevisionRequestedPayload>(
  EventTypes.ITINERARY_REVISION_REQUESTED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-revision-requested`,
      recipient: payload.agentEmail,
      templateId: 'itinerary-revision-requested',
      priority: 'high',
      variables: {
        firstName: payload.agentFirstName,
        itineraryId: payload.itineraryId,
        tripRequestId: payload.tripRequestId,
        revisionNotes: payload.revisionNotes,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        agentId: payload.agentId,
        userId: payload.userId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'itinerary',
      entityId: payload.itineraryId,
      action: 'revision_requested_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: {},
    });
  }
);

// =============================================================================
// CHAT EVENT HANDLERS
// =============================================================================

registerHandler<ChatMessageReceivedPayload>(
  EventTypes.CHAT_MESSAGE_RECEIVED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-chat-message`,
      recipient: payload.recipientEmail,
      templateId: 'chat-message-received',
      priority: 'normal',
      variables: {
        firstName: payload.recipientFirstName,
        senderType: payload.senderType,
        messagePreview: payload.messagePreview,
        chatId: payload.chatId,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.senderType === 'user' ? payload.senderId : payload.recipientId,
        agentId: payload.senderType === 'agent' ? payload.senderId : undefined,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'chat',
      entityId: payload.chatId,
      action: 'chat_message_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { messageId: payload.messageId },
    });
  }
);

// =============================================================================
// REFUND EVENT HANDLERS
// =============================================================================

registerHandler<RefundRequestedPayload>(
  EventTypes.REFUND_REQUESTED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    // Notify user of refund request acknowledgment
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-refund-requested-user`,
      recipient: payload.userEmail,
      templateId: 'refund-requested-user',
      priority: 'high',
      variables: {
        refundId: payload.refundId,
        bookingId: payload.bookingId,
        amount: payload.amount,
        currency: payload.currency,
        reason: payload.reason,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    // Notify agent of refund request
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-refund-requested-agent`,
      recipient: payload.agentEmail,
      templateId: 'refund-requested-agent',
      priority: 'normal',
      variables: {
        refundId: payload.refundId,
        bookingId: payload.bookingId,
        amount: payload.amount,
        currency: payload.currency,
        reason: payload.reason,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        agentId: payload.agentId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'refund',
      entityId: payload.refundId,
      action: 'refund_requested_notifications',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { amount: payload.amount },
    });
  }
);

registerHandler<RefundApprovedPayload>(
  EventTypes.REFUND_APPROVED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-refund-approved`,
      recipient: payload.userEmail,
      templateId: 'refund-approved',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        refundId: payload.refundId,
        bookingId: payload.bookingId,
        amount: payload.amount,
        currency: payload.currency,
        estimatedArrival: payload.estimatedArrival,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'refund',
      entityId: payload.refundId,
      action: 'refund_approved_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { amount: payload.amount },
    });
  }
);

registerHandler<RefundRejectedPayload>(
  EventTypes.REFUND_REJECTED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-refund-rejected`,
      recipient: payload.userEmail,
      templateId: 'refund-rejected',
      priority: 'high',
      variables: {
        firstName: payload.userFirstName,
        refundId: payload.refundId,
        bookingId: payload.bookingId,
        reason: payload.reason,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'refund',
      entityId: payload.refundId,
      action: 'refund_rejected_notification',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { reason: payload.reason },
    });
  }
);

// =============================================================================
// DISPUTE EVENT HANDLERS
// =============================================================================

registerHandler<DisputeOpenedPayload>(
  EventTypes.DISPUTE_OPENED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    // Notify user
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-dispute-opened-user`,
      recipient: payload.userEmail,
      templateId: 'dispute-opened-user',
      priority: 'high',
      variables: {
        disputeId: payload.disputeId,
        bookingId: payload.bookingId,
        description: payload.description,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    // Notify agent
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-dispute-opened-agent`,
      recipient: payload.agentEmail,
      templateId: 'dispute-opened-agent',
      priority: 'high',
      variables: {
        disputeId: payload.disputeId,
        bookingId: payload.bookingId,
        description: payload.description,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        agentId: payload.agentId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    // Notify admin for arbitration
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-dispute-opened-admin`,
      recipient: payload.adminEmail,
      templateId: 'dispute-opened-admin',
      priority: 'critical',
      variables: {
        disputeId: payload.disputeId,
        bookingId: payload.bookingId,
        userId: payload.userId,
        agentId: payload.agentId,
        description: payload.description,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'dispute',
      entityId: payload.disputeId,
      action: 'dispute_opened_notifications',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { requiresArbitration: true },
    });
  }
);

registerHandler<DisputeResolvedPayload>(
  EventTypes.DISPUTE_RESOLVED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    // Notify user
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-dispute-resolved-user`,
      recipient: payload.userEmail,
      templateId: 'dispute-resolved-user',
      priority: 'high',
      variables: {
        disputeId: payload.disputeId,
        bookingId: payload.bookingId,
        resolution: payload.resolution,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    // Notify agent
    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-dispute-resolved-agent`,
      recipient: payload.agentEmail,
      templateId: 'dispute-resolved-agent',
      priority: 'high',
      variables: {
        disputeId: payload.disputeId,
        bookingId: payload.bookingId,
        resolution: payload.resolution,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        agentId: payload.agentId,
        bookingId: payload.bookingId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'dispute',
      entityId: payload.disputeId,
      action: 'dispute_resolved_notifications',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: { resolvedBy: payload.resolvedBy },
    });
  }
);

// =============================================================================
// USER EVENT HANDLERS
// =============================================================================

registerHandler<UserRegisteredPayload>(
  EventTypes.USER_REGISTERED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-user-registered`,
      recipient: payload.email,
      templateId: 'user-welcome',
      priority: 'high',
      variables: {
        firstName: payload.firstName,
        verificationToken: payload.verificationToken,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'user',
      entityId: payload.userId,
      action: 'welcome_email_sent',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: {},
    });
  }
);

registerHandler<PasswordResetRequestedPayload>(
  EventTypes.PASSWORD_RESET_REQUESTED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-password-reset`,
      recipient: payload.email,
      templateId: 'password-reset',
      priority: 'critical',
      variables: {
        firstName: payload.firstName,
        resetToken: payload.resetToken,
        expiresAt: payload.expiresAt,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'user',
      entityId: payload.userId,
      action: 'password_reset_email_sent',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: {},
    });
  }
);

registerHandler<EmailVerifiedPayload>(
  EventTypes.EMAIL_VERIFIED,
  async (event, notificationService, auditService) => {
    const { payload } = event;

    await notificationService.sendEmail({
      idempotencyKey: `${event.eventId}-email-verified`,
      recipient: payload.email,
      templateId: 'email-verified',
      priority: 'normal',
      variables: {
        firstName: payload.firstName,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        userId: payload.userId,
        correlationId: event.correlationId,
        createdAt: new Date(),
      },
    });

    await auditService.log({
      eventType: 'notification.sent',
      entityType: 'user',
      entityId: payload.userId,
      action: 'email_verified_notification_sent',
      actorId: 'system',
      correlationId: event.correlationId,
      metadata: {},
    });
  }
);
