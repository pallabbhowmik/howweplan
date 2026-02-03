/**
 * Agent Scoring Engine
 * 
 * Calculates match scores for agents based on multiple factors.
 * Higher scores indicate better matches for the request.
 * 
 * RULE: Matching is advisory - scores inform selection, not guarantee it.
 * RULE: Never expose agent identity - only scores and tiers are used.
 */

import { 
  matchingConfig, 
  featureFlags 
} from '../config/index.js';
import { logger } from '../lib/logger.js';
import {
  type InternalAgentData,
  type TravelRequestData,
  type MatchingScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
  AgentTier,
  AgentAvailability,
  AgentSpecialization,
  TripType,
} from '../types/index.js';

/**
 * Scored agent result
 */
export interface ScoredAgent {
  readonly agent: InternalAgentData;
  readonly totalScore: number;
  readonly scoreBreakdown: ScoreBreakdown;
  readonly matchReasons: readonly string[];
  readonly exclusionReason?: string;
}

/**
 * Score breakdown by factor
 */
export interface ScoreBreakdown {
  readonly tierScore: number;
  readonly ratingScore: number;
  readonly responseTimeScore: number;
  readonly specializationScore: number;
  readonly regionScore: number;
  readonly workloadScore: number;
}

/**
 * Trip type to specialization mapping
 */
const TRIP_TYPE_SPECIALIZATIONS: Record<TripType, AgentSpecialization[]> = {
  [TripType.ADVENTURE]: [AgentSpecialization.ADVENTURE, AgentSpecialization.SOLO],
  [TripType.HONEYMOON]: [AgentSpecialization.HONEYMOON, AgentSpecialization.LUXURY],
  [TripType.FAMILY]: [AgentSpecialization.FAMILY, AgentSpecialization.GROUP],
  [TripType.LUXURY]: [AgentSpecialization.LUXURY, AgentSpecialization.HONEYMOON],
  [TripType.BUDGET]: [AgentSpecialization.BUDGET, AgentSpecialization.SOLO],
  [TripType.BUSINESS]: [AgentSpecialization.BUSINESS],
  [TripType.SOLO]: [AgentSpecialization.SOLO, AgentSpecialization.ADVENTURE, AgentSpecialization.BUDGET],
  [TripType.GROUP]: [AgentSpecialization.GROUP, AgentSpecialization.FAMILY],
};

/**
 * Agent Scoring Engine
 */
export class AgentScoringEngine {
  private readonly weights: MatchingScoringWeights;

  constructor(weights: MatchingScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    this.weights = weights;
    this.validateWeights();
  }

