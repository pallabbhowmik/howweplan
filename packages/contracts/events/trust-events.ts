/**
 * Trust & Reputation Events
 * 
 * Events for the trust & reputation system.
 * All events are immutable and auditable.
 * 
 * CONSTITUTION RULES ENFORCED:
 * - Rule 18: Every state change MUST emit an audit event
 * - All events are traceable to bookingId or agentId
 */

import type { BaseEvent } from './base-event';
import type { AgentBadge, TrustLevel, ViolationType } from '../entities/agent-trust';

// =============================================================================
// REVIEW EVENTS
// =============================================================================

/**
 * Emitted when a review is successfully submitted.
 */
export interface ReviewSubmittedPayload {
  readonly reviewId: string;
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly rating: number;
  readonly planningQuality: number;
  readonly responsiveness: number;
  readonly accuracyVsPromise: number;
  readonly hasComment: boolean;
  readonly submittedAt: Date;
}

export type ReviewSubmittedEvent = BaseEvent<ReviewSubmittedPayload>;

/**
 * Emitted when a review is hidden by admin.
 */
export interface ReviewHiddenPayload {
  readonly reviewId: string;
  readonly agentId: string;
  readonly adminId: string;
  readonly reason: string;
  readonly hiddenAt: Date;
}

export type ReviewHiddenEvent = BaseEvent<ReviewHiddenPayload>;

// =============================================================================
// BADGE EVENTS
// =============================================================================

/**
 * Emitted when a badge is assigned to an agent.
 */
export interface BadgeAssignedPayload {
  readonly agentId: string;
  readonly badge: AgentBadge;
  readonly reason: string;
  readonly triggeredBy: 'SYSTEM' | 'ADMIN';
  readonly adminId: string | null;
  readonly metadata: Record<string, unknown>;
  readonly assignedAt: Date;
}

export type BadgeAssignedEvent = BaseEvent<BadgeAssignedPayload>;

/**
 * Emitted when a badge is revoked from an agent.
 */
export interface BadgeRevokedPayload {
  readonly agentId: string;
  readonly badge: AgentBadge;
  readonly reason: string;
  readonly triggeredBy: 'SYSTEM' | 'ADMIN';
  readonly adminId: string | null;
  readonly metadata: Record<string, unknown>;
  readonly revokedAt: Date;
}

export type BadgeRevokedEvent = BaseEvent<BadgeRevokedPayload>;

// =============================================================================
// VIOLATION EVENTS
// =============================================================================

/**
 * Emitted when a violation is detected.
 */
export interface AgentViolationDetectedPayload {
  readonly violationId: string;
  readonly agentId: string;
  readonly violationType: ViolationType;
  readonly description: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly bookingId: string | null;
  readonly messageId: string | null;
  readonly autoDetected: boolean;
  readonly evidence: Record<string, unknown>;
  readonly detectedAt: Date;
}

export type AgentViolationDetectedEvent = BaseEvent<AgentViolationDetectedPayload>;

/**
 * Emitted when a violation is resolved.
 */
export interface ViolationResolvedPayload {
  readonly violationId: string;
  readonly agentId: string;
  readonly resolvedBy: string;
  readonly resolutionNotes: string;
  readonly resolvedAt: Date;
}

export type ViolationResolvedEvent = BaseEvent<ViolationResolvedPayload>;

// =============================================================================
// TRUST LEVEL EVENTS
// =============================================================================

/**
 * Emitted when an agent's trust level changes.
 */
export interface TrustLevelChangedPayload {
  readonly agentId: string;
  readonly previousLevel: TrustLevel;
  readonly newLevel: TrustLevel;
  readonly reason: string;
  readonly triggeredBy: 'SYSTEM' | 'ADMIN';
  readonly adminId: string | null;
  readonly metadata: Record<string, unknown>;
  readonly changedAt: Date;
}

export type TrustLevelChangedEvent = BaseEvent<TrustLevelChangedPayload>;

// =============================================================================
// AGENT STATS EVENTS
// =============================================================================

/**
 * Emitted when agent stats are recalculated.
 */
export interface AgentStatsRecalculatedPayload {
  readonly agentId: string;
  readonly previousStats: {
    readonly averageRating: number | null;
    readonly ratingCount: number;
    readonly platformProtectionScore: number;
    readonly trustLevel: TrustLevel;
  };
  readonly newStats: {
    readonly averageRating: number | null;
    readonly ratingCount: number;
    readonly platformProtectionScore: number;
    readonly trustLevel: TrustLevel;
  };
  readonly recalculatedAt: Date;
}

export type AgentStatsRecalculatedEvent = BaseEvent<AgentStatsRecalculatedPayload>;

// =============================================================================
// REVIEW UNLOCK EVENT
// =============================================================================

/**
 * Emitted when review submission is unlocked for a booking.
 * Triggered by BookingCompleted event.
 */
export interface ReviewUnlockedPayload {
  readonly bookingId: string;
  readonly userId: string;
  readonly agentId: string;
  readonly unlockedAt: Date;
  readonly expiresAt: Date;
}

export type ReviewUnlockedEvent = BaseEvent<ReviewUnlockedPayload>;

// =============================================================================
// EVENT TYPE CONSTANTS
// =============================================================================

export const TRUST_EVENT_TYPES = {
  REVIEW_SUBMITTED: 'trust.review.submitted',
  REVIEW_HIDDEN: 'trust.review.hidden',
  BADGE_ASSIGNED: 'trust.badge.assigned',
  BADGE_REVOKED: 'trust.badge.revoked',
  AGENT_VIOLATION_DETECTED: 'trust.violation.detected',
  VIOLATION_RESOLVED: 'trust.violation.resolved',
  TRUST_LEVEL_CHANGED: 'trust.level.changed',
  AGENT_STATS_RECALCULATED: 'trust.stats.recalculated',
  REVIEW_UNLOCKED: 'trust.review.unlocked',
} as const;

export type TrustEventType = typeof TRUST_EVENT_TYPES[keyof typeof TRUST_EVENT_TYPES];
