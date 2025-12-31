/**
 * Shared Type Definitions and Contracts
 * 
 * These types define the contracts between this service and the rest of the platform.
 * They are designed to be serializable for event bus transmission.
 * 
 * ARCHITECTURE: These types should match the shared contracts package.
 * Modules communicate ONLY via shared contracts and event bus.
 */

import { z } from 'zod';

// ============================================
// PRIMITIVE TYPES
// ============================================

/**
 * Branded type for type-safe IDs
 */
export type RequestId = string & { readonly __brand: 'RequestId' };
export type AgentId = string & { readonly __brand: 'AgentId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type MatchId = string & { readonly __brand: 'MatchId' };
export type EventId = string & { readonly __brand: 'EventId' };

/**
 * ID factory functions
 */
export const createRequestId = (id: string): RequestId => id as RequestId;
export const createAgentId = (id: string): AgentId => id as AgentId;
export const createUserId = (id: string): UserId => id as UserId;
export const createMatchId = (id: string): MatchId => id as MatchId;
export const createEventId = (id: string): EventId => id as EventId;

// ============================================
// AGENT TYPES
// ============================================

/**
 * Agent tier classification
 * Star: High-performing agents with excellent ratings
 * Bench: Newer or lower-rated agents building their reputation
 */
export enum AgentTier {
  STAR = 'STAR',
  BENCH = 'BENCH',
}

/**
 * Agent availability status
 */
export enum AgentAvailability {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  ON_VACATION = 'ON_VACATION',
}

/**
 * Agent specialization types
 */
export enum AgentSpecialization {
  ADVENTURE = 'ADVENTURE',
  HONEYMOON = 'HONEYMOON',
  FAMILY = 'FAMILY',
  LUXURY = 'LUXURY',
  BUDGET = 'BUDGET',
  BUSINESS = 'BUSINESS',
  SOLO = 'SOLO',
  GROUP = 'GROUP',
  CRUISE = 'CRUISE',
  SAFARI = 'SAFARI',
}

/**
 * Obfuscated agent data for matching (pre-payment)
 * SECURITY: Never expose full agent identity before confirmation
 */
export interface ObfuscatedAgent {
  readonly agentId: AgentId;
  readonly firstName: string;
  readonly photoUrl: string | null;
  readonly tier: AgentTier;
  readonly rating: number;
  readonly completedBookings: number;
  readonly responseTimeHours: number;
  readonly specializations: readonly AgentSpecialization[];
  readonly regions: readonly string[];
}

/**
 * Internal agent data (never exposed externally)
 */
export interface InternalAgentData {
  readonly agentId: AgentId;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string;
  readonly photoUrl: string | null;
  readonly tier: AgentTier;
  readonly rating: number;
  readonly completedBookings: number;
  readonly averageResponseTimeHours: number;
  readonly availability: AgentAvailability;
  readonly specializations: readonly AgentSpecialization[];
  readonly regions: readonly string[];
  readonly currentWorkload: number;
  readonly maxWorkload: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Trip request types
 */
export enum TripType {
  ADVENTURE = 'ADVENTURE',
  HONEYMOON = 'HONEYMOON',
  FAMILY = 'FAMILY',
  LUXURY = 'LUXURY',
  BUDGET = 'BUDGET',
  BUSINESS = 'BUSINESS',
  SOLO = 'SOLO',
  GROUP = 'GROUP',
}

/**
 * Request status in the matching lifecycle
 */
export enum MatchingStatus {
  PENDING = 'PENDING',
  MATCHING_IN_PROGRESS = 'MATCHING_IN_PROGRESS',
  AGENTS_MATCHED = 'AGENTS_MATCHED',
  AWAITING_AGENT_RESPONSE = 'AWAITING_AGENT_RESPONSE',
  AGENT_CONFIRMED = 'AGENT_CONFIRMED',
  NO_AGENTS_AVAILABLE = 'NO_AGENTS_AVAILABLE',
  MATCHING_FAILED = 'MATCHING_FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Travel request data needed for matching
 */
export interface TravelRequestData {
  readonly requestId: RequestId;
  readonly userId: UserId;
  readonly destinations: readonly string[];
  readonly tripType: TripType;
  readonly startDate: string;
  readonly endDate: string;
  readonly travelers: number;
  readonly budgetMin: number;
  readonly budgetMax: number;
  readonly budgetCurrency: string;
  readonly preferences: readonly string[];
  readonly createdAt: string;
}

// ============================================
// MATCHING TYPES
// ============================================

/**
 * Match result for a single agent
 */
export interface AgentMatch {
  readonly matchId: MatchId;
  readonly agentId: AgentId;
  readonly requestId: RequestId;
  readonly tier: AgentTier;
  readonly matchScore: number;
  readonly matchReasons: readonly string[];
  readonly matchedAt: string;
  readonly expiresAt: string;
}

/**
 * Complete matching result
 */
export interface MatchingResult {
  readonly requestId: RequestId;
  readonly status: MatchingStatus;
  readonly matches: readonly AgentMatch[];
  readonly starAgentsCount: number;
  readonly benchAgentsCount: number;
  readonly totalCandidatesEvaluated: number;
  readonly matchingDurationMs: number;
  readonly isPeakSeason: boolean;
  readonly attempt: number;
  readonly completedAt: string;
}

/**
 * Decline reason types
 */
export enum DeclineReason {
  AGENT_UNAVAILABLE = 'AGENT_UNAVAILABLE',
  AGENT_DECLINED = 'AGENT_DECLINED',
  AGENT_TIMEOUT = 'AGENT_TIMEOUT',
  WORKLOAD_EXCEEDED = 'WORKLOAD_EXCEEDED',
  REGION_MISMATCH = 'REGION_MISMATCH',
  SPECIALIZATION_MISMATCH = 'SPECIALIZATION_MISMATCH',
}

/**
 * Agent decline record
 */
export interface AgentDecline {
  readonly matchId: MatchId;
  readonly agentId: AgentId;
  readonly requestId: RequestId;
  readonly reason: DeclineReason;
  readonly declinedAt: string;
}

// ============================================
// MATCHING CRITERIA
// ============================================

/**
 * Scoring weights for matching algorithm
 */
export interface MatchingScoringWeights {
  readonly tierWeight: number;
  readonly ratingWeight: number;
  readonly responseTimeWeight: number;
  readonly specializationWeight: number;
  readonly regionWeight: number;
  readonly workloadWeight: number;
}

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS: MatchingScoringWeights = {
  tierWeight: 0.20,
  ratingWeight: 0.25,
  responseTimeWeight: 0.15,
  specializationWeight: 0.20,
  regionWeight: 0.15,
  workloadWeight: 0.05,
} as const;

/**
 * Matching criteria for agent selection
 */
export interface MatchingCriteria {
  readonly requestId: RequestId;
  readonly destinations: readonly string[];
  readonly tripType: TripType;
  readonly preferredSpecializations: readonly AgentSpecialization[];
  readonly minAgents: number;
  readonly maxAgents: number;
  readonly allowBenchFallback: boolean;
  readonly isPeakSeason: boolean;
  readonly scoringWeights: MatchingScoringWeights;
}

// ============================================
// ADMIN OVERRIDE TYPES
// ============================================

/**
 * Admin override action types
 */
export enum AdminOverrideAction {
  FORCE_MATCH = 'FORCE_MATCH',
  FORCE_REMATCH = 'FORCE_REMATCH',
  CANCEL_MATCHING = 'CANCEL_MATCHING',
  EXTEND_TIMEOUT = 'EXTEND_TIMEOUT',
  OVERRIDE_TIER_REQUIREMENT = 'OVERRIDE_TIER_REQUIREMENT',
}

/**
 * Admin override request
 * All admin actions require a reason and are audit-logged
 */
export interface AdminOverrideRequest {
  readonly requestId: RequestId;
  readonly adminUserId: UserId;
  readonly action: AdminOverrideAction;
  readonly reason: string;
  readonly targetAgentIds?: readonly AgentId[];
  readonly newTimeoutHours?: number;
  readonly requestedAt: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const travelRequestDataSchema = z.object({
  requestId: z.string().uuid(),
  userId: z.string().uuid(),
  destinations: z.array(z.string().min(1)).min(1),
  tripType: z.nativeEnum(TripType),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  travelers: z.number().int().min(1).max(100),
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(0),
  budgetCurrency: z.string().length(3),
  preferences: z.array(z.string()),
  createdAt: z.string().datetime(),
}).refine(data => data.budgetMax >= data.budgetMin, {
  message: 'budgetMax must be greater than or equal to budgetMin',
});

export const adminOverrideRequestSchema = z.object({
  requestId: z.string().uuid(),
  adminUserId: z.string().uuid(),
  action: z.nativeEnum(AdminOverrideAction),
  reason: z.string().min(10).max(1000),
  targetAgentIds: z.array(z.string().uuid()).optional(),
  newTimeoutHours: z.number().int().min(1).max(168).optional(),
  requestedAt: z.string().datetime(),
});
