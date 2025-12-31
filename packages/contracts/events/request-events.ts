/**
 * Request Events
 * Events related to travel request lifecycle
 */

import type { BaseEvent } from './base-event';
import type { RequestState } from '../states/request-state';
import type {
  TravelRequestDestination,
  TravelRequestDates,
  TravelRequestBudget,
  TravelRequestTravelers,
  TravelRequestPreferences,
} from '../entities/travel-request';

/**
 * RequestCreated Event Payload
 */
export interface RequestCreatedPayload {
  readonly requestId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string;
  readonly destinations: readonly TravelRequestDestination[];
  readonly dates: TravelRequestDates;
  readonly budget: TravelRequestBudget;
  readonly travelers: TravelRequestTravelers;
  readonly preferences: TravelRequestPreferences;
  readonly expiresAt: Date;
}

export type RequestCreatedEvent = BaseEvent<RequestCreatedPayload>;

/**
 * AgentsMatched Event Payload
 * Fired when agents are matched to a request
 */
export interface AgentsMatchedPayload {
  readonly requestId: string;
  readonly userId: string;
  readonly matchedAgentIds: readonly string[];
  readonly matchingCriteria: {
    readonly destinations: readonly string[];
    readonly specializations: readonly string[];
    readonly languages: readonly string[];
  };
  readonly previousState: RequestState;
  readonly newState: RequestState;
}

export type AgentsMatchedEvent = BaseEvent<AgentsMatchedPayload>;

/**
 * AgentConfirmed Event Payload
 * Fired when an agent confirms interest in a request
 * Constitution rule 10: After this, full agent identity can be revealed
 */
export interface AgentConfirmedPayload {
  readonly requestId: string;
  readonly agentId: string;
  readonly userId: string;
  readonly confirmationMessage: string | null;
  readonly estimatedResponseTime: number; // hours
  readonly previousState: RequestState;
  readonly newState: RequestState;
}

export type AgentConfirmedEvent = BaseEvent<AgentConfirmedPayload>;

/**
 * AgentRevealed Event Payload
 * Fired when agent identity is revealed to user (post-confirmation)
 * Constitution rule 10: Full identity revealed after confirmation, before payment
 */
export interface AgentRevealedPayload {
  readonly requestId: string;
  readonly agentId: string;
  readonly userId: string;
  readonly revealedFields: readonly string[];
}

export type AgentRevealedEvent = BaseEvent<AgentRevealedPayload>;
