/**
 * Event Handlers
 * 
 * Handlers for all inbound events consumed by the matching service.
 * Each handler validates input, processes the event, and emits appropriate responses.
 * 
 * RULE: Validate all inputs, even from internal services.
 * RULE: Every state change MUST emit an audit event.
 */

import { z } from 'zod';
import { logger, createRequestLogger } from '../lib/logger.js';
import { createMatchingEngine, MatchingEngine } from '../engine/index.js';
import { getAgentRepository } from '../repositories/index.js';
import { getEventBus, createEventMetadata } from '../events/index.js';
import { eventPublisher } from '../events/event-publisher.js';
import {
  EVENT_CHANNELS,
  type RequestCreatedEvent,
  type AgentAvailabilityChangedEvent,
  type AgentRespondedToMatchEvent,
  type AdminOverrideRequestedEvent,
  type MatchingTimeoutExpiredEvent,
} from '../types/events.js';
import {
  type TravelRequestData,
  type AdminOverrideRequest,
  travelRequestDataSchema,
  adminOverrideRequestSchema,
  DeclineReason,
  AgentAvailability,
  createRequestId,
  createAgentId,
  createMatchId,
  createUserId,
} from '../types/index.js';

/**
 * Event Handlers class
 */
export class EventHandlers {
  private readonly matchingEngine: MatchingEngine;
  private readonly agentRepository = getAgentRepository();

  constructor(matchingEngine?: MatchingEngine) {
    this.matchingEngine = matchingEngine ?? createMatchingEngine();
  }

  /**
   * Handle RequestCreated event
   * Triggered when a user submits a new travel request
   */
  async handleRequestCreated(event: RequestCreatedEvent): Promise<void> {
    const requestLogger = createRequestLogger(event.correlationId, {
      eventType: event.eventType,
      requestId: event.payload.request.requestId,
    });

    requestLogger.info('Processing RequestCreated event');

    try {
      // Validate incoming request data
      const validatedRequest = this.validateTravelRequest(event.payload.request);

      // Get available agents
      const availableAgents = await this.agentRepository.getAvailableAgents({
        availability: AgentAvailability.AVAILABLE,
        hasCapacity: true,
      });

      requestLogger.info({
        availableAgentsCount: availableAgents.length,
      }, 'Retrieved available agents');

      // Process the request through matching engine
      const result = await this.matchingEngine.processRequest(
        validatedRequest,
        availableAgents
      );

      requestLogger.info({
        status: result.status,
        matchCount: result.matches.length,
        duration: result.matchingDurationMs,
      }, 'Request matching completed');

    } catch (error) {
      requestLogger.error({ error }, 'Failed to process RequestCreated event');
      
      // Emit failure event
      await eventPublisher.publishMatchingFailed({
        requestId: createRequestId(event.payload.request.requestId),
        reason: error instanceof Error ? error.message : 'Unknown error during matching',
        attemptsMade: 1,
        totalAgentsEvaluated: 0,
        isPeakSeason: false,
        metadata: { traceId: event.correlationId },
      });
    }
  }

  /**
   * Handle AgentAvailabilityChanged event
   * Triggered when an agent updates their availability
   */
  async handleAgentAvailabilityChanged(event: AgentAvailabilityChangedEvent): Promise<void> {
    const requestLogger = createRequestLogger(event.correlationId, {
      eventType: event.eventType,
      agentId: event.payload.agentId,
    });

    requestLogger.info({
      previousStatus: event.payload.previousStatus,
      newStatus: event.payload.newStatus,
    }, 'Processing AgentAvailabilityChanged event');

    try {
      // Update agent availability in repository
      await this.agentRepository.updateAgentAvailability(
        createAgentId(event.payload.agentId),
        event.payload.newStatus as AgentAvailability
      );

      requestLogger.info('Agent availability updated');

    } catch (error) {
      requestLogger.error({ error }, 'Failed to process AgentAvailabilityChanged event');
    }
  }

