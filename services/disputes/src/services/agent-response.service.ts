/**
 * Agent Response Service
 * 
 * Handles agent responses to disputes.
 */

import { v4 as uuidv4 } from 'uuid';
import { config } from '../env.js';
import { AgentResponse } from '../types/domain.js';
import { AgentResponseDTO } from '../types/dto.js';
import { getDispute, transitionDisputeState } from './dispute.service.js';
import {
  eventPublisher,
  createAgentRespondedEvent,
  type EventContext,
} from '../events/publisher.js';
import { createAuditLog, logger } from '../audit/logger.js';

/**
 * In-memory agent response store for development.
 */
const agentResponseStore = new Map<string, AgentResponse>();

/**
 * Get agent response for a dispute.
 */
export async function getAgentResponseForDispute(
  disputeId: string
): Promise<AgentResponse | null> {
  return (
    Array.from(agentResponseStore.values()).find(
      (r) => r.disputeId === disputeId
    ) ?? null
  );
}

/**
 * Submit agent response to a dispute.
 */
export async function submitAgentResponse(
  dto: AgentResponseDTO,
  agentId: string,
  context: EventContext
): Promise<AgentResponse> {
  const dispute = await getDispute(dto.disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${dto.disputeId}`);
  }

  // Verify agent is authorized
  if (dispute.agentId !== agentId) {
    throw new Error('Only the assigned agent can respond to this dispute');
  }

  // Check if already responded
  const existingResponse = await getAgentResponseForDispute(dto.disputeId);
  if (existingResponse) {
    throw new Error('Agent has already responded to this dispute');
  }

  // Check if within deadline
  if (dispute.agentResponseDeadline) {
    const now = new Date();
    if (now > dispute.agentResponseDeadline) {
      logger.warn({
        msg: 'Agent response submitted after deadline',
        disputeId: dto.disputeId,
        agentId,
        deadline: dispute.agentResponseDeadline,
      });
    }
  }

  // Check if state allows response
  if (dispute.state !== 'evidence_submitted') {
    throw new Error(
      `Cannot respond in state '${dispute.state}'. Agent can only respond when evidence has been submitted.`
    );
  }

  const responseId = uuidv4();

  const response: AgentResponse = {
    id: responseId,
    disputeId: dto.disputeId,
    agentId,
    response: dto.response,
    acceptsResponsibility: dto.acceptsResponsibility,
    proposedResolution: dto.proposedResolution ?? null,
    evidenceIds: dto.evidenceIds ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  agentResponseStore.set(responseId, response);

  // Transition dispute state
  await transitionDisputeState(
    dto.disputeId,
    'agent_respond',
    'agent',
    agentId,
    'Agent submitted response',
    context
  );

  // Create audit log
  await createAuditLog({
    entityType: 'dispute',
    entityId: dto.disputeId,
    action: 'agent_responded',
    actorType: 'agent',
    actorId: agentId,
    newState: {
      responseId,
      acceptsResponsibility: dto.acceptsResponsibility,
      hasProposedResolution: !!dto.proposedResolution,
    },
  });

  // Emit event
  await eventPublisher.publish(
    createAgentRespondedEvent(context, {
      disputeId: dto.disputeId,
      agentId,
      acceptsResponsibility: dto.acceptsResponsibility,
      hasProposedResolution: !!dto.proposedResolution,
    })
  );

  logger.info({
    msg: 'Agent response submitted',
    responseId,
    disputeId: dto.disputeId,
    agentId,
    acceptsResponsibility: dto.acceptsResponsibility,
  });

  return response;
}

/**
 * Get agent response by ID.
 */
export async function getAgentResponse(
  responseId: string
): Promise<AgentResponse | null> {
  return agentResponseStore.get(responseId) ?? null;
}

/**
 * Check if agent response is overdue.
 */
export async function isAgentResponseOverdue(
  disputeId: string
): Promise<boolean> {
  const dispute = await getDispute(disputeId);
  if (!dispute) return false;

  if (dispute.state !== 'evidence_submitted') return false;

  if (!dispute.agentResponseDeadline) return false;

  return new Date() > dispute.agentResponseDeadline;
}

/**
 * Get disputes with pending agent responses nearing deadline.
 */
export async function getDisputesNearingAgentDeadline(
  hoursThreshold: number = 24
): Promise<
  Array<{
    disputeId: string;
    agentId: string;
    deadline: Date;
    hoursRemaining: number;
  }>
> {
  const disputes = await import('./dispute.service.js').then((m) =>
    m.getAdminQueue({ state: 'evidence_submitted' })
  );

  const result: Array<{
    disputeId: string;
    agentId: string;
    deadline: Date;
    hoursRemaining: number;
  }> = [];

  const now = new Date();

  for (const dispute of disputes) {
    if (!dispute.agentResponseDeadline) continue;

    const hoursRemaining =
      (dispute.agentResponseDeadline.getTime() - now.getTime()) /
      (1000 * 60 * 60);

    if (hoursRemaining > 0 && hoursRemaining <= hoursThreshold) {
      result.push({
        disputeId: dispute.id,
        agentId: dispute.agentId,
        deadline: dispute.agentResponseDeadline,
        hoursRemaining,
      });
    }
  }

  return result;
}
