/**
 * Event Publisher
 * 
 * This module handles publishing events to the event bus.
 * All state changes MUST emit an audit event per business rules.
 * Events are the ONLY way modules communicate per architecture rules.
 */

import { v4 as uuidv4 } from 'uuid';
import { config } from '../env.js';
import { logger } from '../audit/logger.js';
import {
  BaseEvent,
  EventMetadata,
  DisputeServiceOutgoingEvent,
  DisputeEventType,
} from '../types/events.js';

/**
 * Event publishing result.
 */
export interface PublishResult {
  success: boolean;
  eventId: string;
  error?: string;
}

/**
 * Context for event creation.
 */
export interface EventContext {
  correlationId: string;
  causationId?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
}

/**
 * Creates the base event structure with all required fields.
 */
function createBaseEvent(
  eventType: DisputeEventType,
  context: EventContext
): Omit<BaseEvent, 'eventType'> & { eventType: DisputeEventType } {
  return {
    eventId: uuidv4(),
    eventType,
    eventVersion: '1.0.0',
    occurredAt: new Date().toISOString(),
    source: config.service.name,
    correlationId: context.correlationId,
    causationId: context.causationId ?? null,
  };
}

/**
 * Creates event metadata for tracing.
 */
function createMetadata(context: EventContext): EventMetadata {
  return {
    traceId: context.traceId ?? uuidv4(),
    spanId: context.spanId ?? uuidv4(),
    userId: context.userId ?? null,
    sessionId: context.sessionId ?? null,
  };
}

/**
 * Event publisher class that handles publishing to the event bus.
 */
class EventPublisher {
  private readonly eventBusUrl: string;
  private readonly serviceName: string;

  constructor() {
    this.eventBusUrl = config.services.eventBus;
    this.serviceName = config.service.name;
  }