  /**
   * Handle AgentRespondedToMatch event
   * Triggered when an agent accepts or declines a match
   */
  async handleAgentRespondedToMatch(event: AgentRespondedToMatchEvent): Promise<void> {
    const requestLogger = createRequestLogger(event.correlationId, {
      eventType: event.eventType,
      matchId: event.payload.matchId,
      agentId: event.payload.agentId,
    });

    requestLogger.info({
      accepted: event.payload.accepted,
      declineReason: event.payload.declineReason,
    }, 'Processing AgentRespondedToMatch event');

    try {
      if (event.payload.accepted) {
        // Agent accepted - update workload
        await this.agentRepository.incrementAgentWorkload(
          createAgentId(event.payload.agentId)
        );
        
        requestLogger.info('Agent accepted match, workload updated');
      } else {
        // Agent declined - process decline
        const availableAgents = await this.agentRepository.getAvailableAgents({
          availability: AgentAvailability.AVAILABLE,
          hasCapacity: true,
        });

        await this.matchingEngine.handleAgentDecline(
          event.payload.requestId,
          event.payload.agentId,
          event.payload.matchId,
          this.mapDeclineReason(event.payload.declineReason),
          availableAgents
        );

        requestLogger.info('Agent decline processed');
      }

    } catch (error) {
      requestLogger.error({ error }, 'Failed to process AgentRespondedToMatch event');
    }
  }

  /**
   * Handle AdminOverrideRequested event
   * Triggered when an admin requests to override matching behavior
   * RULE: Admin override via event only
   */
  async handleAdminOverrideRequested(event: AdminOverrideRequestedEvent): Promise<void> {
    const requestLogger = createRequestLogger(event.correlationId, {
      eventType: event.eventType,
      requestId: event.payload.requestId,
      adminUserId: event.payload.adminUserId,
    });

    requestLogger.info({
      action: event.payload.action,
      reason: event.payload.reason,
    }, 'Processing AdminOverrideRequested event');

    try {
      // Validate override request
      const validatedOverride = this.validateAdminOverride({
        ...event.payload,
        requestedAt: event.timestamp,
      });

      // Get available agents for potential rematch
      const availableAgents = await this.agentRepository.getAvailableAgents({
        availability: AgentAvailability.AVAILABLE,
        hasCapacity: true,
      });

      // Process the override
      await this.matchingEngine.handleAdminOverride(validatedOverride, availableAgents);

      requestLogger.info('Admin override processed successfully');

    } catch (error) {
      requestLogger.error({ error }, 'Failed to process AdminOverrideRequested event');
    }
  }

  /**
   * Handle MatchingTimeoutExpired event
   * Triggered when agent response timeout has elapsed
   */
  async handleMatchingTimeoutExpired(event: MatchingTimeoutExpiredEvent): Promise<void> {
    const requestLogger = createRequestLogger(event.correlationId, {
      eventType: event.eventType,
      requestId: event.payload.requestId,
    });

    requestLogger.info({
      matchIds: event.payload.matchIds,
      expiredAt: event.payload.expiredAt,
    }, 'Processing MatchingTimeoutExpired event');

    try {
      // Get available agents for potential rematch
      const availableAgents = await this.agentRepository.getAvailableAgents({
        availability: AgentAvailability.AVAILABLE,
        hasCapacity: true,
      });

      // Process timeout for each match
      for (const matchId of event.payload.matchIds) {
        const state = this.matchingEngine.getState(event.payload.requestId);
        if (!state) continue;

        // Find the agent for this match
        const match = state.lastResult?.matches.find(m => m.matchId === matchId);
        if (!match) continue;

        await this.matchingEngine.handleAgentDecline(
          event.payload.requestId,
          match.agentId,
          matchId,
          DeclineReason.AGENT_TIMEOUT,
          availableAgents
        );
      }

      requestLogger.info('Timeout processing completed');

    } catch (error) {
      requestLogger.error({ error }, 'Failed to process MatchingTimeoutExpired event');
    }
  }

