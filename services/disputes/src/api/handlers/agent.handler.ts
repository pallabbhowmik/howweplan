/**
 * Agent Handlers
 * 
 * HTTP request handlers for agent-related endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDispute, getDisputesByAgent } from '../../services/dispute.service.js';
import { submitAgentResponse, getAgentResponseForDispute } from '../../services/agent-response.service.js';
import { submitEvidence, getEvidenceForDispute } from '../../services/evidence.service.js';
import {
  validateAgentResponse,
  validateEvidenceSubmit,
  validateDisputeListQuery,
} from '../../validators/index.js';
import { logger } from '../../audit/logger.js';
import type { EventContext } from '../../events/publisher.js';
import type { DisputeAgentDTO, AgentResponseViewDTO, EvidenceDTO, PaginatedDTO } from '../../types/dto.js';

/**
 * Create event context from request.
 */
function createEventContext(req: Request): EventContext {
  return {
    correlationId: (req.headers['x-correlation-id'] as string) || uuidv4(),
    causationId: req.headers['x-causation-id'] as string,
    userId: (req as any).user?.id,
    sessionId: req.headers['x-session-id'] as string,
    traceId: req.headers['x-trace-id'] as string,
    spanId: req.headers['x-span-id'] as string,
  };
}

/**
 * Map dispute to agent view DTO.
 */
function toAgentDTO(dispute: any, hasResponse: boolean, travelerFirstName: string): DisputeAgentDTO {
  return {
    id: dispute.id,
    bookingId: dispute.bookingId,
    category: dispute.category,
    state: dispute.state,
    title: dispute.title,
    description: dispute.description,
    createdAt: dispute.createdAt.toISOString(),
    responseDeadline: dispute.agentResponseDeadline?.toISOString() ?? null,
    travelerFirstName,
    hasSubmittedResponse: hasResponse,
  };
}

/**
 * Map evidence to DTO.
 */
function toEvidenceDTO(evidence: any): EvidenceDTO {
  return {
    id: evidence.id,
    disputeId: evidence.disputeId,
    type: evidence.type,
    source: evidence.source,
    fileName: evidence.fileName,
    fileUrl: evidence.fileUrl,
    fileSizeBytes: evidence.fileSizeBytes,
    mimeType: evidence.mimeType,
    description: evidence.description,
    createdAt: evidence.createdAt.toISOString(),
    isVerified: evidence.isVerified,
  };
}

/**
 * List disputes for the authenticated agent.
 * GET /api/v1/agent/disputes
 */
export async function handleListAgentDisputes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const agentId = (req as any).user?.id;
    const isAgent = (req as any).user?.role === 'agent';

    if (!agentId || !isAgent) {
      res.status(403).json({ error: 'Agent access required' });
      return;
    }

    const queryValidation = validateDisputeListQuery(req.query);
    if (!queryValidation.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: queryValidation.errors });
      return;
    }

    const queryData = queryValidation.data;
    const page = queryData.page ?? 1;
    const pageSize = queryData.pageSize ?? 20;
    const { state, sortBy, sortOrder } = queryData;

    let disputes = await getDisputesByAgent(agentId);

    // Filter out disputes that don't need agent attention
    disputes = disputes.filter((d) =>
      ['evidence_submitted', 'agent_responded', 'under_admin_review', 'escalated'].includes(d.state)
    );

    if (state) {
      disputes = disputes.filter((d) => d.state === state);
    }

    // Sort
    disputes.sort((a, b) => {
      const aVal = a[sortBy as keyof typeof a];
      const bVal = b[sortBy as keyof typeof b];
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }
      return 0;
    });

    // Check for responses
    const disputesWithResponseStatus = await Promise.all(
      disputes.map(async (d) => {
        const response = await getAgentResponseForDispute(d.id);
        return {
          dispute: d,
          hasResponse: !!response,
          // In production, fetch traveler first name from user service
          travelerFirstName: 'Traveler',
        };
      })
    );

    // Paginate
    const totalItems = disputesWithResponseStatus.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginated = disputesWithResponseStatus.slice(startIndex, startIndex + pageSize);

    const response: PaginatedDTO<DisputeAgentDTO> = {
      data: paginated.map((d) => toAgentDTO(d.dispute, d.hasResponse, d.travelerFirstName)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Get a dispute by ID for agent.
 * GET /api/v1/agent/disputes/:disputeId
 */
export async function handleGetAgentDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { disputeId } = req.params;
    const agentId = (req as any).user?.id;
    const isAgent = (req as any).user?.role === 'agent';

    if (!agentId || !isAgent) {
      res.status(403).json({ error: 'Agent access required' });
      return;
    }

    const dispute = await getDispute(disputeId!);

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    if (dispute.agentId !== agentId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const response = await getAgentResponseForDispute(disputeId!);
    res.json(toAgentDTO(dispute, !!response, 'Traveler'));
  } catch (error) {
    next(error);
  }
}

/**
 * Submit agent response to a dispute.
 * POST /api/v1/agent/disputes/:disputeId/response
 */
export async function handleSubmitAgentResponse(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const context = createEventContext(req);
    const { disputeId } = req.params;
    const agentId = (req as any).user?.id;
    const isAgent = (req as any).user?.role === 'agent';

    if (!agentId || !isAgent) {
      res.status(403).json({ error: 'Agent access required' });
      return;
    }

    const dispute = await getDispute(disputeId!);

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    if (dispute.agentId !== agentId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const validation = validateAgentResponse({ ...req.body, disputeId });
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const responseData = {
      ...validation.data,
      evidenceIds: validation.data.evidenceIds ?? [],
    };
    const response = await submitAgentResponse(responseData, agentId, context);

    const responseDTO: AgentResponseViewDTO = {
      id: response.id,
      disputeId: response.disputeId,
      response: response.response,
      acceptsResponsibility: response.acceptsResponsibility,
      proposedResolution: response.proposedResolution,
      createdAt: response.createdAt.toISOString(),
      evidence: [],
    };

    logger.info({
      msg: 'Agent response submitted via API',
      disputeId,
      agentId,
      correlationId: context.correlationId,
    });

    res.status(201).json(responseDTO);
  } catch (error) {
    next(error);
  }
}

/**
 * Submit evidence as agent.
 * POST /api/v1/agent/disputes/:disputeId/evidence
 */
export async function handleAgentSubmitEvidence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const context = createEventContext(req);
    const { disputeId } = req.params;
    const agentId = (req as any).user?.id;
    const isAgent = (req as any).user?.role === 'agent';

    if (!agentId || !isAgent) {
      res.status(403).json({ error: 'Agent access required' });
      return;
    }

    const dispute = await getDispute(disputeId!);

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    if (dispute.agentId !== agentId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const validation = validateEvidenceSubmit({ ...req.body, disputeId });
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const evidence = await submitEvidence(validation.data, agentId, 'agent', context);

    res.status(201).json(toEvidenceDTO(evidence));
  } catch (error) {
    next(error);
  }
}

/**
 * Get evidence for a dispute as agent.
 * GET /api/v1/agent/disputes/:disputeId/evidence
 */
export async function handleGetAgentEvidence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { disputeId } = req.params;
    const agentId = (req as any).user?.id;
    const isAgent = (req as any).user?.role === 'agent';

    if (!agentId || !isAgent) {
      res.status(403).json({ error: 'Agent access required' });
      return;
    }

    const dispute = await getDispute(disputeId!);

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    if (dispute.agentId !== agentId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const evidence = await getEvidenceForDispute(disputeId!);
    res.json(evidence.map(toEvidenceDTO));
  } catch (error) {
    next(error);
  }
}
