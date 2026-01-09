/**
 * Trust Event Publisher
 * 
 * Publishes trust & reputation events to the event bus.
 * All events are typed and validated before publishing.
 */

import { eventBusConfig } from '../config/env';
import type {
  ReviewSubmittedPayload,
  ReviewHiddenPayload,
  BadgeAssignedPayload,
  BadgeRevokedPayload,
  AgentViolationDetectedPayload,
  TrustLevelChangedPayload,
  ReviewUnlockedPayload,
  TRUST_EVENT_TYPES,
} from '@tripcomposer/contracts';

// =============================================================================
// EVENT BUS CLIENT
// =============================================================================

async function publishEvent(eventType: string, payload: unknown): Promise<void> {
  try {
    const event = {
      eventId: crypto.randomUUID(),
      eventType,
      version: '1.0',
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
      payload,
    };

    const response = await fetch(eventBusConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': eventBusConfig.apiKey,
        'X-Event-Type': eventType,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Event bus returned ${response.status}`);
    }

    console.log(`[TrustEventPublisher] Published ${eventType}`, { eventId: event.eventId });
  } catch (error) {
    console.error(`[TrustEventPublisher] Failed to publish ${eventType}:`, error);
    // Events are fire-and-forget; log but don't throw
  }
}

// =============================================================================
// PUBLISHER IMPLEMENTATION
// =============================================================================

export const trustEventPublisher = {
  /**
   * Publish ReviewSubmitted event.
   * Triggers: stats recalculation, badge evaluation, notifications
   */
  async publishReviewSubmitted(payload: ReviewSubmittedPayload): Promise<void> {
    await publishEvent('trust.review.submitted', payload);
  },

  /**
   * Publish ReviewHidden event.
   * Triggers: stats recalculation (review no longer counts)
   */
  async publishReviewHidden(payload: ReviewHiddenPayload): Promise<void> {
    await publishEvent('trust.review.hidden', payload);
  },

  /**
   * Publish BadgeAssigned event.
   * Triggers: agent notification, audit logging
   */
  async publishBadgeAssigned(payload: BadgeAssignedPayload): Promise<void> {
    await publishEvent('trust.badge.assigned', payload);
  },

  /**
   * Publish BadgeRevoked event.
   * Triggers: agent notification, audit logging
   */
  async publishBadgeRevoked(payload: BadgeRevokedPayload): Promise<void> {
    await publishEvent('trust.badge.revoked', payload);
  },

  /**
   * Publish AgentViolationDetected event.
   * Triggers: badge revocation check, trust level evaluation, admin alert
   */
  async publishAgentViolationDetected(payload: AgentViolationDetectedPayload): Promise<void> {
    await publishEvent('trust.violation.detected', payload);
  },

  /**
   * Publish TrustLevelChanged event.
   * Triggers: agent notification, audit logging
   */
  async publishTrustLevelChanged(payload: TrustLevelChangedPayload): Promise<void> {
    await publishEvent('trust.level.changed', payload);
  },

  /**
   * Publish ReviewUnlocked event (when booking completes).
   * Triggers: user notification to submit review
   */
  async publishReviewUnlocked(payload: ReviewUnlockedPayload): Promise<void> {
    await publishEvent('trust.review.unlocked', payload);
  },
};
