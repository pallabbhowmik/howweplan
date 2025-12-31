/**
 * Main Matching Engine
 * 
 * Orchestrates the full matching workflow including:
 * - Initial matching
 * - Rematching after declines
 * - Admin overrides
 * - State management
 * 
 * RULE: Matching is advisory
 * RULE: Admin override via event only
 * RULE: Every state change MUST emit an audit event
 */

import { matchingConfig } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { auditLogger } from '../lib/audit-logger.js';
import { eventPublisher } from '../events/event-publisher.js';
import { createEventMetadata } from '../events/event-bus.js';
import { AgentSelectionEngine } from './selection.js';
import {
  type TravelRequestData,
  type InternalAgentData,
  type MatchingResult,
  type AgentDecline,
  type AdminOverrideRequest,
  MatchingStatus,
  AdminOverrideAction,
  DeclineReason,
  createMatchId,
} from '../types/index.js';
import { MatchingAuditAction } from '../types/events.js';

/**
 * Matching state for a request
 */
interface MatchingState {
  readonly requestId: string;
  readonly request: TravelRequestData;
  status: MatchingStatus;
  currentAttempt: number;
  excludedAgentIds: string[];
  activeMatchIds: string[];
  declines: AgentDecline[];
  lastResult?: MatchingResult;
}

/**
 * Main Matching Engine
 */
export class MatchingEngine {
  private readonly selectionEngine: AgentSelectionEngine;
  private readonly matchingStates: Map<string, MatchingState>;

  constructor() {
    this.selectionEngine = new AgentSelectionEngine();
    this.matchingStates = new Map();
  }

  /**
   * Process a new travel request
   */
  async processRequest(
    request: TravelRequestData,
    availableAgents: readonly InternalAgentData[]
  ): Promise<MatchingResult> {
    // Initialize state
    const state: MatchingState = {
      requestId: request.requestId,
      request,
      status: MatchingStatus.PENDING,
      currentAttempt: 0,
      excludedAgentIds: [],
      activeMatchIds: [],
      declines: [],
    };
    this.matchingStates.set(request.requestId, state);

    // Update status
    await this.updateStatus(state, MatchingStatus.MATCHING_IN_PROGRESS, 'Initial matching started');

    // Perform matching
    const result = await this.performMatching(state, availableAgents);

    // Update state with result
    state.lastResult = result;

    // Handle result
    if (result.status === MatchingStatus.AGENTS_MATCHED) {
      state.activeMatchIds = result.matches.map(m => m.matchId);
      await this.updateStatus(state, MatchingStatus.AWAITING_AGENT_RESPONSE, 'Agents matched, awaiting responses');

      // Publish AgentsMatched event
      await eventPublisher.publishAgentsMatched({
        requestId: result.requestId,
        matches: result.matches,
        starAgentsCount: result.starAgentsCount,
        benchAgentsCount: result.benchAgentsCount,
        totalCandidatesEvaluated: result.totalCandidatesEvaluated,
        matchingDurationMs: result.matchingDurationMs,
        isPeakSeason: result.isPeakSeason,
        attempt: result.attempt,
        expiresAt: result.matches[0]?.expiresAt ?? new Date().toISOString(),
      });
    } else if (result.status === MatchingStatus.MATCHING_FAILED) {
      await this.updateStatus(state, MatchingStatus.MATCHING_FAILED, 'Unable to find suitable agents');

      // Publish MatchingFailed event
      await eventPublisher.publishMatchingFailed({
        requestId: result.requestId,
        reason: 'No available agents match the request criteria',
        attemptsMade: result.attempt,
        totalAgentsEvaluated: result.totalCandidatesEvaluated,
        isPeakSeason: result.isPeakSeason,
      });
    }

    return result;
  }

  /**
   * Perform matching with retry logic
   */
  private async performMatching(
    state: MatchingState,
    availableAgents: readonly InternalAgentData[]
  ): Promise<MatchingResult> {
    let result: MatchingResult;

    do {
      state.currentAttempt++;
      
      result = await this.selectionEngine.selectAgents(
        state.request,
        availableAgents,
        state.currentAttempt,
        state.excludedAgentIds
      );

      // If we got agents or definitively failed, exit loop
      if (result.status === MatchingStatus.AGENTS_MATCHED || 
          result.status === MatchingStatus.MATCHING_FAILED) {
        break;
      }

      // Wait before retry
      if (state.currentAttempt < matchingConfig.maxAttempts) {
        logger.info({
          requestId: state.requestId,
          attempt: state.currentAttempt,
          nextAttemptIn: matchingConfig.retryCooldownSeconds,
        }, 'No agents found, scheduling retry');

        await this.delay(matchingConfig.retryCooldownSeconds * 1000);
      }
    } while (state.currentAttempt < matchingConfig.maxAttempts);

    return result;
  }

