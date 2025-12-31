/**
 * Shared Contracts - Event Types
 * 
 * These are the event contracts that this service consumes and produces.
 * In a real implementation, these would be in a shared package.
 * This file defines the shape of events for documentation and type safety.
 */

// =============================================================================
// EVENTS CONSUMED BY REVIEWS SERVICE
// =============================================================================

/**
 * BookingCompleted event - triggers review creation
 * Published by: booking-payments service
 */
export interface BookingCompletedEvent {
  type: 'booking.completed';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    bookingId: string;
    travelerId: string;
    agentId: string;
    tripStartDate: string;
    tripEndDate: string;
    completedAt: string;
    totalAmount: number;
    currency: string;
    destination: string;
    tripType: string;
  };
}

/**
 * BookingCancelled event - may affect scores
 * Published by: booking-payments service
 */
export interface BookingCancelledEvent {
  type: 'booking.cancelled';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    bookingId: string;
    travelerId: string;
    agentId: string;
    cancelledBy: 'TRAVELER' | 'AGENT' | 'SYSTEM';
    cancelledAt: string;
    reason: string;
    refundAmount: number;
  };
}

/**
 * DisputeResolved event - affects agent scores
 * Published by: disputes service
 */
export interface DisputeResolvedEvent {
  type: 'dispute.resolved';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    disputeId: string;
    bookingId: string;
    travelerId: string;
    agentId: string;
    resolution: 'TRAVELER_FAVOR' | 'AGENT_FAVOR' | 'SPLIT' | 'DISMISSED';
    resolvedAt: string;
    resolvedBy: string;
    refundAmount: number;
  };
}

/**
 * AgentProfileUpdated event - may affect score visibility
 * Published by: agents service
 */
export interface AgentProfileUpdatedEvent {
  type: 'agent.profile.updated';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    agentId: string;
    changes: string[];
    profileCompleteness: number;
    isVerified: boolean;
    isSuspended: boolean;
  };
}

// =============================================================================
// EVENTS PUBLISHED BY REVIEWS SERVICE
// =============================================================================

/**
 * ReviewPublished event - notifies other services of new review
 */
export interface ReviewPublishedEvent {
  type: 'review.published';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    reviewId: string;
    bookingId: string;
    reviewerId: string;
    reviewerType: 'TRAVELER' | 'AGENT';
    subjectId: string;
    subjectType: 'TRAVELER' | 'AGENT';
    overallRating: number;
    publishedAt: string;
  };
}

/**
 * AgentScoreUpdated event - notifies of score changes
 */
export interface AgentScoreUpdatedEvent {
  type: 'agent.score.updated';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    agentId: string;
    previousScore: number;
    newScore: number;
    previousTier: string;
    newTier: string;
    triggeredBy: string;
    isPublic: boolean;
  };
}

/**
 * AgentTierChanged event - notifies of tier promotions/demotions
 */
export interface AgentTierChangedEvent {
  type: 'agent.tier.changed';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    agentId: string;
    previousTier: string;
    newTier: string;
    reason: string;
  };
}

/**
 * ReviewInvitationSent event - for notification service
 */
export interface ReviewInvitationSentEvent {
  type: 'review.invitation.sent';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    reviewId: string;
    bookingId: string;
    recipientId: string;
    recipientType: 'TRAVELER' | 'AGENT';
    submissionDeadline: string;
  };
}

/**
 * GamingAlertTriggered event - for fraud monitoring
 */
export interface GamingAlertTriggeredEvent {
  type: 'review.gaming.alert';
  version: '1.0';
  timestamp: string;
  correlationId: string;
  payload: {
    reviewId: string;
    agentId: string;
    gamingScore: number;
    signals: string[];
    recommendation: string;
  };
}

// =============================================================================
// TYPE UNIONS
// =============================================================================

export type ConsumedEvent =
  | BookingCompletedEvent
  | BookingCancelledEvent
  | DisputeResolvedEvent
  | AgentProfileUpdatedEvent;

export type PublishedEvent =
  | ReviewPublishedEvent
  | AgentScoreUpdatedEvent
  | AgentTierChangedEvent
  | ReviewInvitationSentEvent
  | GamingAlertTriggeredEvent;
