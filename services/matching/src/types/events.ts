/**
 * Event Type Definitions
 * 
 * Defines all events that this service produces and consumes.
 * Events are the ONLY way modules communicate with each other.
 * 
 * ARCHITECTURE: Event-driven workflows with strong typing.
 * Every state change MUST emit an audit event.
 */

import { z } from 'zod';
import type {
  RequestId,
  AgentId,
  UserId,
  MatchId,
  EventId,
  TravelRequestData,
  AgentMatch,
  AgentDecline,
  MatchingStatus,
  AdminOverrideAction,
  AgentTier,
} from './index.js';

// ============================================
// EVENT BASE TYPES
// ============================================

/**
 * Base event interface - all events must extend this
 */
export interface BaseEvent {
  readonly eventId: EventId;
  readonly eventType: string;
  readonly timestamp: string;
  readonly version: string;
  readonly correlationId: string;
  readonly source: string;
}

/**
 * Event metadata for tracing and debugging
 */
export interface EventMetadata {
  readonly traceId: string;
  readonly spanId: string;
  readonly userId?: UserId;
  readonly sessionId?: string;
}

// ============================================
// INBOUND EVENTS (Consumed by this service)
// ============================================

/**
 * Event: RequestCreated
 * Source: Request Service
 * Trigger: User submits a new travel request
 */