  /**
   * Publish an event to the event bus.
   */
  async publish<T extends DisputeServiceOutgoingEvent>(
    event: T
  ): Promise<PublishResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.eventBusUrl}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': this.serviceName,
          'X-Event-Type': event.eventType,
          'X-Correlation-Id': event.correlationId,
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Event bus returned ${response.status}: ${errorBody}`);
      }

      const duration = Date.now() - startTime;

      logger.info({
        msg: 'Event published successfully',
        eventId: event.eventId,
        eventType: event.eventType,
        correlationId: event.correlationId,
        durationMs: duration,
      });

      return {
        success: true,
        eventId: event.eventId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({
        msg: 'Failed to publish event',
        eventId: event.eventId,
        eventType: event.eventType,
        correlationId: event.correlationId,
        error: errorMessage,
        durationMs: duration,
      });

      return {
        success: false,
        eventId: event.eventId,
        error: errorMessage,
      };
    }
  }

  /**
   * Publish multiple events in order.
   * If any event fails, subsequent events are still attempted.
   */
  async publishBatch(
    events: DisputeServiceOutgoingEvent[]
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const event of events) {
      const result = await this.publish(event);
      results.push(result);
    }

    return results;
  }
}

/**
 * Singleton event publisher instance.
 */
export const eventPublisher = new EventPublisher();

// =============================================================================
// EVENT FACTORY FUNCTIONS
// =============================================================================

import {
  DisputeCreatedEvent,
  EvidenceSubmittedEvent,
  AgentRespondedEvent,
  DisputeStateChangedEvent,
  DisputeAssignedEvent,
  DisputeEscalatedEvent,
  DisputeResolvedEvent,
  RefundApprovedEvent,
  DisputeWithdrawnEvent,
  DisputeExpiredEvent,
  AgentResponseDeadlineWarningEvent,
} from '../types/events.js';
import { DisputeCategory, DisputeState, ResolutionType } from '../types/domain.js';

/**
 * Create a DisputeCreated event.
 */
export function createDisputeCreatedEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    bookingId: string;
    travelerId: string;
    agentId: string;
    category: DisputeCategory;
    title: string;
    isSubjectiveComplaint: boolean;
    bookingAmount: number;
    currency: string;
    agentResponseDeadline: Date;
  }
): DisputeCreatedEvent {
  return {
    ...createBaseEvent('dispute.created', context),
    eventType: 'dispute.created',
    payload: {
      ...payload,
      agentResponseDeadline: payload.agentResponseDeadline.toISOString(),
    },
    metadata: createMetadata(context),
  };
}

/**
 * Create an EvidenceSubmitted event.
 */
export function createEvidenceSubmittedEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    evidenceId: string;
    submittedBy: string;
    submitterType: 'traveler' | 'agent';
    evidenceType: string;
    totalEvidenceCount: number;
  }
): EvidenceSubmittedEvent {
  return {
    ...createBaseEvent('dispute.evidence_submitted', context),
    eventType: 'dispute.evidence_submitted',
    payload,
    metadata: createMetadata(context),
  };
}

/**
 * Create an AgentResponded event.
 */
export function createAgentRespondedEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    agentId: string;
    acceptsResponsibility: boolean;
    hasProposedResolution: boolean;
  }
): AgentRespondedEvent {
  return {
    ...createBaseEvent('dispute.agent_responded', context),
    eventType: 'dispute.agent_responded',
    payload: {
      ...payload,
      respondedAt: new Date().toISOString(),
    },
    metadata: createMetadata(context),
  };
}

/**
 * Create a DisputeStateChanged event.
 * This is the primary audit event for state transitions.
 */
export function createDisputeStateChangedEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    previousState: DisputeState;
    newState: DisputeState;
    changedBy: string;
    changedByType: 'traveler' | 'agent' | 'admin' | 'system';
    reason: string;
  }
): DisputeStateChangedEvent {
  return {
    ...createBaseEvent('dispute.state_changed', context),
    eventType: 'dispute.state_changed',
    payload,
    metadata: createMetadata(context),
  };
}

/**
 * Create a DisputeAssigned event.
 */
export function createDisputeAssignedEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    adminId: string;
    previousAdminId: string | null;
    reason: string;
  }
): DisputeAssignedEvent {
  return {
    ...createBaseEvent('dispute.assigned', context),
    eventType: 'dispute.assigned',
    payload: {
      ...payload,
      assignedAt: new Date().toISOString(),
    },
    metadata: createMetadata(context),
  };
}

/**
 * Create a DisputeEscalated event.
 */
export function createDisputeEscalatedEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    escalatedBy: string;
    priority: 'high' | 'critical';
    reason: string;
  }
): DisputeEscalatedEvent {
  return {
    ...createBaseEvent('dispute.escalated', context),
    eventType: 'dispute.escalated',
    payload: {
      ...payload,
      escalatedAt: new Date().toISOString(),
    },
    metadata: createMetadata(context),
  };
}

/**
 * Create a DisputeResolved event.
 */
export function createDisputeResolvedEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    bookingId: string;
    travelerId: string;
    agentId: string;
    resolution: ResolutionType;
    refundAmount: number | null;
    currency: string;
    adminId: string;
    reason: string;
  }
): DisputeResolvedEvent {
  return {
    ...createBaseEvent('dispute.resolved', context),
    eventType: 'dispute.resolved',
    payload: {
      ...payload,
      resolvedAt: new Date().toISOString(),
    },
    metadata: createMetadata(context),
  };
}

/**
 * Create a RefundApproved event.
 */
export function createRefundApprovedEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    bookingId: string;
    travelerId: string;
    agentId: string;
    refundAmount: number;
    currency: string;
    refundType: 'full' | 'partial';
    approvedBy: string;
    approvalReason: string;
  }
): RefundApprovedEvent {
  return {
    ...createBaseEvent('dispute.refund_approved', context),
    eventType: 'dispute.refund_approved',
    payload,
    metadata: createMetadata(context),
  };
}

/**
 * Create a DisputeWithdrawn event.
 */
export function createDisputeWithdrawnEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    travelerId: string;
    reason: string;
  }
): DisputeWithdrawnEvent {
  return {
    ...createBaseEvent('dispute.withdrawn', context),
    eventType: 'dispute.withdrawn',
    payload: {
      ...payload,
      withdrawnAt: new Date().toISOString(),
    },
    metadata: createMetadata(context),
  };
}

/**
 * Create a DisputeExpired event.
 */
export function createDisputeExpiredEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    lastActivityAt: Date;
    expirationReason: 'no_evidence' | 'no_agent_response' | 'inactivity';
  }
): DisputeExpiredEvent {
  return {
    ...createBaseEvent('dispute.expired', context),
    eventType: 'dispute.expired',
    payload: {
      disputeId: payload.disputeId,
      lastActivityAt: payload.lastActivityAt.toISOString(),
      expiredAt: new Date().toISOString(),
      expirationReason: payload.expirationReason,
    },
    metadata: createMetadata(context),
  };
}

/**
 * Create an AgentResponseDeadlineWarning event.
 */
export function createAgentDeadlineWarningEvent(
  context: EventContext,
  payload: {
    disputeId: string;
    agentId: string;
    deadline: Date;
    hoursRemaining: number;
  }
): AgentResponseDeadlineWarningEvent {
  return {
    ...createBaseEvent('dispute.agent_deadline_warning', context),
    eventType: 'dispute.agent_deadline_warning',
    payload: {
      disputeId: payload.disputeId,
      agentId: payload.agentId,
      deadline: payload.deadline.toISOString(),
      hoursRemaining: payload.hoursRemaining,
    },
    metadata: createMetadata(context),
  };
}
