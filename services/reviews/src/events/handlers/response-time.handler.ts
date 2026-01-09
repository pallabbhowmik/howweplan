/**
 * Response Time Event Handlers
 * 
 * Handles events for tracking agent response times:
 * - Agent matched to request → Record request received
 * - Itinerary submitted → Record response
 * - First message sent → Record response
 * - Request expired/declined → Record non-response
 */

import { responseTimeService } from '../../services';

// =============================================================================
// EVENT TYPES
// =============================================================================

interface AgentMatchedEvent {
  type: 'AGENT_MATCHED';
  payload: {
    agentId: string;
    requestId: string;
    matchedAt: string;
  };
}

interface ItinerarySubmittedEvent {
  type: 'ITINERARY_SUBMITTED' | 'itinerary.submitted';
  payload: {
    agentId: string;
    requestId: string;
    itineraryId: string;
    submittedAt: string;
  };
}

interface MessageSentEvent {
  type: 'MESSAGE_SENT';
  payload: {
    senderId: string;
    senderType: 'AGENT' | 'TRAVELER' | 'SYSTEM';
    requestId: string;
    conversationId: string;
    isFirstMessage: boolean;
    sentAt: string;
  };
}

interface RequestDeclinedEvent {
  type: 'REQUEST_DECLINED';
  payload: {
    agentId: string;
    requestId: string;
    reason?: string;
    declinedAt: string;
  };
}

interface RequestExpiredEvent {
  type: 'REQUEST_EXPIRED';
  payload: {
    agentId: string;
    requestId: string;
    expiredAt: string;
  };
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Handle when an agent is matched to a travel request.
 * Records the request received time for response tracking.
 */
export async function handleAgentMatched(event: AgentMatchedEvent): Promise<void> {
  const { payload } = event;

  console.log(`[ResponseTime] Agent ${payload.agentId} matched to request ${payload.requestId}`);

  try {
    await responseTimeService.recordRequestReceived({
      agentId: payload.agentId,
      requestId: payload.requestId,
      receivedAt: new Date(payload.matchedAt),
    });
  } catch (error) {
    console.error('[ResponseTime] Failed to record request received:', error);
    // Don't throw - this is not critical enough to fail the event
  }
}

/**
 * Handle when an agent submits an itinerary/proposal.
 * Records this as a response to the request.
 */
export async function handleItinerarySubmitted(event: ItinerarySubmittedEvent): Promise<void> {
  const { payload } = event;

  console.log(`[ResponseTime] Agent ${payload.agentId} submitted itinerary for request ${payload.requestId}`);

  try {
    await responseTimeService.recordResponse({
      agentId: payload.agentId,
      requestId: payload.requestId,
      responseType: 'PROPOSAL_SUBMITTED',
      respondedAt: new Date(payload.submittedAt),
    });
  } catch (error) {
    console.error('[ResponseTime] Failed to record itinerary submission:', error);
  }
}

/**
 * Handle when an agent sends the first message in a conversation.
 * Only counts if it's the agent's first message for this request.
 */
export async function handleMessageSent(event: MessageSentEvent): Promise<void> {
  const { payload } = event;

  // Only track agent messages
  if (payload.senderType !== 'AGENT') {
    return;
  }

  // Only track first messages
  if (!payload.isFirstMessage) {
    return;
  }

  console.log(`[ResponseTime] Agent ${payload.senderId} sent first message for request ${payload.requestId}`);

  try {
    await responseTimeService.recordResponse({
      agentId: payload.senderId,
      requestId: payload.requestId,
      responseType: 'MESSAGE_SENT',
      respondedAt: new Date(payload.sentAt),
    });
  } catch (error) {
    console.error('[ResponseTime] Failed to record first message:', error);
  }
}

/**
 * Handle when an agent explicitly declines a request.
 */
export async function handleRequestDeclined(event: RequestDeclinedEvent): Promise<void> {
  const { payload } = event;

  console.log(`[ResponseTime] Agent ${payload.agentId} declined request ${payload.requestId}`);

  try {
    await responseTimeService.recordResponse({
      agentId: payload.agentId,
      requestId: payload.requestId,
      responseType: 'DECLINED',
      respondedAt: new Date(payload.declinedAt),
    });
  } catch (error) {
    console.error('[ResponseTime] Failed to record decline:', error);
  }
}

/**
 * Handle when a request expires without agent response.
 * Called by a scheduled job checking for expired requests.
 */
export async function handleRequestExpired(event: RequestExpiredEvent): Promise<void> {
  const { payload } = event;

  console.log(`[ResponseTime] Request ${payload.requestId} expired for agent ${payload.agentId}`);

  try {
    await responseTimeService.markRequestExpired(payload.agentId, payload.requestId);
  } catch (error) {
    console.error('[ResponseTime] Failed to record expiration:', error);
  }
}

// =============================================================================
// BATCH HANDLERS (for scheduled jobs)
// =============================================================================

/**
 * Process expired requests in batch.
 * Should be called by a scheduled job (e.g., every hour).
 */
export async function processExpiredRequests(
  expiredMatches: Array<{ agentId: string; requestId: string }>
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (const match of expiredMatches) {
    try {
      await responseTimeService.markRequestExpired(match.agentId, match.requestId);
      processed++;
    } catch (error) {
      console.error(`[ResponseTime] Failed to process expired match:`, match, error);
      failed++;
    }
  }

  console.log(`[ResponseTime] Processed ${processed} expired requests, ${failed} failed`);
  return { processed, failed };
}

/**
 * Recalculate metrics for a batch of agents.
 * Useful for scheduled recalculation jobs.
 */
export async function recalculateMetricsBatch(
  agentIds: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const agentId of agentIds) {
    try {
      await responseTimeService.recalculateMetrics(agentId);
      success++;
    } catch (error) {
      console.error(`[ResponseTime] Failed to recalculate metrics for agent ${agentId}:`, error);
      failed++;
    }
  }

  console.log(`[ResponseTime] Recalculated metrics for ${success} agents, ${failed} failed`);
  return { success, failed };
}
