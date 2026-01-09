/**
 * Trust Events Audit Handler
 * 
 * Processes trust & reputation events and stores them in the audit log.
 * All trust events are immutable and traceable.
 * 
 * CONSTITUTION RULES ENFORCED:
 * - Rule 18: Every state change MUST emit an audit event
 * - All events stored with immutable flag
 * - Full traceability to agentId and/or bookingId
 */

import { auditRepository } from '../database/index';
import type { CreateAuditEvent } from '../schema/index';
import { logger } from '../utils/logger';

// =============================================================================
// TRUST EVENT TYPES
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
// EVENT PAYLOADS
// =============================================================================

interface ReviewSubmittedPayload {
  reviewId: string;
  bookingId: string;
  userId: string;
  agentId: string;
  rating: number;
  planningQuality: number;
  responsiveness: number;
  accuracyVsPromise: number;
  hasComment: boolean;
}

interface ReviewHiddenPayload {
  reviewId: string;
  agentId: string;
  adminId: string;
  reason: string;
}

interface BadgeAssignedPayload {
  agentId: string;
  badge: string;
  reason: string;
  triggeredBy: 'SYSTEM' | 'ADMIN';
  adminId: string | null;
  metadata: Record<string, unknown>;
}

interface BadgeRevokedPayload {
  agentId: string;
  badge: string;
  reason: string;
  triggeredBy: 'SYSTEM' | 'ADMIN';
  adminId: string | null;
  metadata: Record<string, unknown>;
}

interface ViolationDetectedPayload {
  violationId: string;
  agentId: string;
  violationType: string;
  description: string;
  severity: string;
  bookingId: string | null;
  messageId: string | null;
  autoDetected: boolean;
  evidence: Record<string, unknown>;
}

interface TrustLevelChangedPayload {
  agentId: string;
  previousLevel: string;
  newLevel: string;
  reason: string;
  triggeredBy: 'SYSTEM' | 'ADMIN';
  adminId: string | null;
  metadata: Record<string, unknown>;
}

interface AgentFrozenPayload {
  agentId: string;
  adminId: string;
  reason: string;
  duration?: string;
}

// =============================================================================
// AUDIT ENTRY BUILDERS
// =============================================================================

/**
 * Build audit entry for ReviewSubmitted event
 */
export function buildReviewSubmittedAudit(
  correlationId: string,
  payload: ReviewSubmittedPayload,
  source: string
): CreateAuditEvent {
  return {
    eventType: TRUST_EVENT_TYPES.REVIEW_SUBMITTED,
    eventVersion: '1.0',
    correlationId,
    category: 'agent',
    severity: 'info',
    actor: {
      type: 'user',
      id: payload.userId,
    },
    resource: {
      type: 'review',
      id: payload.reviewId,
      parentType: 'booking',
      parentId: payload.bookingId,
    },
    action: 'created',
    reason: `Review submitted for booking ${payload.bookingId}`,
    stateChange: {
      before: null,
      after: {
        reviewId: payload.reviewId,
        bookingId: payload.bookingId,
        agentId: payload.agentId,
        rating: payload.rating,
        planningQuality: payload.planningQuality,
        responsiveness: payload.responsiveness,
        accuracyVsPromise: payload.accuracyVsPromise,
        hasComment: payload.hasComment,
      },
    },
    source: {
      service: source,
    },
    gdprRelevant: false,
    piiContained: false,
    retentionCategory: 'standard',
    metadata: {
      agentId: payload.agentId,
      immutable: true,
    },
  };
}

/**
 * Build audit entry for ReviewHidden event
 */
export function buildReviewHiddenAudit(
  correlationId: string,
  payload: ReviewHiddenPayload,
  source: string
): CreateAuditEvent {
  return {
    eventType: TRUST_EVENT_TYPES.REVIEW_HIDDEN,
    eventVersion: '1.0',
    correlationId,
    category: 'admin',
    severity: 'warning',
    actor: {
      type: 'admin',
      id: payload.adminId,
    },
    resource: {
      type: 'review',
      id: payload.reviewId,
      parentType: 'agent',
      parentId: payload.agentId,
    },
    action: 'hidden',
    reason: payload.reason,
    stateChange: {
      before: { hidden: false },
      after: { hidden: true, hiddenBy: payload.adminId, hiddenReason: payload.reason },
    },
    source: {
      service: source,
    },
    gdprRelevant: false,
    piiContained: false,
    retentionCategory: 'extended',
    metadata: {
      agentId: payload.agentId,
      adminAction: true,
      immutable: true,
    },
  };
}

