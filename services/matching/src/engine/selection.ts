/**
 * Agent Selection Engine
 * 
 * Selects the optimal set of agents for a travel request.
 * Implements Star vs Bench separation with fallback logic.
 * 
 * RULE: Select 2-3 agents per request
 * RULE: Star vs Bench separation
 * RULE: Peak-season scarcity handling
 * RULE: Matching is advisory
 * RULE: Never expose agent identity
 */

import { v4 as uuidv4 } from 'uuid';
import { matchingConfig, featureFlags } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { auditLogger } from '../lib/audit-logger.js';
import { detectPeakSeason, type PeakSeasonInfo } from '../lib/peak-season.js';
import { AgentScoringEngine, type ScoredAgent } from './scoring.js';
import {
  type TravelRequestData,
  type InternalAgentData,
  type AgentMatch,
  type MatchingResult,
  type MatchingCriteria,
  AgentTier,
  MatchingStatus,
  DEFAULT_SCORING_WEIGHTS,
  createMatchId,
} from '../types/index.js';

/**
 * Selection result before final formatting
 */
interface SelectionResult {
  readonly selectedAgents: ScoredAgent[];
  readonly starCount: number;
  readonly benchCount: number;
  readonly totalEvaluated: number;
  readonly usedBenchFallback: boolean;
  readonly peakSeasonInfo: PeakSeasonInfo;
}

/**
 * Agent Selection Engine
 */
export class AgentSelectionEngine {
  private readonly scoringEngine: AgentScoringEngine;

  constructor() {
    this.scoringEngine = new AgentScoringEngine(DEFAULT_SCORING_WEIGHTS);
  }

