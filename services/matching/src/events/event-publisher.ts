/**
 * Event Publisher Service
 * 
 * Provides typed methods for publishing all outbound events.
 * Ensures consistent event structure and audit logging.
 * 
 * RULE: Every state change MUST emit an audit event.
 */

import { v4 as uuidv4 } from 'uuid';
import { getEventBus, createEventMetadata } from './event-bus.js';
import { auditLogger } from '../lib/audit-logger.js';
import { logger } from '../lib/logger.js';

// ============================================================================
// REALTIME BROADCAST HELPER
// ============================================================================

const API_GATEWAY_URL = process.env.API_GATEWAY_INTERNAL_URL || 'http://localhost:3001';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'dev-internal-secret';

/**
 * Broadcast event to connected WebSocket clients via API Gateway
 */
async function broadcastToClients(
  eventType: 'request_update' | 'new_match' | 'match_expired' | 'proposal_received',
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/internal/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SERVICE_SECRET,
      },
      body: JSON.stringify({ eventType, payload }),
    });

    if (!response.ok) {
      logger.warn({
        eventType,
        status: response.status,
      }, 'Failed to broadcast to API Gateway');
    }
  } catch (error) {
    // Non-blocking - don't fail event publishing if broadcast fails
    logger.warn({ error, eventType }, 'Error broadcasting to API Gateway');
  }
}
import { 
  EVENT_CHANNELS, 
  MatchingAuditAction,
  type AgentsMatchedEvent,
  type AgentDeclinedEvent,
  type MatchingFailedEvent,
  type MatchingStatusChangedEvent,
  type RematchInitiatedEvent,
  type AdminOverrideAppliedEvent,
  type MatchingAuditLogEvent,
  type EventMetadata,
} from '../types/events.js';
import type {
  RequestId,
  AgentId,
  MatchId,
  UserId,
  AgentMatch,
  AgentDecline,
  MatchingStatus,
  AdminOverrideAction,
  AgentTier,
} from '../types/index.js';

/**
 * Event Publisher for the Matching Service
 */
export class EventPublisher {
  /**
   * Publish AgentsMatched event
   */
  async publishAgentsMatched(params: {
    requestId: RequestId;
    matches: readonly AgentMatch[];
    starAgentsCount: number;
    benchAgentsCount: number;
    totalCandidatesEvaluated: number;
    matchingDurationMs: number;
    isPeakSeason: boolean;
    attempt: number;
    expiresAt: string;
    metadata?: Partial<EventMetadata>;
  }): Promise<void> {
    const eventBus = getEventBus();
    const metadata = createEventMetadata(
      params.metadata?.traceId,
      params.metadata?.userId as string | undefined,
      params.metadata?.sessionId
    );

    await eventBus.publish<AgentsMatchedEvent>(
      EVENT_CHANNELS.AGENTS_MATCHED,
      {
        eventType: 'AGENTS_MATCHED',
        correlationId: uuidv4(),
        payload: {
          requestId: params.requestId,
          matches: params.matches,
          starAgentsCount: params.starAgentsCount,
          benchAgentsCount: params.benchAgentsCount,
          totalCandidatesEvaluated: params.totalCandidatesEvaluated,
          matchingDurationMs: params.matchingDurationMs,
          isPeakSeason: params.isPeakSeason,
          attempt: params.attempt,
          expiresAt: params.expiresAt,
        },
        metadata,
      }
    );

    // Emit audit log for each matched agent
    for (const match of params.matches) {
      await this.publishAuditLog({
        action: MatchingAuditAction.AGENT_SELECTED,
        requestId: params.requestId,
        agentId: match.agentId,
        matchId: match.matchId,
        tier: match.tier,
        score: match.matchScore,
        details: {
          matchReasons: match.matchReasons,
          attempt: params.attempt,
          isPeakSeason: params.isPeakSeason,
        },
        metadata,
      });

      // Broadcast to agent's WebSocket clients
      broadcastToClients('new_match', {
        agentId: match.agentId,
        requestId: params.requestId,
        matchId: match.matchId,
        matchScore: match.matchScore,
        expiresAt: params.expiresAt,
      });
    }

    // Broadcast request update to user's WebSocket clients
    broadcastToClients('request_update', {
      requestId: params.requestId,
      status: 'agents_matched',
      matchCount: params.matches.length,
    });

    logger.info({
      requestId: params.requestId,
      matchCount: params.matches.length,
      starCount: params.starAgentsCount,
      benchCount: params.benchAgentsCount,
    }, 'Published AgentsMatched event');
  }

