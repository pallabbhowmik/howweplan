/**
 * Trust Event Publisher
 * 
 * Utility for services to emit trust & reputation events.
 * Events are published to the event bus for audit service consumption.
 * 
 * CONSTITUTION RULES ENFORCED:
 * - Rule 18: Every state change MUST emit an audit event
 * - All events are immutable and traceable
 */

import type {
  ReviewSubmittedPayload,
  BadgeAssignedPayload,
  BadgeRevokedPayload,
  AgentViolationDetectedPayload,
  TrustLevelChangedPayload,
  AgentStatsRecalculatedPayload,
  ReviewUnlockedPayload,
} from '@tripcomposer/contracts';

// =============================================================================
// EVENT TYPE CONSTANTS
// =============================================================================

export const TRUST_EVENT_TYPES = {
  // Review events
  REVIEW_SUBMITTED: 'trust.review.submitted',
  REVIEW_HIDDEN: 'trust.review.hidden',
  REVIEW_UNHIDDEN: 'trust.review.unhidden',
  REVIEW_UNLOCKED: 'trust.review.unlocked',
  
  // Badge events
  BADGE_ASSIGNED: 'trust.badge.assigned',
  BADGE_REVOKED: 'trust.badge.revoked',
  
  // Violation events
  VIOLATION_DETECTED: 'trust.violation.detected',
  VIOLATION_RESOLVED: 'trust.violation.resolved',
  
  // Trust level events
  TRUST_LEVEL_CHANGED: 'trust.level.changed',
  
  // Stats events
  AGENT_STATS_RECALCULATED: 'trust.stats.recalculated',
  
  // Protection events
  PLATFORM_PROTECTION_CHANGED: 'trust.protection.changed',
  
  // Admin actions
  AGENT_FROZEN: 'trust.agent.frozen',
  AGENT_UNFROZEN: 'trust.agent.unfrozen',
} as const;

export type TrustEventType = typeof TRUST_EVENT_TYPES[keyof typeof TRUST_EVENT_TYPES];

// =============================================================================
// EVENT PUBLISHER INTERFACE
// =============================================================================

interface EventPublisher {
  publish(eventType: string, payload: unknown, correlationId: string): Promise<void>;
}

// =============================================================================
// TRUST EVENT PUBLISHER
// =============================================================================

export class TrustEventPublisher {
  private readonly publisher: EventPublisher;
  private readonly serviceName: string;

  constructor(publisher: EventPublisher, serviceName: string) {
    this.publisher = publisher;
    this.serviceName = serviceName;
  }

  /**
   * Emit ReviewSubmitted event
   */
  async emitReviewSubmitted(
    payload: ReviewSubmittedPayload,
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.REVIEW_SUBMITTED,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit ReviewUnlocked event (when booking completes)
   */
  async emitReviewUnlocked(
    payload: ReviewUnlockedPayload,
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.REVIEW_UNLOCKED,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit BadgeAssigned event
   */
  async emitBadgeAssigned(
    payload: BadgeAssignedPayload,
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.BADGE_ASSIGNED,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit BadgeRevoked event
   */
  async emitBadgeRevoked(
    payload: BadgeRevokedPayload,
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.BADGE_REVOKED,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit AgentViolationDetected event
   */
  async emitViolationDetected(
    payload: AgentViolationDetectedPayload,
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.VIOLATION_DETECTED,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit TrustLevelChanged event
   */
  async emitTrustLevelChanged(
    payload: TrustLevelChangedPayload,
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.TRUST_LEVEL_CHANGED,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit AgentStatsRecalculated event
   */
  async emitStatsRecalculated(
    payload: AgentStatsRecalculatedPayload,
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.AGENT_STATS_RECALCULATED,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit AgentFrozen event
   */
  async emitAgentFrozen(
    payload: {
      agentId: string;
      adminId: string;
      reason: string;
      duration?: string;
    },
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.AGENT_FROZEN,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit AgentUnfrozen event
   */
  async emitAgentUnfrozen(
    payload: {
      agentId: string;
      adminId: string;
      reason: string;
    },
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.AGENT_UNFROZEN,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit ReviewHidden event
   */
  async emitReviewHidden(
    payload: {
      reviewId: string;
      agentId: string;
      adminId: string;
      reason: string;
    },
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.REVIEW_HIDDEN,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }

  /**
   * Emit ReviewUnhidden event
   */
  async emitReviewUnhidden(
    payload: {
      reviewId: string;
      agentId: string;
      adminId: string;
      reason: string;
    },
    correlationId: string
  ): Promise<void> {
    await this.publisher.publish(
      TRUST_EVENT_TYPES.REVIEW_UNHIDDEN,
      {
        ...payload,
        source: this.serviceName,
        emittedAt: new Date().toISOString(),
      },
      correlationId
    );
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a trust event publisher instance
 */
export function createTrustEventPublisher(
  publisher: EventPublisher,
  serviceName: string
): TrustEventPublisher {
  return new TrustEventPublisher(publisher, serviceName);
}