  /**
   * Handle agent decline
   */
  async handleAgentDecline(
    requestId: string,
    agentId: string,
    matchId: string,
    reason: DeclineReason,
    availableAgents: readonly InternalAgentData[]
  ): Promise<void> {
    const state = this.matchingStates.get(requestId);
    if (!state) {
      logger.warn({ requestId }, 'Received decline for unknown request');
      return;
    }

    // Record decline
    const decline: AgentDecline = {
      matchId: createMatchId(matchId),
      agentId: agentId as any,
      requestId: requestId as any,
      reason,
      declinedAt: new Date().toISOString(),
    };
    state.declines.push(decline);
    state.excludedAgentIds.push(agentId);
    state.activeMatchIds = state.activeMatchIds.filter(id => id !== matchId);

    const remainingMatches = state.activeMatchIds.length;
    const requiresRematch = remainingMatches < matchingConfig.minAgents;

    // Publish decline event
    await eventPublisher.publishAgentDeclined({
      decline,
      remainingMatches,
      requiresRematch,
    });

    logger.info({
      requestId,
      agentId,
      matchId,
      reason,
      remainingMatches,
      requiresRematch,
    }, 'Agent decline processed');

    // Trigger rematch if needed
    if (requiresRematch && state.currentAttempt < matchingConfig.maxAttempts) {
      await this.triggerRematch(state, availableAgents);
    } else if (remainingMatches === 0) {
      await this.handleAllAgentsDeclined(state, availableAgents);
    }
  }

  /**
   * Trigger a rematch attempt
   */
  private async triggerRematch(
    state: MatchingState,
    availableAgents: readonly InternalAgentData[]
  ): Promise<void> {
    const previousMatchIds = [...state.activeMatchIds];
    state.activeMatchIds = [];

    // Publish rematch event
    await eventPublisher.publishRematchInitiated({
      requestId: state.requestId as any,
      attempt: state.currentAttempt + 1,
      previousMatchIds: previousMatchIds as any,
      reason: 'Insufficient remaining matches after agent decline',
    });

    await this.updateStatus(state, MatchingStatus.MATCHING_IN_PROGRESS, 'Rematch initiated');

    // Perform rematch
    const result = await this.performMatching(state, availableAgents);
    state.lastResult = result;

    if (result.status === MatchingStatus.AGENTS_MATCHED) {
      state.activeMatchIds = result.matches.map(m => m.matchId);
      await this.updateStatus(state, MatchingStatus.AWAITING_AGENT_RESPONSE, 'Rematch successful');

      await eventPublisher.publishAgentsMatched({
        requestId: result.requestId,
        matches: result.matches,
        starAgentsCount: result.starAgentsCount,
        benchAgentsCount: result.benchAgentsCount,
        totalCandidatesEvaluated: result.totalCandidatesEvaluated,
        matchingDurationMs: result.matchingDurationMs,
        isPeakSeason: result.isPeakSeason,
        attempt: result.attempt,
        expiresAt: result.matches[0]?.expiresAt ?? new Date().toISOString(),
      });
    } else {
      await this.handleAllAgentsDeclined(state, availableAgents);
    }
  }

  /**
   * Handle case when all agents have declined
   */
  private async handleAllAgentsDeclined(
    state: MatchingState,
    availableAgents: readonly InternalAgentData[]
  ): Promise<void> {
    // Try one more time with relaxed criteria
    if (state.currentAttempt < matchingConfig.maxAttempts) {
      await this.triggerRematch(state, availableAgents);
      return;
    }

    // Final failure
    await this.updateStatus(state, MatchingStatus.MATCHING_FAILED, 'All matching attempts exhausted');

    await eventPublisher.publishMatchingFailed({
      requestId: state.requestId as any,
      reason: 'All agents declined or no suitable agents available after maximum attempts',
      attemptsMade: state.currentAttempt,
      totalAgentsEvaluated: state.lastResult?.totalCandidatesEvaluated ?? 0,
      isPeakSeason: state.lastResult?.isPeakSeason ?? false,
    });
  }