export interface RequestCreatedEvent extends BaseEvent {
  readonly eventType: 'REQUEST_CREATED';
  readonly payload: {
    readonly request: TravelRequestData;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: AgentAvailabilityChanged
 * Source: Agent Service
 * Trigger: Agent updates their availability status
 */
export interface AgentAvailabilityChangedEvent extends BaseEvent {
  readonly eventType: 'AGENT_AVAILABILITY_CHANGED';
  readonly payload: {
    readonly agentId: AgentId;
    readonly previousStatus: string;
    readonly newStatus: string;
    readonly effectiveFrom: string;
    readonly effectiveUntil?: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: AgentRespondedToMatch
 * Source: Agent Service
 * Trigger: Agent accepts or declines a match
 */
export interface AgentRespondedToMatchEvent extends BaseEvent {
  readonly eventType: 'AGENT_RESPONDED_TO_MATCH';
  readonly payload: {
    readonly matchId: MatchId;
    readonly agentId: AgentId;
    readonly requestId: RequestId;
    readonly accepted: boolean;
    readonly declineReason?: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: AdminOverrideRequested
 * Source: Admin Service
 * Trigger: Admin requests to override matching behavior
 */
export interface AdminOverrideRequestedEvent extends BaseEvent {
  readonly eventType: 'ADMIN_OVERRIDE_REQUESTED';
  readonly payload: {
    readonly requestId: RequestId;
    readonly adminUserId: UserId;
    readonly action: AdminOverrideAction;
    readonly reason: string;
    readonly targetAgentIds?: readonly AgentId[];
    readonly newTimeoutHours?: number;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: MatchingTimeoutExpired
 * Source: Scheduler Service
 * Trigger: Agent response timeout has elapsed
 */
export interface MatchingTimeoutExpiredEvent extends BaseEvent {
  readonly eventType: 'MATCHING_TIMEOUT_EXPIRED';
  readonly payload: {
    readonly requestId: RequestId;
    readonly matchIds: readonly MatchId[];
    readonly expiredAt: string;
  };
  readonly metadata: EventMetadata;
}

// ============================================
// OUTBOUND EVENTS (Produced by this service)
// ============================================

/**
 * Event: AgentsMatched
 * Destination: Request Service, Notification Service
 * Trigger: Matching algorithm has selected agents for a request
 */
export interface AgentsMatchedEvent extends BaseEvent {
  readonly eventType: 'AGENTS_MATCHED';
  readonly payload: {
    readonly requestId: RequestId;
    readonly matches: readonly AgentMatch[];
    readonly starAgentsCount: number;
    readonly benchAgentsCount: number;
    readonly totalCandidatesEvaluated: number;
    readonly matchingDurationMs: number;
    readonly isPeakSeason: boolean;
    readonly attempt: number;
    readonly expiresAt: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: AgentDeclined
 * Destination: Request Service, Audit Service
 * Trigger: Agent declined or timed out on a match
 */
export interface AgentDeclinedEvent extends BaseEvent {
  readonly eventType: 'AGENT_DECLINED';
  readonly payload: {
    readonly decline: AgentDecline;
    readonly remainingMatches: number;
    readonly requiresRematch: boolean;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: MatchingFailed
 * Destination: Request Service, Notification Service
 * Trigger: Unable to find suitable agents after all attempts
 */
export interface MatchingFailedEvent extends BaseEvent {
  readonly eventType: 'MATCHING_FAILED';
  readonly payload: {
    readonly requestId: RequestId;
    readonly reason: string;
    readonly attemptsMade: number;
    readonly totalAgentsEvaluated: number;
    readonly isPeakSeason: boolean;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: MatchingStatusChanged
 * Destination: Request Service
 * Trigger: Any status change in the matching lifecycle
 */
export interface MatchingStatusChangedEvent extends BaseEvent {
  readonly eventType: 'MATCHING_STATUS_CHANGED';
  readonly payload: {
    readonly requestId: RequestId;
    readonly previousStatus: MatchingStatus;
    readonly newStatus: MatchingStatus;
    readonly reason: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: RematchInitiated
 * Destination: Internal, Audit Service
 * Trigger: Rematch process started due to declines
 */
export interface RematchInitiatedEvent extends BaseEvent {
  readonly eventType: 'REMATCH_INITIATED';
  readonly payload: {
    readonly requestId: RequestId;
    readonly attempt: number;
    readonly previousMatchIds: readonly MatchId[];
    readonly reason: string;
  };
  readonly metadata: EventMetadata;
}

/**
 * Event: AdminOverrideApplied
 * Destination: Audit Service, Admin Service
 * Trigger: Admin override was successfully applied
 */
export interface AdminOverrideAppliedEvent extends BaseEvent {
  readonly eventType: 'ADMIN_OVERRIDE_APPLIED';
  readonly payload: {
    readonly requestId: RequestId;
    readonly adminUserId: UserId;
    readonly action: AdminOverrideAction;
    readonly reason: string;
    readonly affectedAgentIds: readonly AgentId[];
    readonly result: string;
  };
  readonly metadata: EventMetadata;
}

// ============================================
// AUDIT EVENTS
// ============================================

/**
 * Audit event types for this service
 */
export enum MatchingAuditAction {
  MATCHING_STARTED = 'MATCHING_STARTED',
  MATCHING_COMPLETED = 'MATCHING_COMPLETED',
  MATCHING_FAILED = 'MATCHING_FAILED',
  AGENT_SCORED = 'AGENT_SCORED',
  AGENT_SELECTED = 'AGENT_SELECTED',
  AGENT_EXCLUDED = 'AGENT_EXCLUDED',
  AGENT_DECLINED = 'AGENT_DECLINED',
  AGENT_TIMEOUT = 'AGENT_TIMEOUT',
  REMATCH_STARTED = 'REMATCH_STARTED',
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE',
  PEAK_SEASON_ACTIVATED = 'PEAK_SEASON_ACTIVATED',
  TIER_FALLBACK_USED = 'TIER_FALLBACK_USED',
}

/**
 * Event: MatchingAuditLog
 * Destination: Audit Service
 * Trigger: Every state change in matching process
 */
export interface MatchingAuditLogEvent extends BaseEvent {
  readonly eventType: 'MATCHING_AUDIT_LOG';
  readonly payload: {
    readonly action: MatchingAuditAction;
    readonly requestId: RequestId;
    readonly agentId?: AgentId;
    readonly matchId?: MatchId;
    readonly adminUserId?: UserId;
    readonly details: Record<string, unknown>;
    readonly tier?: AgentTier;
    readonly score?: number;
  };
  readonly metadata: EventMetadata;
}

// ============================================
// EVENT UNION TYPES
// ============================================

/**
 * All inbound events this service handles
 */
export type InboundEvent =
  | RequestCreatedEvent
  | AgentAvailabilityChangedEvent
  | AgentRespondedToMatchEvent
  | AdminOverrideRequestedEvent
  | MatchingTimeoutExpiredEvent;

/**
 * All outbound events this service produces
 */
export type OutboundEvent =
  | AgentsMatchedEvent
  | AgentDeclinedEvent
  | MatchingFailedEvent
  | MatchingStatusChangedEvent
  | RematchInitiatedEvent
  | AdminOverrideAppliedEvent
  | MatchingAuditLogEvent;

/**
 * All events this service deals with
 */
export type MatchingServiceEvent = InboundEvent | OutboundEvent;

// ============================================
// EVENT CHANNEL NAMES
// ============================================

export const EVENT_CHANNELS = {
  // Inbound channels
  REQUEST_CREATED: 'events:request:created',
  AGENT_AVAILABILITY_CHANGED: 'events:agent:availability-changed',
  AGENT_RESPONDED_TO_MATCH: 'events:agent:responded-to-match',
  ADMIN_OVERRIDE_REQUESTED: 'events:admin:override-requested',
  MATCHING_TIMEOUT_EXPIRED: 'events:matching:timeout-expired',
  
  // Outbound channels
  AGENTS_MATCHED: 'events:matching:agents-matched',
  AGENT_DECLINED: 'events:matching:agent-declined',
  MATCHING_FAILED: 'events:matching:failed',
  MATCHING_STATUS_CHANGED: 'events:matching:status-changed',
  REMATCH_INITIATED: 'events:matching:rematch-initiated',
  ADMIN_OVERRIDE_APPLIED: 'events:matching:admin-override-applied',
  
  // Audit channel
  MATCHING_AUDIT_LOG: 'events:audit:matching',
} as const;

// ============================================
// EVENT VALIDATION SCHEMAS
// ============================================

export const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  timestamp: z.string().datetime(),
  version: z.string(),
  correlationId: z.string().uuid(),
  source: z.string(),
});

export const eventMetadataSchema = z.object({
  traceId: z.string(),
  spanId: z.string(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
});