  /**
   * Publish AgentDeclined event
   */
  async publishAgentDeclined(params: {
    decline: AgentDecline;
    remainingMatches: number;
    requiresRematch: boolean;
    metadata?: Partial<EventMetadata>;
  }): Promise<void> {
    const eventBus = getEventBus();
    const metadata = createEventMetadata(
      params.metadata?.traceId,
      params.metadata?.userId as string | undefined,
      params.metadata?.sessionId
    );

    await eventBus.publish<AgentDeclinedEvent>(
      EVENT_CHANNELS.AGENT_DECLINED,
      {
        eventType: 'AGENT_DECLINED',
        correlationId: uuidv4(),
        payload: {
          decline: params.decline,
          remainingMatches: params.remainingMatches,
          requiresRematch: params.requiresRematch,
        },
        metadata,
      }
    );

    // Emit audit log
    await this.publishAuditLog({
      action: MatchingAuditAction.AGENT_DECLINED,
      requestId: params.decline.requestId,
      agentId: params.decline.agentId,
      matchId: params.decline.matchId,
      details: {
        reason: params.decline.reason,
        remainingMatches: params.remainingMatches,
        requiresRematch: params.requiresRematch,
      },
      metadata,
    });

    logger.info({
      matchId: params.decline.matchId,
      agentId: params.decline.agentId,
      reason: params.decline.reason,
    }, 'Published AgentDeclined event');
  }

  /**
   * Publish MatchingFailed event
   */
  async publishMatchingFailed(params: {
    requestId: RequestId;
    reason: string;
    attemptsMade: number;
    totalAgentsEvaluated: number;
    isPeakSeason: boolean;
    metadata?: Partial<EventMetadata>;
  }): Promise<void> {
    const eventBus = getEventBus();
    const metadata = createEventMetadata(
      params.metadata?.traceId,
      params.metadata?.userId as string | undefined,
      params.metadata?.sessionId
    );

    await eventBus.publish<MatchingFailedEvent>(
      EVENT_CHANNELS.MATCHING_FAILED,
      {
        eventType: 'MATCHING_FAILED',
        correlationId: uuidv4(),
        payload: {
          requestId: params.requestId,
          reason: params.reason,
          attemptsMade: params.attemptsMade,
          totalAgentsEvaluated: params.totalAgentsEvaluated,
          isPeakSeason: params.isPeakSeason,
        },
        metadata,
      }
    );

    // Emit audit log
    await this.publishAuditLog({
      action: MatchingAuditAction.MATCHING_FAILED,
      requestId: params.requestId,
      details: {
        reason: params.reason,
        attemptsMade: params.attemptsMade,
        totalAgentsEvaluated: params.totalAgentsEvaluated,
        isPeakSeason: params.isPeakSeason,
      },
      metadata,
    });

    logger.warn({
      requestId: params.requestId,
      reason: params.reason,
      attemptsMade: params.attemptsMade,
    }, 'Published MatchingFailed event');
  }

  /**
   * Publish MatchingStatusChanged event
   */
  async publishMatchingStatusChanged(params: {
    requestId: RequestId;
    previousStatus: MatchingStatus;
    newStatus: MatchingStatus;
    reason: string;
    metadata?: Partial<EventMetadata>;
  }): Promise<void> {
    const eventBus = getEventBus();
    const metadata = createEventMetadata(
      params.metadata?.traceId,
      params.metadata?.userId as string | undefined,
      params.metadata?.sessionId
    );

    await eventBus.publish<MatchingStatusChangedEvent>(
      EVENT_CHANNELS.MATCHING_STATUS_CHANGED,
      {
        eventType: 'MATCHING_STATUS_CHANGED',
        correlationId: uuidv4(),
        payload: {
          requestId: params.requestId,
          previousStatus: params.previousStatus,
          newStatus: params.newStatus,
          reason: params.reason,
        },
        metadata,
      }
    );

    // Broadcast status update to user's WebSocket clients
    broadcastToClients('request_update', {
      requestId: params.requestId,
      status: params.newStatus,
      previousStatus: params.previousStatus,
      reason: params.reason,
    });

    logger.info({
      requestId: params.requestId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
    }, 'Published MatchingStatusChanged event');
  }

