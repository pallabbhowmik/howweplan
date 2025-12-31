/**
 * Audit Event Model
 * 
 * Every state change in the reviews service emits an audit event.
 * These events are immutable and form a complete audit trail.
 */

import { z } from 'zod';

// =============================================================================
// AUDIT EVENT TYPES
// =============================================================================

export enum AuditEventType {
  // Review lifecycle
  REVIEW_INVITATION_SENT = 'REVIEW_INVITATION_SENT',
  REVIEW_INVITATION_REMINDED = 'REVIEW_INVITATION_REMINDED',
  REVIEW_DRAFT_CREATED = 'REVIEW_DRAFT_CREATED',
  REVIEW_DRAFT_UPDATED = 'REVIEW_DRAFT_UPDATED',
  REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
  REVIEW_MODERATION_STARTED = 'REVIEW_MODERATION_STARTED',
  REVIEW_MODERATION_COMPLETED = 'REVIEW_MODERATION_COMPLETED',
  REVIEW_PUBLISHED = 'REVIEW_PUBLISHED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  REVIEW_HIDDEN = 'REVIEW_HIDDEN',
  REVIEW_UNHIDDEN = 'REVIEW_UNHIDDEN',
  REVIEW_EXPIRED = 'REVIEW_EXPIRED',
  
  // Score changes
  AGENT_SCORE_CALCULATED = 'AGENT_SCORE_CALCULATED',
  AGENT_SCORE_DECAYED = 'AGENT_SCORE_DECAYED',
  AGENT_TIER_CHANGED = 'AGENT_TIER_CHANGED',
  AGENT_VISIBILITY_CHANGED = 'AGENT_VISIBILITY_CHANGED',
  
  // Gaming detection
  GAMING_ALERT_TRIGGERED = 'GAMING_ALERT_TRIGGERED',
  GAMING_INVESTIGATION_STARTED = 'GAMING_INVESTIGATION_STARTED',
  GAMING_INVESTIGATION_COMPLETED = 'GAMING_INVESTIGATION_COMPLETED',
  
  // Admin actions
  ADMIN_REVIEW_OVERRIDE = 'ADMIN_REVIEW_OVERRIDE',
  ADMIN_SCORE_ADJUSTMENT = 'ADMIN_SCORE_ADJUSTMENT',
  ADMIN_TIER_OVERRIDE = 'ADMIN_TIER_OVERRIDE',
}

export enum AuditActorType {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
  SCHEDULER = 'SCHEDULER',
}

// =============================================================================
// AUDIT EVENT MODEL
// =============================================================================

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  eventType: z.nativeEnum(AuditEventType),
  
  // Actor (who performed the action)
  actorType: z.nativeEnum(AuditActorType),
  actorId: z.string().nullable(),  // null for SYSTEM/SCHEDULER
  
  // Target (what was affected)
  targetType: z.enum(['REVIEW', 'AGENT_SCORE', 'INVITATION']),
  targetId: z.string().uuid(),
  
  // Related entities for cross-referencing
  reviewId: z.string().uuid().nullable(),
  agentId: z.string().uuid().nullable(),
  travelerId: z.string().uuid().nullable(),
  bookingId: z.string().uuid().nullable(),
  
  // Change details
  previousState: z.record(z.unknown()).nullable(),
  newState: z.record(z.unknown()).nullable(),
  
  // Admin-specific
  adminReason: z.string().nullable(),  // Required for admin actions
  
  // Metadata
  metadata: z.record(z.unknown()),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  
  // Timestamp
  occurredAt: z.date(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createAuditEvent(params: {
  eventType: AuditEventType;
  actorType: AuditActorType;
  actorId?: string | null;
  targetType: 'REVIEW' | 'AGENT_SCORE' | 'INVITATION';
  targetId: string;
  reviewId?: string | null;
  agentId?: string | null;
  travelerId?: string | null;
  bookingId?: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  adminReason?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): AuditEvent {
  return {
    id: crypto.randomUUID(),
    eventType: params.eventType,
    actorType: params.actorType,
    actorId: params.actorId ?? null,
    targetType: params.targetType,
    targetId: params.targetId,
    reviewId: params.reviewId ?? null,
    agentId: params.agentId ?? null,
    travelerId: params.travelerId ?? null,
    bookingId: params.bookingId ?? null,
    previousState: params.previousState ?? null,
    newState: params.newState ?? null,
    adminReason: params.adminReason ?? null,
    metadata: params.metadata ?? {},
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    occurredAt: new Date(),
  };
}

// =============================================================================
// VALIDATION FOR ADMIN ACTIONS
// =============================================================================

const ADMIN_ACTION_TYPES = new Set([
  AuditEventType.ADMIN_REVIEW_OVERRIDE,
  AuditEventType.ADMIN_SCORE_ADJUSTMENT,
  AuditEventType.ADMIN_TIER_OVERRIDE,
  AuditEventType.REVIEW_HIDDEN,
  AuditEventType.REVIEW_UNHIDDEN,
]);

export function requiresAdminReason(eventType: AuditEventType): boolean {
  return ADMIN_ACTION_TYPES.has(eventType);
}

export function validateAdminAuditEvent(event: AuditEvent): void {
  if (requiresAdminReason(event.eventType)) {
    if (event.actorType !== AuditActorType.ADMIN) {
      throw new Error(`Event type ${event.eventType} requires ADMIN actor`);
    }
    if (!event.adminReason || event.adminReason.trim().length < 10) {
      throw new Error(`Event type ${event.eventType} requires a reason of at least 10 characters`);
    }
  }
}