  /**
   * Validate travel request data
   * RULE: Validate all inputs, even from internal services.
   */
  private validateTravelRequest(data: unknown): TravelRequestData {
    const result = travelRequestDataSchema.safeParse(data);
    
    if (!result.success) {
      logger.error({
        errors: result.error.errors,
        data,
      }, 'Invalid travel request data');
      throw new Error(`Invalid travel request: ${result.error.message}`);
    }

    return {
      ...result.data,
      requestId: createRequestId(result.data.requestId),
      userId: createUserId(result.data.userId),
    } as TravelRequestData;
  }

  /**
   * Validate admin override request
   */
  private validateAdminOverride(data: unknown): AdminOverrideRequest {
    const result = adminOverrideRequestSchema.safeParse(data);
    
    if (!result.success) {
      logger.error({
        errors: result.error.errors,
        data,
      }, 'Invalid admin override request');
      throw new Error(`Invalid admin override: ${result.error.message}`);
    }

    return {
      ...result.data,
      requestId: createRequestId(result.data.requestId),
      adminUserId: createUserId(result.data.adminUserId),
      targetAgentIds: result.data.targetAgentIds?.map(id => createAgentId(id)),
    } as AdminOverrideRequest;
  }

  /**
   * Map decline reason string to enum
   */
  private mapDeclineReason(reason?: string): DeclineReason {
    if (!reason) {
      return DeclineReason.AGENT_DECLINED;
    }

    const mapping: Record<string, DeclineReason> = {
      'unavailable': DeclineReason.AGENT_UNAVAILABLE,
      'declined': DeclineReason.AGENT_DECLINED,
      'timeout': DeclineReason.AGENT_TIMEOUT,
      'workload': DeclineReason.WORKLOAD_EXCEEDED,
      'region': DeclineReason.REGION_MISMATCH,
      'specialization': DeclineReason.SPECIALIZATION_MISMATCH,
    };

    const lowerReason = reason.toLowerCase();
    for (const [key, value] of Object.entries(mapping)) {
      if (lowerReason.includes(key)) {
        return value;
      }
    }

    return DeclineReason.AGENT_DECLINED;
  }
}

/**
 * Register all event handlers with the event bus
 */
export async function registerEventHandlers(handlers?: EventHandlers): Promise<void> {
  const eventBus = getEventBus();
  const eventHandlers = handlers ?? new EventHandlers();

  // Subscribe to inbound events
  await eventBus.subscribe<RequestCreatedEvent>(
    EVENT_CHANNELS.REQUEST_CREATED,
    (event) => eventHandlers.handleRequestCreated(event)
  );

  await eventBus.subscribe<AgentAvailabilityChangedEvent>(
    EVENT_CHANNELS.AGENT_AVAILABILITY_CHANGED,
    (event) => eventHandlers.handleAgentAvailabilityChanged(event)
  );

  await eventBus.subscribe<AgentRespondedToMatchEvent>(
    EVENT_CHANNELS.AGENT_RESPONDED_TO_MATCH,
    (event) => eventHandlers.handleAgentRespondedToMatch(event)
  );

  await eventBus.subscribe<AdminOverrideRequestedEvent>(
    EVENT_CHANNELS.ADMIN_OVERRIDE_REQUESTED,
    (event) => eventHandlers.handleAdminOverrideRequested(event)
  );

  await eventBus.subscribe<MatchingTimeoutExpiredEvent>(
    EVENT_CHANNELS.MATCHING_TIMEOUT_EXPIRED,
    (event) => eventHandlers.handleMatchingTimeoutExpired(event)
  );

  logger.info('All event handlers registered');
}

/**
 * Create event handlers instance
 */
export function createEventHandlers(matchingEngine?: MatchingEngine): EventHandlers {
  return new EventHandlers(matchingEngine);
}
