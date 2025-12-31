/**
 * Event Publisher
 * 
 * Publishes events to the message bus for consumption by other services.
 * All state changes in the reviews service emit audit events via this publisher.
 */

import { eventBusConfig, observabilityConfig } from '../config/env';
import {
  ReviewPublishedEvent,
  AgentScoreUpdatedEvent,
  AgentTierChangedEvent,
  ReviewInvitationSentEvent,
  GamingAlertTriggeredEvent,
  PublishedEvent,
} from './contracts';
import { Review, ReviewerType, AgentScore, ReliabilityTier } from '../models';

// =============================================================================
// EVENT BUS CLIENT (ABSTRACTION)
// =============================================================================

/**
 * Event bus client interface.
 * Implementation would use RabbitMQ, Kafka, or similar.
 */
interface EventBusClient {
  publish(exchange: string, routingKey: string, event: PublishedEvent): Promise<void>;
  close(): Promise<void>;
}

let eventBusClient: EventBusClient | null = null;

/**
 * Initialize the event bus connection
 */
export async function initializeEventBus(): Promise<void> {
  // In a real implementation, this would connect to RabbitMQ/Kafka
  // For now, we create a mock client that logs events
  eventBusClient = {
    async publish(exchange: string, routingKey: string, event: PublishedEvent): Promise<void> {
      if (observabilityConfig.auditEventsEnabled) {
        console.log(`[EventBus] Publishing to ${exchange}/${routingKey}:`, JSON.stringify(event, null, 2));
      }
      // Actual implementation would publish to message broker
    },
    async close(): Promise<void> {
      console.log('[EventBus] Connection closed');
    },
  };
}

/**
 * Close the event bus connection
 */
export async function closeEventBus(): Promise<void> {
  if (eventBusClient) {
    await eventBusClient.close();
    eventBusClient = null;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateCorrelationId(): string {
  return crypto.randomUUID();
}

function getClient(): EventBusClient {
  if (!eventBusClient) {
    throw new Error('Event bus not initialized. Call initializeEventBus() first.');
  }
  return eventBusClient;
}

// =============================================================================
// EVENT PUBLISHER
// =============================================================================

export const eventPublisher = {
  /**
   * Publish a ReviewPublished event
   */
  async publishReviewPublished(review: Review): Promise<void> {
    const event: ReviewPublishedEvent = {
      type: 'review.published',
      version: '1.0',
      timestamp: new Date().toISOString(),
      correlationId: generateCorrelationId(),
      payload: {
        reviewId: review.id,
        bookingId: review.bookingId,
        reviewerId: review.reviewerId,
        reviewerType: review.reviewerType as 'TRAVELER' | 'AGENT',
        subjectId: review.subjectId,
        subjectType: review.subjectType as 'TRAVELER' | 'AGENT',
        overallRating: review.ratings.overall,
        publishedAt: review.publishedAt?.toISOString() ?? new Date().toISOString(),
      },
    };

    await getClient().publish(
      eventBusConfig.exchange,
      'review.published',
      event
    );
  },

  /**
   * Publish an AgentScoreUpdated event
   */
  async publishAgentScoreUpdated(
    agentId: string,
    previousScore: number,
    newScore: AgentScore,
    previousTier: ReliabilityTier | null,
    triggeredBy: string
  ): Promise<void> {
    const event: AgentScoreUpdatedEvent = {
      type: 'agent.score.updated',
      version: '1.0',
      timestamp: new Date().toISOString(),
      correlationId: generateCorrelationId(),
      payload: {
        agentId,
        previousScore,
        newScore: newScore.publicScore,
        previousTier: previousTier ?? ReliabilityTier.NEW,
        newTier: newScore.reliabilityTier,
        triggeredBy,
        isPublic: newScore.visibility === 'PUBLIC',
      },
    };

    await getClient().publish(
      eventBusConfig.exchange,
      'agent.score.updated',
      event
    );
  },

  /**
   * Publish an AgentTierChanged event
   */
  async publishAgentTierChanged(
    agentId: string,
    previousTier: ReliabilityTier,
    newTier: ReliabilityTier,
    reason: string
  ): Promise<void> {
    const event: AgentTierChangedEvent = {
      type: 'agent.tier.changed',
      version: '1.0',
      timestamp: new Date().toISOString(),
      correlationId: generateCorrelationId(),
      payload: {
        agentId,
        previousTier,
        newTier,
        reason,
      },
    };

    await getClient().publish(
      eventBusConfig.exchange,
      'agent.tier.changed',
      event
    );
  },

  /**
   * Publish a ReviewInvitationSent event
   */
  async publishReviewInvitationSent(
    reviewId: string,
    bookingId: string,
    recipientId: string,
    recipientType: ReviewerType,
    submissionDeadline: Date
  ): Promise<void> {
    const event: ReviewInvitationSentEvent = {
      type: 'review.invitation.sent',
      version: '1.0',
      timestamp: new Date().toISOString(),
      correlationId: generateCorrelationId(),
      payload: {
        reviewId,
        bookingId,
        recipientId,
        recipientType: recipientType as 'TRAVELER' | 'AGENT',
        submissionDeadline: submissionDeadline.toISOString(),
      },
    };

    await getClient().publish(
      eventBusConfig.exchange,
      'review.invitation.sent',
      event
    );
  },

  /**
   * Publish a GamingAlertTriggered event
   */
  async publishGamingAlert(
    reviewId: string,
    agentId: string,
    gamingScore: number,
    signals: string[],
    recommendation: string
  ): Promise<void> {
    const event: GamingAlertTriggeredEvent = {
      type: 'review.gaming.alert',
      version: '1.0',
      timestamp: new Date().toISOString(),
      correlationId: generateCorrelationId(),
      payload: {
        reviewId,
        agentId,
        gamingScore,
        signals,
        recommendation,
      },
    };

    await getClient().publish(
      eventBusConfig.exchange,
      'review.gaming.alert',
      event
    );
  },
};

export type EventPublisher = typeof eventPublisher;
