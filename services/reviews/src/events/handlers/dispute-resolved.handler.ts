/**
 * Dispute Resolved Event Handler
 * 
 * Handles the DisputeResolved event from the disputes service.
 * Updates agent reliability scores based on dispute outcomes.
 */

import { DisputeResolvedEvent } from '../contracts';
import { agentScoreRepository } from '../../repositories';
import { AuditEventType, AuditActorType, createAuditEvent } from '../../models';
import { auditRepository } from '../../repositories';

/**
 * Handle DisputeResolved event
 * 
 * Dispute outcomes affect agent reliability scores:
 * - TRAVELER_FAVOR: Negative impact on agent score
 * - AGENT_FAVOR: No negative impact
 * - SPLIT: Minor negative impact
 * - DISMISSED: No impact
 */
export async function handleDisputeResolved(event: DisputeResolvedEvent): Promise<void> {
  const { payload } = event;

  console.log(`[DisputeResolvedHandler] Processing dispute ${payload.disputeId}`);

  // Only process disputes that impact agent scores
  if (payload.resolution === 'DISMISSED') {
    console.log(`[DisputeResolvedHandler] Dispute ${payload.disputeId} dismissed - no score impact`);
    return;
  }

  // Get current agent score
  const currentScore = await agentScoreRepository.findByAgentId(payload.agentId);

  if (!currentScore) {
    console.warn(`[DisputeResolvedHandler] No score found for agent ${payload.agentId}`);
    return;
  }

  // Calculate dispute count increment
  let disputeIncrement = 0;
  switch (payload.resolution) {
    case 'TRAVELER_FAVOR':
      disputeIncrement = 1;  // Full dispute count
      break;
    case 'SPLIT':
      disputeIncrement = 0.5;  // Partial impact
      break;
    case 'AGENT_FAVOR':
      disputeIncrement = 0;  // No negative impact
      break;
  }

  if (disputeIncrement === 0) {
    console.log(`[DisputeResolvedHandler] Dispute resolved in agent's favor - no score impact`);
    return;
  }

  // Update dispute count in breakdown
  const updatedBreakdown = {
    ...currentScore.breakdown,
    disputeCount: currentScore.breakdown.disputeCount + disputeIncrement,
  };

  // Recalculate dispute rate
  const totalBookings = currentScore.totalBookings;
  if (totalBookings > 0) {
    updatedBreakdown.disputeRate = updatedBreakdown.disputeCount / totalBookings;
  }

  const previousState = {
    disputeCount: currentScore.breakdown.disputeCount,
    disputeRate: currentScore.breakdown.disputeRate,
  };

  // Update score
  await agentScoreRepository.update(payload.agentId, {
    breakdown: updatedBreakdown,
    calculatedAt: new Date(),
  });

  // Record audit event
  await auditRepository.record(createAuditEvent({
    eventType: AuditEventType.AGENT_SCORE_CALCULATED,
    actorType: AuditActorType.SYSTEM,
    targetType: 'AGENT_SCORE',
    targetId: currentScore.id,
    agentId: payload.agentId,
    bookingId: payload.bookingId,
    previousState,
    newState: {
      disputeCount: updatedBreakdown.disputeCount,
      disputeRate: updatedBreakdown.disputeRate,
    },
    metadata: {
      triggeredBy: 'DisputeResolved',
      disputeId: payload.disputeId,
      resolution: payload.resolution,
    },
  }));

  console.log(
    `[DisputeResolvedHandler] Updated agent ${payload.agentId} dispute count:`,
    { previous: previousState.disputeCount, new: updatedBreakdown.disputeCount }
  );
}

/**
 * Validate that an event is a valid DisputeResolved event
 */
export function isDisputeResolvedEvent(event: unknown): event is DisputeResolvedEvent {
  if (!event || typeof event !== 'object') return false;
  
  const e = event as Record<string, unknown>;
  return (
    e.type === 'dispute.resolved' &&
    e.version === '1.0' &&
    typeof e.timestamp === 'string' &&
    typeof e.payload === 'object' &&
    e.payload !== null
  );
}