/**
 * Build audit entry for BadgeAssigned event
 */
export function buildBadgeAssignedAudit(
  correlationId: string,
  payload: BadgeAssignedPayload,
  source: string
): CreateAuditEvent {
  return {
    eventType: TRUST_EVENT_TYPES.BADGE_ASSIGNED,
    eventVersion: '1.0',
    correlationId,
    category: 'agent',
    severity: 'info',
    actor: {
      type: payload.triggeredBy === 'ADMIN' ? 'admin' : 'system',
      id: payload.adminId || 'SYSTEM',
    },
    resource: {
      type: 'badge',
      id: payload.badge,
      parentType: 'agent',
      parentId: payload.agentId,
    },
    action: 'assigned',
    reason: payload.reason,
    stateChange: {
      before: { hasBadge: false },
      after: { hasBadge: true, badge: payload.badge, ...payload.metadata },
    },
    source: {
      service: source,
    },
    gdprRelevant: false,
    piiContained: false,
    retentionCategory: 'standard',
    metadata: {
      agentId: payload.agentId,
      badgeType: payload.badge,
      automatic: payload.triggeredBy === 'SYSTEM',
      immutable: true,
    },
  };
}

/**
 * Build audit entry for BadgeRevoked event
 */
export function buildBadgeRevokedAudit(
  correlationId: string,
  payload: BadgeRevokedPayload,
  source: string
): CreateAuditEvent {
  return {
    eventType: TRUST_EVENT_TYPES.BADGE_REVOKED,
    eventVersion: '1.0',
    correlationId,
    category: 'agent',
    severity: 'warning',
    actor: {
      type: payload.triggeredBy === 'ADMIN' ? 'admin' : 'system',
      id: payload.adminId || 'SYSTEM',
    },
    resource: {
      type: 'badge',
      id: payload.badge,
      parentType: 'agent',
      parentId: payload.agentId,
    },
    action: 'revoked',
    reason: payload.reason,
    stateChange: {
      before: { hasBadge: true, badge: payload.badge },
      after: { hasBadge: false, ...payload.metadata },
    },
    source: {
      service: source,
    },
    gdprRelevant: false,
    piiContained: false,
    retentionCategory: 'extended',
    metadata: {
      agentId: payload.agentId,
      badgeType: payload.badge,
      automatic: payload.triggeredBy === 'SYSTEM',
      immutable: true,
    },
  };
}

/**
 * Build audit entry for ViolationDetected event
 */
export function buildViolationDetectedAudit(
  correlationId: string,
  payload: ViolationDetectedPayload,
  source: string
): CreateAuditEvent {
  return {
    eventType: TRUST_EVENT_TYPES.VIOLATION_DETECTED,
    eventVersion: '1.0',
    correlationId,
    category: 'agent',
    severity: payload.severity === 'CRITICAL' ? 'critical' : 
              payload.severity === 'HIGH' ? 'error' :
              payload.severity === 'MEDIUM' ? 'warning' : 'info',
    actor: {
      type: payload.autoDetected ? 'system' : 'admin',
      id: payload.autoDetected ? 'VIOLATION_DETECTOR' : 'MANUAL',
    },
    resource: {
      type: 'violation',
      id: payload.violationId,
      parentType: 'agent',
      parentId: payload.agentId,
    },
    action: 'detected',
    reason: payload.description,
    stateChange: {
      before: null,
      after: {
        violationType: payload.violationType,
        severity: payload.severity,
        bookingId: payload.bookingId,
        messageId: payload.messageId,
        evidence: payload.evidence,
      },
    },
    source: {
      service: source,
    },
    gdprRelevant: false,
    piiContained: true, // Evidence may contain PII
    retentionCategory: 'extended',
    metadata: {
      agentId: payload.agentId,
      violationType: payload.violationType,
      autoDetected: payload.autoDetected,
      immutable: true,
    },
  };
}

/**
 * Build audit entry for TrustLevelChanged event
 */