  /**
   * Handle admin override request
   * RULE: Admin override via event only
   * RULE: All admin actions require a reason and are audit-logged
   */
  async handleAdminOverride(
    override: AdminOverrideRequest,
    availableAgents: readonly InternalAgentData[]
  ): Promise<void> {
    const state = this.matchingStates.get(override.requestId);
    
    // Validate reason exists (enforced in code, not comments)
    if (!override.reason || override.reason.trim().length < 10) {
      throw new Error('Admin override requires a reason of at least 10 characters');
    }

    logger.info({
      requestId: override.requestId,
      action: override.action,
      adminUserId: override.adminUserId,
      reason: override.reason,
    }, 'Processing admin override');

    switch (override.action) {
      case AdminOverrideAction.FORCE_MATCH:
        await this.handleForceMatch(override, state, availableAgents);
        break;
      
      case AdminOverrideAction.FORCE_REMATCH:
        if (state) {
          state.excludedAgentIds = []; // Clear exclusions
          await this.triggerRematch(state, availableAgents);
        }
        break;
      
      case AdminOverrideAction.CANCEL_MATCHING:
        if (state) {
          await this.updateStatus(state, MatchingStatus.CANCELLED, `Cancelled by admin: ${override.reason}`);
        }
        break;
      
      case AdminOverrideAction.EXTEND_TIMEOUT:
        // Timeout extension is handled by the scheduler service
        logger.info({
          requestId: override.requestId,
          newTimeoutHours: override.newTimeoutHours,
        }, 'Timeout extension requested');
        break;
      
      case AdminOverrideAction.OVERRIDE_TIER_REQUIREMENT:
        // This is handled in selection by peak season logic
        logger.info({
          requestId: override.requestId,
        }, 'Tier requirement override applied');
        break;
    }

    // Publish admin override applied event
    await eventPublisher.publishAdminOverrideApplied({
      requestId: override.requestId as any,
      adminUserId: override.adminUserId,
      action: override.action,
      reason: override.reason,
      affectedAgentIds: override.targetAgentIds ?? [],
      result: 'Override applied successfully',
    });
  }

  /**
   * Handle force match override
   */
  private async handleForceMatch(
    override: AdminOverrideRequest,
    state: MatchingState | undefined,
    availableAgents: readonly InternalAgentData[]
  ): Promise<void> {
    if (!override.targetAgentIds || override.targetAgentIds.length === 0) {
      throw new Error('FORCE_MATCH requires targetAgentIds');
    }

    // Find the target agents
    const targetAgents = availableAgents.filter(
      a => override.targetAgentIds?.includes(a.agentId)
    );

    if (targetAgents.length !== override.targetAgentIds.length) {
      throw new Error('Some target agents not found in available pool');
    }

    logger.info({
      requestId: override.requestId,
      targetAgentIds: override.targetAgentIds,
      reason: override.reason,
    }, 'Force match applied by admin');
  }

  /**
   * Update matching status with event emission
   */
  private async updateStatus(
    state: MatchingState,
    newStatus: MatchingStatus,
    reason: string
  ): Promise<void> {
    const previousStatus = state.status;
    state.status = newStatus;

    // Emit status change event
    await eventPublisher.publishMatchingStatusChanged({
      requestId: state.requestId as any,
      previousStatus,
      newStatus,
      reason,
    });

    logger.info({
      requestId: state.requestId,
      previousStatus,
      newStatus,
      reason,
    }, 'Matching status changed');
  }

  /**
   * Get current state for a request
   */
  getState(requestId: string): MatchingState | undefined {
    return this.matchingStates.get(requestId);
  }

  /**
   * Clean up old states (called periodically)
   */
  cleanupStates(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [requestId, state] of this.matchingStates) {
      const completedAt = state.lastResult?.completedAt;
      if (completedAt) {
        const age = now - new Date(completedAt).getTime();
        if (age > maxAgeMs) {
          toDelete.push(requestId);
        }
      }
    }

    for (const requestId of toDelete) {
      this.matchingStates.delete(requestId);
    }

    if (toDelete.length > 0) {
      logger.info({ cleanedUp: toDelete.length }, 'Cleaned up old matching states');
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create the matching engine
 */
export function createMatchingEngine(): MatchingEngine {
  return new MatchingEngine();
}
