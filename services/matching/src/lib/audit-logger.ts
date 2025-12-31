/**
 * Audit Logger
 * 
 * Specialized logger for audit trail requirements.
 * All admin actions require a reason and are audit-logged.
 * Every state change MUST emit an audit event.
 */

import { logger, createChildLogger } from './logger.js';
import { env } from '../config/index.js';
import type { 
  RequestId, 
  AgentId, 
  UserId, 
  MatchId,
  AgentTier,
} from '../types/index.js';
import { MatchingAuditAction } from '../types/events.js';

/**
 * Audit log entry structure
 */
interface AuditLogEntry {
  readonly timestamp: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly actorType: 'SYSTEM' | 'ADMIN' | 'USER' | 'AGENT';
  readonly actorId?: string;
  readonly reason?: string;
  readonly details: Record<string, unknown>;
  readonly serviceName: string;
  readonly environment: string;
}

/**
 * Admin action audit parameters
 */
interface AdminActionParams {
  readonly adminUserId: UserId;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly reason: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Matching action audit parameters
 */
interface MatchingActionParams {
  readonly action: MatchingAuditAction;
  readonly requestId: RequestId;
  readonly agentId?: AgentId;
  readonly matchId?: MatchId;
  readonly tier?: AgentTier;
  readonly score?: number;
  readonly details?: Record<string, unknown>;
}

/**
 * Audit Logger class
 */
class AuditLogger {
  private readonly auditLog = createChildLogger({ component: 'audit' });

  /**
   * Log a system action
   */
  logSystemAction(params: {
    action: string;
    resourceType: string;
    resourceId: string;
    details?: Record<string, unknown>;
  }): void {
    if (!env.AUDIT_LOG_ENABLED) {
      return;
    }

    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      actorType: 'SYSTEM',
      details: params.details ?? {},
      serviceName: env.SERVICE_NAME,
      environment: env.NODE_ENV,
    };

    this.auditLog.info(entry, `AUDIT: ${params.action}`);
  }

  /**
   * Log an admin action
   * RULE: All admin actions require a reason and are audit-logged
   */
  logAdminAction(params: AdminActionParams): void {
    if (!env.AUDIT_LOG_ENABLED) {
      return;
    }

    // Validate reason is provided for admin actions
    if (!params.reason || params.reason.trim().length < 10) {
      logger.error({
        adminUserId: params.adminUserId,
        action: params.action,
      }, 'Admin action attempted without valid reason');
      throw new Error('Admin actions require a reason of at least 10 characters');
    }

    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      actorType: 'ADMIN',
      actorId: params.adminUserId,
      reason: params.reason,
      details: params.details ?? {},
      serviceName: env.SERVICE_NAME,
      environment: env.NODE_ENV,
    };

    this.auditLog.info(entry, `AUDIT: Admin ${params.action}`);
  }

  /**
   * Log a matching-related action
   */
  logMatchingAction(params: MatchingActionParams): void {
    if (!env.AUDIT_LOG_ENABLED) {
      return;
    }

    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action: params.action,
      resourceType: 'MATCHING_REQUEST',
      resourceId: params.requestId,
      actorType: 'SYSTEM',
      details: {
        agentId: params.agentId,
        matchId: params.matchId,
        tier: params.tier,
        score: params.score,
        ...params.details,
      },
      serviceName: env.SERVICE_NAME,
      environment: env.NODE_ENV,
    };

    this.auditLog.info(entry, `AUDIT: Matching ${params.action}`);
  }

  /**
   * Log agent selection
   */
  logAgentSelected(params: {
    requestId: RequestId;
    agentId: AgentId;
    matchId: MatchId;
    tier: AgentTier;
    score: number;
    reasons: readonly string[];
  }): void {
    this.logMatchingAction({
      action: MatchingAuditAction.AGENT_SELECTED,
      requestId: params.requestId,
      agentId: params.agentId,
      matchId: params.matchId,
      tier: params.tier,
      score: params.score,
      details: { reasons: params.reasons },
    });
  }

  /**
   * Log agent exclusion
   */
  logAgentExcluded(params: {
    requestId: RequestId;
    agentId: AgentId;
    tier: AgentTier;
    reason: string;
  }): void {
    this.logMatchingAction({
      action: MatchingAuditAction.AGENT_EXCLUDED,
      requestId: params.requestId,
      agentId: params.agentId,
      tier: params.tier,
      details: { excludeReason: params.reason },
    });
  }

  /**
   * Log matching started
   */
  logMatchingStarted(params: {
    requestId: RequestId;
    candidateCount: number;
    isPeakSeason: boolean;
    attempt: number;
  }): void {
    this.logMatchingAction({
      action: MatchingAuditAction.MATCHING_STARTED,
      requestId: params.requestId,
      details: {
        candidateCount: params.candidateCount,
        isPeakSeason: params.isPeakSeason,
        attempt: params.attempt,
      },
    });
  }

  /**
   * Log matching completed
   */
  logMatchingCompleted(params: {
    requestId: RequestId;
    matchCount: number;
    starCount: number;
    benchCount: number;
    durationMs: number;
  }): void {
    this.logMatchingAction({
      action: MatchingAuditAction.MATCHING_COMPLETED,
      requestId: params.requestId,
      details: {
        matchCount: params.matchCount,
        starCount: params.starCount,
        benchCount: params.benchCount,
        durationMs: params.durationMs,
      },
    });
  }

  /**
   * Log peak season activation
   */
  logPeakSeasonActivated(params: {
    requestId: RequestId;
    availableAgents: number;
    adjustedMinAgents: number;
  }): void {
    this.logMatchingAction({
      action: MatchingAuditAction.PEAK_SEASON_ACTIVATED,
      requestId: params.requestId,
      details: {
        availableAgents: params.availableAgents,
        adjustedMinAgents: params.adjustedMinAgents,
      },
    });
  }

  /**
   * Log tier fallback
   */
  logTierFallback(params: {
    requestId: RequestId;
    starAgentsFound: number;
    benchAgentsAdded: number;
  }): void {
    this.logMatchingAction({
      action: MatchingAuditAction.TIER_FALLBACK_USED,
      requestId: params.requestId,
      details: {
        starAgentsFound: params.starAgentsFound,
        benchAgentsAdded: params.benchAgentsAdded,
      },
    });
  }
}

/**
 * Singleton audit logger instance
 */
export const auditLogger = new AuditLogger();
