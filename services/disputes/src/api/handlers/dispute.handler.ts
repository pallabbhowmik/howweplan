/**
 * Dispute Handlers
 * 
 * HTTP request handlers for dispute-related endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createDispute,
  getDispute,
  getDisputesByTraveler,
  withdrawDispute,
  transitionDisputeState,
} from '../../services/dispute.service.js';
import {
  submitEvidence,
  getEvidenceForDispute,
} from '../../services/evidence.service.js';
import {
  validateDisputeCreate,
  validateEvidenceSubmit,
  validateDisputeWithdraw,
  validateDisputeListQuery,
  validateBookingDetails,
} from '../../validators/index.js';
import { config } from '../../env.js';
import { logger } from '../../audit/logger.js';
import type { EventContext } from '../../events/publisher.js';
import type { DisputePublicDTO, EvidenceDTO, PaginatedDTO } from '../../types/dto.js';

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
 * Map dispute to public DTO.
 */
function toPublicDTO(dispute: any): DisputePublicDTO {
  return {
    id: dispute.id,
    bookingId: dispute.bookingId,
    category: dispute.category,
    state: dispute.state,
    title: dispute.title,
    description: dispute.description,
    createdAt: dispute.createdAt.toISOString(),
    updatedAt: dispute.updatedAt.toISOString(),
    agentResponseDeadline: dispute.agentResponseDeadline?.toISOString() ?? null,
    hasAgentResponse: dispute.state !== 'pending_evidence' && dispute.state !== 'evidence_submitted',
    resolution: dispute.resolution
      ? {
          type: dispute.resolution.type,
          refundAmount: dispute.resolution.refundAmount,
          currency: dispute.resolution.currency,
          reason: dispute.resolution.reason,
          resolvedAt: dispute.resolution.resolvedAt.toISOString(),
        }
      : null,
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
 * Create a new dispute.
 * POST /api/v1/disputes
 */
export async function handleCreateDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const context = createEventContext(req);
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Validate input
    const validation = validateDisputeCreate(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    // Fetch booking details from booking service
    // In production, this would call the booking service
    const bookingDetailsResponse = await fetch(
      `${config.services.booking}/api/v1/bookings/${validation.data.bookingId}`,
      {
        headers: {
          'Authorization': req.headers.authorization as string,
          'X-Correlation-Id': context.correlationId,
        },
      }
    );

    if (!bookingDetailsResponse.ok) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const bookingData = await bookingDetailsResponse.json();
    const bookingValidation = validateBookingDetails(bookingData);

    if (!bookingValidation.success) {
      res.status(400).json({ error: 'Invalid booking data', details: bookingValidation.errors });
      return;
    }

    // Verify user owns the booking
    if (bookingValidation.data.travelerId !== userId) {
      res.status(403).json({ error: 'You can only file disputes for your own bookings' });
      return;
    }

    const dispute = await createDispute(validation.data, bookingValidation.data, context);

    logger.info({
      msg: 'Dispute created via API',
      disputeId: dispute.id,
      userId,
      correlationId: context.correlationId,
    });

    res.status(201).json(toPublicDTO(dispute));
  } catch (error) {
    next(error);
  }
}

/**
 * Get a dispute by ID.
 * GET /api/v1/disputes/:disputeId
 */
export async function handleGetDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { disputeId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const dispute = await getDispute(disputeId!);

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    // Only dispute creator can view their dispute
    if (dispute.travelerId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(toPublicDTO(dispute));
  } catch (error) {
    next(error);
  }
}

/**
 * List disputes for the authenticated user.
 * GET /api/v1/disputes
 */
export async function handleListDisputes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
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
    const { state, category, sortBy, sortOrder } = queryData;

    let disputes = await getDisputesByTraveler(userId);

    // Apply filters
    if (state) {
      disputes = disputes.filter((d) => d.state === state);
    }
    if (category) {
      disputes = disputes.filter((d) => d.category === category);
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

    // Paginate
    const totalItems = disputes.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedDisputes = disputes.slice(startIndex, startIndex + pageSize);

    const response: PaginatedDTO<DisputePublicDTO> = {
      data: paginatedDisputes.map(toPublicDTO),
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
 * Submit evidence for a dispute.
 * POST /api/v1/disputes/:disputeId/evidence
 */
export async function handleSubmitEvidence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const context = createEventContext(req);
    const { disputeId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const dispute = await getDispute(disputeId!);
    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    if (dispute.travelerId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const validation = validateEvidenceSubmit({ ...req.body, disputeId });
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const evidence = await submitEvidence(validation.data, userId, 'traveler', context);

    // If this is first evidence and state is pending_evidence, transition
    if (dispute.state === 'pending_evidence') {
      await transitionDisputeState(
        disputeId!,
        'submit_evidence',
        'traveler',
        userId,
        'Initial evidence submitted',
        context
      );
    }

    res.status(201).json(toEvidenceDTO(evidence));
  } catch (error) {
    next(error);
  }
}

/**
 * Get evidence for a dispute.
 * GET /api/v1/disputes/:disputeId/evidence
 */
export async function handleGetEvidence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { disputeId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const dispute = await getDispute(disputeId!);
    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    if (dispute.travelerId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const evidence = await getEvidenceForDispute(disputeId!);
    res.json(evidence.map(toEvidenceDTO));
  } catch (error) {
    next(error);
  }
}

/**
 * Withdraw a dispute.
 * POST /api/v1/disputes/:disputeId/withdraw
 */
export async function handleWithdrawDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const context = createEventContext(req);
    const { disputeId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const dispute = await getDispute(disputeId!);
    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    if (dispute.travelerId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const validation = validateDisputeWithdraw({ ...req.body, disputeId });
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const updatedDispute = await withdrawDispute(
      disputeId!,
      userId,
      validation.data.reason,
      context
    );

    res.json(toPublicDTO(updatedDispute));
  } catch (error) {
    next(error);
  }
}
