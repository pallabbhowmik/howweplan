import type { AuditEvent, AuditEventPayload } from '../events/types.js';
import { env } from '../env.js';

/**
 * Audit event input.
 */
export interface AuditEventInput {
  eventType: string;
  entityType: 'submission' | 'itinerary' | 'itinerary_version';
  entityId: string;
  actorId: string;
  actorRole: 'TRAVELER' | 'AGENT' | 'ADMIN' | 'SYSTEM';
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

/**
 * Create a structured audit event.
 * 
 * BUSINESS RULE: Every state change MUST emit an audit event.
 */
export function createAuditEvent(input: AuditEventInput): AuditEvent {
  const timestamp = new Date().toISOString();

  const payload: AuditEventPayload = {
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    changes: input.changes,
    metadata: input.metadata,
    timestamp,
  };

  return {
    type: 'audit',
    payload,
    metadata: {
      timestamp,
      correlationId: input.entityId,
      source: env.SERVICE_NAME,
    },
  };
}

/**
 * Format changes for logging.
 */
export function formatChanges(
  changes: Record<string, { from: unknown; to: unknown }>
): string {
  const formatted = Object.entries(changes)
    .map(([key, { from, to }]) => `${key}: ${JSON.stringify(from)} → ${JSON.stringify(to)}`)
    .join(', ');

  return formatted || 'No changes';
}

/**
 * Create a minimal audit trail entry.
 */
export interface AuditTrailEntry {
  timestamp: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorRole: string;
  summary: string;
}

/**
 * Convert audit event to trail entry.
 */
export function toAuditTrailEntry(event: AuditEvent): AuditTrailEntry {
  return {
    timestamp: event.payload.timestamp,
    eventType: event.payload.eventType,
    entityType: event.payload.entityType,
    entityId: event.payload.entityId,
    actorId: event.payload.actorId,
    actorRole: event.payload.actorRole,
    summary: formatChanges(event.payload.changes),
  };
}