  /**
   * Publish RematchInitiated event
   */
  async publishRematchInitiated(params: {
    requestId: RequestId;
    attempt: number;
    previousMatchIds: readonly MatchId[];
    reason: string;
    metadata?: Partial<EventMetadata>;
  }): Promise<void> {
    const eventBus = getEventBus();
    const metadata = createEventMetadata(
      params.metadata?.traceId,
      params.metadata?.userId as string | undefined,
      params.metadata?.sessionId
    );

    await eventBus.publish<RematchInitiatedEvent>(
      EVENT_CHANNELS.REMATCH_INITIATED,
      {
        eventType: 'REMATCH_INITIATED',
        correlationId: uuidv4(),
        payload: {
          requestId: params.requestId,
          attempt: params.attempt,
          previousMatchIds: params.previousMatchIds,
          reason: params.reason,
        },
        metadata,
      }
    );

    // Emit audit log
    await this.publishAuditLog({
      action: MatchingAuditAction.REMATCH_STARTED,
      requestId: params.requestId,
      details: {
        attempt: params.attempt,
        previousMatchIds: params.previousMatchIds,
        reason: params.reason,
      },
      metadata,
    });

    logger.info({
      requestId: params.requestId,
      attempt: params.attempt,
    }, 'Published RematchInitiated event');
  }

  /**
   * Publish AdminOverrideApplied event
   */
  async publishAdminOverrideApplied(params: {
    requestId: RequestId;
    adminUserId: UserId;
    action: AdminOverrideAction;
    reason: string;
    affectedAgentIds: readonly AgentId[];
    result: string;
    metadata?: Partial<EventMetadata>;
  }): Promise<void> {
    const eventBus = getEventBus();
    const metadata = createEventMetadata(
      params.metadata?.traceId,
      params.adminUserId as string,
      params.metadata?.sessionId
    );

    await eventBus.publish<AdminOverrideAppliedEvent>(
      EVENT_CHANNELS.ADMIN_OVERRIDE_APPLIED,
      {
        eventType: 'ADMIN_OVERRIDE_APPLIED',
        correlationId: uuidv4(),
        payload: {
          requestId: params.requestId,
          adminUserId: params.adminUserId,
          action: params.action,
          reason: params.reason,
          affectedAgentIds: params.affectedAgentIds,
          result: params.result,
        },
        metadata,
      }
    );

    // Emit audit log - admin actions MUST be logged
    await this.publishAuditLog({
      action: MatchingAuditAction.ADMIN_OVERRIDE,
      requestId: params.requestId,
      adminUserId: params.adminUserId,
      details: {
        overrideAction: params.action,
        reason: params.reason,
        affectedAgentIds: params.affectedAgentIds,
        result: params.result,
      },
      metadata,
    });

    // Also log to dedicated audit logger
    auditLogger.logAdminAction({
      adminUserId: params.adminUserId,
      action: params.action,
      resourceType: 'MATCHING_REQUEST',
      resourceId: params.requestId,
      reason: params.reason,
      details: {
        affectedAgentIds: params.affectedAgentIds,
        result: params.result,
      },
    });

    logger.info({
      requestId: params.requestId,
      adminUserId: params.adminUserId,
      action: params.action,
    }, 'Published AdminOverrideApplied event');
  }

  /**
   * Publish audit log event
   */
  async publishAuditLog(params: {
    action: MatchingAuditAction;
    requestId: RequestId;
    agentId?: AgentId;
    matchId?: MatchId;
    adminUserId?: UserId;
    tier?: AgentTier;
    score?: number;
    details: Record<string, unknown>;
    metadata: EventMetadata;
  }): Promise<void> {
    const eventBus = getEventBus();

    const payload: {
      action: MatchingAuditAction;
      requestId: RequestId;
      details: Record<string, unknown>;
      agentId?: AgentId;
      matchId?: MatchId;
      adminUserId?: UserId;
      tier?: AgentTier;
      score?: number;
    } = {
      action: params.action,
      requestId: params.requestId,
      details: params.details,
    };

    if (params.agentId) payload.agentId = params.agentId;
    if (params.matchId) payload.matchId = params.matchId;
    if (params.adminUserId) payload.adminUserId = params.adminUserId;
    if (params.tier) payload.tier = params.tier;
    if (params.score !== undefined) payload.score = params.score;

    await eventBus.publish<MatchingAuditLogEvent>(
      EVENT_CHANNELS.MATCHING_AUDIT_LOG,
      {
        eventType: 'MATCHING_AUDIT_LOG',
        correlationId: uuidv4(),
        payload,
        metadata: params.metadata,
      }
    );
  }
}

/**
 * Singleton event publisher instance
 */
export const eventPublisher = new EventPublisher();