  /**
   * Validate that weights sum to 1.0
   */
  private validateWeights(): void {
    const total = 
      this.weights.tierWeight +
      this.weights.ratingWeight +
      this.weights.responseTimeWeight +
      this.weights.specializationWeight +
      this.weights.regionWeight +
      this.weights.workloadWeight;

    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error(`Scoring weights must sum to 1.0, got ${total}`);
    }
  }

  /**
   * Score a single agent against a request
   */
  scoreAgent(
    agent: InternalAgentData,
    request: TravelRequestData
  ): ScoredAgent {
    const matchReasons: string[] = [];
    let exclusionReason: string | undefined;

    // Check for hard exclusions first
    exclusionReason = this.checkExclusions(agent);
    if (exclusionReason) {
      return {
        agent,
        totalScore: 0,
        scoreBreakdown: this.createZeroBreakdown(),
        matchReasons: [],
        exclusionReason,
      };
    }

    // Calculate individual scores
    const tierScore = this.calculateTierScore(agent, matchReasons);
    const ratingScore = this.calculateRatingScore(agent, matchReasons);
    const responseTimeScore = this.calculateResponseTimeScore(agent, matchReasons);
    const specializationScore = this.calculateSpecializationScore(agent, request, matchReasons);
    const regionScore = this.calculateRegionScore(agent, request, matchReasons);
    const workloadScore = this.calculateWorkloadScore(agent, matchReasons);

    // Calculate weighted total
    const totalScore = 
      tierScore * this.weights.tierWeight +
      ratingScore * this.weights.ratingWeight +
      responseTimeScore * this.weights.responseTimeWeight +
      specializationScore * this.weights.specializationWeight +
      regionScore * this.weights.regionWeight +
      workloadScore * this.weights.workloadWeight;

    const scoreBreakdown: ScoreBreakdown = {
      tierScore,
      ratingScore,
      responseTimeScore,
      specializationScore,
      regionScore,
      workloadScore,
    };

    return {
      agent,
      totalScore: Math.round(totalScore * 100) / 100,
      scoreBreakdown,
      matchReasons,
    };
  }

  /**
   * Score multiple agents and return sorted results.
   * 
   * OPTIMIZATION: Uses Set for O(1) exclusion checks and single-pass
   * filtering to reduce time complexity from O(n*m) to O(n).
   */
  scoreAgents(
    agents: readonly InternalAgentData[],
    request: TravelRequestData
  ): ScoredAgent[] {
    // Single pass: score and partition in one iteration
    const valid: ScoredAgent[] = [];
    const excluded: ScoredAgent[] = [];
    
    for (const agent of agents) {
      const scored = this.scoreAgent(agent, request);
      if (scored.exclusionReason) {
        excluded.push(scored);
      } else {
        valid.push(scored);
      }
    }

    // Log exclusions
    if (excluded.length > 0) {
      logger.debug({
        requestId: request.requestId,
        excludedCount: excluded.length,
        reasons: excluded.map(e => ({
          agentId: e.agent.agentId,
          reason: e.exclusionReason,
        })),
      }, 'Agents excluded from matching');
    }

    // Sort valid matches by score descending
    // Note: For top-K selection, a min-heap would be more efficient O(n log k)
    // but the typical agent pool is small enough that Array.sort() is adequate
    valid.sort((a, b) => b.totalScore - a.totalScore);

    return valid;
  }

  /**
   * Check for hard exclusion criteria
   */
  private checkExclusions(agent: InternalAgentData): string | undefined {
    if (!agent.isActive) {
      return 'Agent is not active';
    }

    if (agent.availability !== AgentAvailability.AVAILABLE) {
      return `Agent unavailable: ${agent.availability}`;
    }

    if (agent.currentWorkload >= agent.maxWorkload) {
      return 'Agent at maximum workload capacity';
    }

    return undefined;
  }

  /**
   * Calculate tier score (0-100)
   * Star agents get higher base scores
   */
  private calculateTierScore(
    agent: InternalAgentData,
    reasons: string[]
  ): number {
    if (agent.tier === AgentTier.STAR) {
      // Verify star status
      if (
        agent.rating >= matchingConfig.starAgentMinRating &&
        agent.completedBookings >= matchingConfig.starAgentMinBookings
      ) {
        reasons.push('Star-tier agent with verified high performance');
        return 100;
      }
      // Degraded star (doesn't meet current thresholds)
      reasons.push('Star-tier agent (grandfathered status)');
      return 85;
    }

    // Bench agents
    if (agent.completedBookings >= matchingConfig.starAgentMinBookings / 2) {
      reasons.push('Experienced bench agent');
      return 60;
    }

    reasons.push('Newer bench agent building reputation');
    return 40;
  }

  /**
   * Calculate rating score (0-100)
   */
  private calculateRatingScore(
    agent: InternalAgentData,
    reasons: string[]
  ): number {
    // Rating is 0-5, normalize to 0-100
    const score = (agent.rating / 5) * 100;

    if (agent.rating >= 4.8) {
      reasons.push('Exceptional rating (4.8+)');
    } else if (agent.rating >= 4.5) {
      reasons.push('Excellent rating (4.5+)');
    } else if (agent.rating >= 4.0) {
      reasons.push('Good rating (4.0+)');
    }

    return score;
  }

  /**
   * Calculate response time score (0-100)
   * Lower response times = higher scores
   */
  private calculateResponseTimeScore(
    agent: InternalAgentData,
    reasons: string[]
  ): number {
    const avgHours = agent.averageResponseTimeHours;

    if (avgHours <= 1) {
      reasons.push('Extremely fast responder (<1 hour)');
      return 100;
    }
    if (avgHours <= 4) {
      reasons.push('Very fast responder (<4 hours)');
      return 90;
    }
    if (avgHours <= 12) {
      reasons.push('Fast responder (<12 hours)');
      return 75;
    }
    if (avgHours <= 24) {
      reasons.push('Same-day responder');
      return 60;
    }
    if (avgHours <= 48) {
      return 40;
    }

    return 20;
  }

  /**
   * Calculate specialization match score (0-100)
   * OPTIMIZATION: Uses Set for O(1) lookups instead of Array.includes()
   */
  private calculateSpecializationScore(
    agent: InternalAgentData,
    request: TravelRequestData,
    reasons: string[]
  ): number {
    if (!featureFlags.specializationMatching) {
      return 50; // Neutral score when disabled
    }

    const desiredSpecs = TRIP_TYPE_SPECIALIZATIONS[request.tripType] ?? [];
    
    if (desiredSpecs.length === 0) {
      return 50; // No preference
    }

    // Use Set for O(1) lookup instead of Array.includes() O(n)
    const desiredSpecsSet = new Set(desiredSpecs);
    const agentSpecsSet = new Set(agent.specializations);
    
    const matchingSpecs = agent.specializations.filter(s => desiredSpecsSet.has(s));

    if (matchingSpecs.length === 0) {
      return 30; // No specialization match
    }

    // Primary specialization match (first in desired list)
    if (agentSpecsSet.has(desiredSpecs[0] as AgentSpecialization)) {
      reasons.push(`Primary specialization match: ${desiredSpecs[0]}`);
      return 100;
    }

    // Secondary specialization match
    reasons.push(`Secondary specialization match: ${matchingSpecs.join(', ')}`);
    return 70;
  }

  /**
   * Calculate region/destination match score (0-100)
   * OPTIMIZATION: Pre-normalize strings and use optimized matching
   */
  private calculateRegionScore(
    agent: InternalAgentData,
    request: TravelRequestData,
    reasons: string[]
  ): number {
    if (!featureFlags.geoMatching) {
      return 50; // Neutral score when disabled
    }

    if (agent.regions.length === 0) {
      return 40; // Generalist agent
    }

    // Pre-normalize agent regions once (instead of in nested loop)
    const normalizedAgentRegions = agent.regions.map(r => r.toLowerCase());
    
    const matchingRegions = request.destinations.filter(dest => {
      const destLower = dest.toLowerCase();
      // Use some() with pre-normalized regions
      return normalizedAgentRegions.some(region => 
        destLower.includes(region) || region.includes(destLower)
      );
    });

    if (matchingRegions.length === 0) {
      return 20; // No region match
    }

    const matchRatio = matchingRegions.length / request.destinations.length;

    if (matchRatio >= 1) {
      reasons.push(`Expert in all destinations: ${matchingRegions.join(', ')}`);
      return 100;
    }

    if (matchRatio >= 0.5) {
      reasons.push(`Expert in some destinations: ${matchingRegions.join(', ')}`);
      return 70;
    }

    return 50;
  }

  /**
   * Calculate workload availability score (0-100)
   * Agents with more capacity get higher scores
   */
  private calculateWorkloadScore(
    agent: InternalAgentData,
    reasons: string[]
  ): number {
    const capacity = agent.maxWorkload - agent.currentWorkload;
    const capacityRatio = capacity / agent.maxWorkload;

    if (capacityRatio >= 0.8) {
      reasons.push('High availability');
      return 100;
    }
    if (capacityRatio >= 0.5) {
      reasons.push('Moderate availability');
      return 70;
    }
    if (capacityRatio >= 0.2) {
      return 40;
    }

    return 20;
  }

  /**
   * Create a zero score breakdown
   */
  private createZeroBreakdown(): ScoreBreakdown {
    return {
      tierScore: 0,
      ratingScore: 0,
      responseTimeScore: 0,
      specializationScore: 0,
      regionScore: 0,
      workloadScore: 0,
    };
  }
}

/**
 * Create a scoring engine with default weights
 */
export function createScoringEngine(
  weights?: MatchingScoringWeights
): AgentScoringEngine {
  return new AgentScoringEngine(weights);
}