export function buildTrustLevelChangedAudit(
  correlationId: string,
  payload: TrustLevelChangedPayload,
  source: string
): CreateAuditEvent {
  return {
    eventType: TRUST_EVENT_TYPES.TRUST_LEVEL_CHANGED,
    eventVersion: '1.0',
    correlationId,
    category: 'agent',
    severity: 'info',
    actor: {
      type: payload.triggeredBy === 'ADMIN' ? 'admin' : 'system',
      id: payload.adminId || 'SYSTEM',
    },
    resource: {
      type: 'trust_level',
      id: payload.agentId,
      parentType: 'agent',
      parentId: payload.agentId,
    },
    action: 'updated',
    reason: payload.reason,
    stateChange: {
      before: { trustLevel: payload.previousLevel },
      after: { trustLevel: payload.newLevel, ...payload.metadata },
    },
    source: {
      service: source,
    },
    gdprRelevant: false,
    piiContained: false,
    retentionCategory: 'standard',
    metadata: {
      agentId: payload.agentId,
      previousLevel: payload.previousLevel,
      newLevel: payload.newLevel,
      automatic: payload.triggeredBy === 'SYSTEM',
      immutable: true,
    },
  };
}

/**
 * Build audit entry for AgentFrozen event
 */
export function buildAgentFrozenAudit(
  correlationId: string,
  payload: AgentFrozenPayload,
  source: string
): CreateAuditEvent {
  return {
    eventType: TRUST_EVENT_TYPES.AGENT_FROZEN,
    eventVersion: '1.0',
    correlationId,
    category: 'admin',
    severity: 'critical',
    actor: {
      type: 'admin',
      id: payload.adminId,
    },
    resource: {
      type: 'agent_status',
      id: payload.agentId,
      parentType: 'agent',
      parentId: payload.agentId,
    },
    action: 'frozen',
    reason: payload.reason,
    stateChange: {
      before: { frozen: false },
      after: { frozen: true, frozenBy: payload.adminId, frozenReason: payload.reason },
    },
    source: {
      service: source,
    },
    gdprRelevant: false,
    piiContained: false,
    retentionCategory: 'extended',
    metadata: {
      agentId: payload.agentId,
      adminAction: true,
      immutable: true,
    },
  };
}

// =============================================================================
// TRUST EVENT HANDLER
// =============================================================================

/**
 * Handle incoming trust event and store in audit log
 */
export async function handleTrustEvent(
  eventType: string,
  correlationId: string,
  payload: Record<string, unknown>,
  source: string
): Promise<void> {
  let auditEntry: CreateAuditEvent | null = null;

  switch (eventType) {
    case TRUST_EVENT_TYPES.REVIEW_SUBMITTED:
      auditEntry = buildReviewSubmittedAudit(
        correlationId,
        payload as unknown as ReviewSubmittedPayload,
        source
      );
      break;

    case TRUST_EVENT_TYPES.REVIEW_HIDDEN:
      auditEntry = buildReviewHiddenAudit(
        correlationId,
        payload as unknown as ReviewHiddenPayload,
        source
      );
      break;

    case TRUST_EVENT_TYPES.BADGE_ASSIGNED:
      auditEntry = buildBadgeAssignedAudit(
        correlationId,
        payload as unknown as BadgeAssignedPayload,
        source
      );
      break;

    case TRUST_EVENT_TYPES.BADGE_REVOKED:
      auditEntry = buildBadgeRevokedAudit(
        correlationId,
        payload as unknown as BadgeRevokedPayload,
        source
      );
      break;

    case TRUST_EVENT_TYPES.VIOLATION_DETECTED:
      auditEntry = buildViolationDetectedAudit(
        correlationId,
        payload as unknown as ViolationDetectedPayload,
        source
      );
      break;

    case TRUST_EVENT_TYPES.TRUST_LEVEL_CHANGED:
      auditEntry = buildTrustLevelChangedAudit(
        correlationId,
        payload as unknown as TrustLevelChangedPayload,
        source
      );
      break;

    case TRUST_EVENT_TYPES.AGENT_FROZEN:
      auditEntry = buildAgentFrozenAudit(
        correlationId,
        payload as unknown as AgentFrozenPayload,
        source
      );
      break;

    default:
      logger.warn(`Unknown trust event type: ${eventType}`);
      return;
  }

  if (auditEntry) {
    try {
      await auditRepository.store(auditEntry);
      logger.info(`Stored trust audit event: ${eventType}`, {
        correlationId,
        eventType,
        agentId: auditEntry.metadata?.agentId,
      });
    } catch (error) {
      logger.error(`Failed to store trust audit event: ${eventType}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      });
      throw error;
    }
  }
}

/**
 * Check if event is a trust event
 */
export function isTrustEvent(eventType: string): boolean {
  return eventType.startsWith('trust.');
}