  /**
   * Select agents for a travel request
   */
  async selectAgents(
    request: TravelRequestData,
    availableAgents: readonly InternalAgentData[],
    attempt: number = 1,
    excludeAgentIds: readonly string[] = []
  ): Promise<MatchingResult> {
    const startTime = Date.now();

    // Detect peak season
    const peakSeasonInfo = detectPeakSeason(
      new Date(request.startDate),
      new Date(request.endDate),
      request.destinations,
      matchingConfig.minAgents,
      matchingConfig.responseTimeoutHours
    );

    // Filter out excluded agents
    const eligibleAgents = availableAgents.filter(
      agent => !excludeAgentIds.includes(agent.agentId)
    );

    // Log matching start
    auditLogger.logMatchingStarted({
      requestId: request.requestId,
      candidateCount: eligibleAgents.length,
      isPeakSeason: peakSeasonInfo.isPeakSeason,
      attempt,
    });

    logger.info({
      requestId: request.requestId,
      eligibleAgents: eligibleAgents.length,
      excludedAgents: excludeAgentIds.length,
      isPeakSeason: peakSeasonInfo.isPeakSeason,
      attempt,
    }, 'Starting agent selection');

    // Score all eligible agents
    const scoredAgents = this.scoringEngine.scoreAgents(eligibleAgents, request);

    // Perform selection with Star/Bench logic
    const selectionResult = this.performSelection(
      scoredAgents,
      request,
      peakSeasonInfo
    );

    // Check if we have enough agents
    const minRequired = peakSeasonInfo.adjustedMinAgents;
    
    if (selectionResult.selectedAgents.length < minRequired) {
      const durationMs = Date.now() - startTime;
      
      // If this isn't the last attempt, return failure for retry
      if (attempt < matchingConfig.maxAttempts) {
        return {
          requestId: request.requestId,
          status: MatchingStatus.NO_AGENTS_AVAILABLE,
          matches: [],
          starAgentsCount: 0,
          benchAgentsCount: 0,
          totalCandidatesEvaluated: eligibleAgents.length,
          matchingDurationMs: durationMs,
          isPeakSeason: peakSeasonInfo.isPeakSeason,
          attempt,
          completedAt: new Date().toISOString(),
        };
      }

      // Last attempt - return whatever we have or fail
      if (selectionResult.selectedAgents.length === 0) {
        return {
          requestId: request.requestId,
          status: MatchingStatus.MATCHING_FAILED,
          matches: [],
          starAgentsCount: 0,
          benchAgentsCount: 0,
          totalCandidatesEvaluated: eligibleAgents.length,
          matchingDurationMs: durationMs,
          isPeakSeason: peakSeasonInfo.isPeakSeason,
          attempt,
          completedAt: new Date().toISOString(),
        };
      }
    }

    // Create matches
    const matches = this.createMatches(
      selectionResult.selectedAgents,
      request,
      peakSeasonInfo.adjustedTimeoutHours
    );

    // Log each selected agent
    for (const match of matches) {
      const scoredAgent = selectionResult.selectedAgents.find(
        s => s.agent.agentId === match.agentId
      );
      if (scoredAgent) {
        auditLogger.logAgentSelected({
          requestId: request.requestId,
          agentId: match.agentId,
          matchId: match.matchId,
          tier: match.tier,
          score: match.matchScore,
          reasons: match.matchReasons,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    // Log matching completed
    auditLogger.logMatchingCompleted({
      requestId: request.requestId,
      matchCount: matches.length,
      starCount: selectionResult.starCount,
      benchCount: selectionResult.benchCount,
      durationMs,
    });

    logger.info({
      requestId: request.requestId,
      matchCount: matches.length,
      starCount: selectionResult.starCount,
      benchCount: selectionResult.benchCount,
      durationMs,
      usedBenchFallback: selectionResult.usedBenchFallback,
    }, 'Agent selection completed');

    return {
      requestId: request.requestId,
      status: MatchingStatus.AGENTS_MATCHED,
      matches,
      starAgentsCount: selectionResult.starCount,
      benchAgentsCount: selectionResult.benchCount,
      totalCandidatesEvaluated: eligibleAgents.length,
      matchingDurationMs: durationMs,
      isPeakSeason: peakSeasonInfo.isPeakSeason,
      attempt,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * Perform the actual selection with Star/Bench logic
   */
  private performSelection(
    scoredAgents: ScoredAgent[],
    request: TravelRequestData,
    peakSeasonInfo: PeakSeasonInfo
  ): SelectionResult {
    const maxAgents = matchingConfig.maxAgents;
    const minAgents = peakSeasonInfo.adjustedMinAgents;

    // Separate Star and Bench agents
    const starAgents = scoredAgents.filter(
      s => s.agent.tier === AgentTier.STAR
    );
    const benchAgents = scoredAgents.filter(
      s => s.agent.tier === AgentTier.BENCH
    );

    const selectedAgents: ScoredAgent[] = [];
    let usedBenchFallback = false;

    // Strategy 1: Try to fill with Star agents first
    const targetStarCount = Math.min(maxAgents, starAgents.length);
    selectedAgents.push(...starAgents.slice(0, targetStarCount));

    // Strategy 2: If not enough Star agents, use Bench fallback
    if (selectedAgents.length < minAgents && featureFlags.benchFallback) {
      usedBenchFallback = true;
      const neededBench = Math.min(
        maxAgents - selectedAgents.length,
        benchAgents.length
      );
      selectedAgents.push(...benchAgents.slice(0, neededBench));

      if (neededBench > 0) {
        auditLogger.logTierFallback({
          requestId: request.requestId,
          starAgentsFound: targetStarCount,
          benchAgentsAdded: neededBench,
        });
      }
    }

    // Strategy 3: Peak season adjustment - log if using reduced requirements
    if (peakSeasonInfo.isPeakSeason && selectedAgents.length < matchingConfig.minAgents) {
      auditLogger.logPeakSeasonActivated({
        requestId: request.requestId,
        availableAgents: scoredAgents.length,
        adjustedMinAgents: minAgents,
      });
    }

    // Calculate final counts
    const starCount = selectedAgents.filter(
      s => s.agent.tier === AgentTier.STAR
    ).length;
    const benchCount = selectedAgents.filter(
      s => s.agent.tier === AgentTier.BENCH
    ).length;

    return {
      selectedAgents,
      starCount,
      benchCount,
      totalEvaluated: scoredAgents.length,
      usedBenchFallback,
      peakSeasonInfo,
    };
  }

  /**
   * Create match records from selected agents
   */
  private createMatches(
    selectedAgents: ScoredAgent[],
    request: TravelRequestData,
    timeoutHours: number
  ): AgentMatch[] {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutHours * 60 * 60 * 1000);

    return selectedAgents.map(scored => ({
      matchId: createMatchId(uuidv4()),
      agentId: scored.agent.agentId,
      requestId: request.requestId,
      tier: scored.agent.tier,
      matchScore: scored.totalScore,
      matchReasons: scored.matchReasons,
      matchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }));
  }

  /**
   * Build matching criteria from request
   */
  buildMatchingCriteria(
    request: TravelRequestData,
    peakSeasonInfo: PeakSeasonInfo
  ): MatchingCriteria {
    return {
      requestId: request.requestId,
      destinations: request.destinations,
      tripType: request.tripType,
      preferredSpecializations: [],
      minAgents: peakSeasonInfo.adjustedMinAgents,
      maxAgents: matchingConfig.maxAgents,
      allowBenchFallback: featureFlags.benchFallback,
      isPeakSeason: peakSeasonInfo.isPeakSeason,
      scoringWeights: DEFAULT_SCORING_WEIGHTS,
    };
  }
}

/**
 * Create the selection engine
 */
export function createSelectionEngine(): AgentSelectionEngine {
  return new AgentSelectionEngine();
}
