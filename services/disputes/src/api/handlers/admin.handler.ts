/**
 * Admin Handlers
 * 
 * HTTP request handlers for admin arbitration endpoints.
 * All admin actions require a reason and are audit-logged per business rules.
 * Admin tooling is first-class per architecture rules.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getDispute,
  getAdminQueue,
  getDisputeStatistics,
  assignToAdmin,
} from '../../services/dispute.service.js';
import {
  getEvidenceForDispute,
  getEvidenceStats,
  verifyEvidence,
} from '../../services/evidence.service.js';
import { getAgentResponseForDispute } from '../../services/agent-response.service.js';
import {
  startAdminReview,
  resolveDispute,
  escalateDispute,
  addNote,
  getNotesForDispute,
  getArbitrationHistory,
  getResolution,
} from '../../services/arbitration.service.js';
import {
  validateAdminDecision,
  validateAdminEscalate,
  validateAdminNote,
  validateAdminQueueQuery,
} from '../../validators/index.js';
import { logger, getAuditLogs } from '../../audit/logger.js';
import type { EventContext } from '../../events/publisher.js';
import type {
  DisputeAdminDTO,
  EvidenceDTO,
  ArbitrationEntryDTO,
  PaginatedDTO,
  DisputeListItemDTO,
} from '../../types/dto.js';

// State to status mapping for frontend compatibility
const stateToStatusMap: Record<string, string> = {
  pending_evidence: 'opened',
  evidence_submitted: 'pending_agent_response',
  agent_responded: 'under_review',
  under_admin_review: 'under_review',
  escalated: 'escalated',
  resolved_refund: 'resolved_favor_user',
  resolved_partial: 'resolved_compromise',
  resolved_denied: 'resolved_favor_agent',
  closed_withdrawn: 'closed_no_action',
  closed_expired: 'closed_no_action',
};

/**
 * Map backend state to frontend status.
 */
function mapStateToStatus(state: string): string {
  return stateToStatusMap[state] || state;
}

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
 * Map dispute to admin DTO with full details.
 */
function toAdminDTO(dispute: any, evidenceCount: number, hasResponse: boolean): DisputeAdminDTO {
  return {
    id: dispute.id,
    bookingId: dispute.bookingId,
    travelerId: dispute.travelerId,
    agentId: dispute.agentId,
    category: dispute.category,
    state: dispute.state,
    title: dispute.title,
    description: dispute.description,
    isSubjectiveComplaint: dispute.isSubjectiveComplaint,
    bookingAmount: dispute.bookingAmount,
    currency: dispute.currency,
    createdAt: dispute.createdAt.toISOString(),
    updatedAt: dispute.updatedAt.toISOString(),
    agentResponseDeadline: dispute.agentResponseDeadline?.toISOString() ?? null,
    adminAssignedId: dispute.adminAssignedId,
    adminAssignedAt: dispute.adminAssignedAt?.toISOString() ?? null,
    evidenceCount,
    hasAgentResponse: hasResponse,
    resolution: dispute.resolution
      ? {
          type: dispute.resolution.type,
          refundAmount: dispute.resolution.refundAmount,
          currency: dispute.resolution.currency,
          adminId: dispute.resolution.adminId,
          reason: dispute.resolution.reason,
          internalNotes: dispute.resolution.internalNotes,
          resolvedAt: dispute.resolution.resolvedAt.toISOString(),
        }
      : null,
    metadata: {
      bookingStartDate: dispute.metadata.bookingStartDate.toISOString(),
      bookingEndDate: dispute.metadata.bookingEndDate.toISOString(),
      destination: dispute.metadata.destination,
      disputeOpenedWithinWindow: dispute.metadata.disputeOpenedWithinWindow,
    },
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
 * Check admin authorization.
 */
function checkAdminAuth(req: Request, res: Response): string | null {
  const adminId = (req as any).user?.id;
  const isAdmin = (req as any).user?.role === 'admin';

  if (!adminId || !isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return adminId;
}

/**
 * Get admin dispute queue.
 * GET /api/v1/admin/disputes
 * Returns data in format compatible with admin-web frontend.
 */
export async function handleGetAdminQueue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const queryValidation = validateAdminQueueQuery(req.query);
    if (!queryValidation.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: queryValidation.errors });
      return;
    }

    const queryData = queryValidation.data;
    const page = queryData.page ?? 1;
    const pageSize = queryData.pageSize ?? 20;
    const { assignedToMe, unassigned, priority, state } = queryData;

    const filters: any = {};
    if (assignedToMe) filters.assignedTo = adminId;
    if (unassigned) filters.unassigned = true;
    if (state) filters.state = state;

    let disputes = await getAdminQueue(filters);

    // Filter by priority
    if (priority === 'escalated') {
      disputes = disputes.filter((d) => d.state === 'escalated');
    } else if (priority === 'high') {
      // High priority: escalated or overdue for response
      const now = new Date();
      disputes = disputes.filter(
        (d) =>
          d.state === 'escalated' ||
          (d.agentResponseDeadline && now > d.agentResponseDeadline)
      );
    }

    // Sort by priority: escalated first, then by creation date
    disputes.sort((a, b) => {
      if (a.state === 'escalated' && b.state !== 'escalated') return -1;
      if (b.state === 'escalated' && a.state !== 'escalated') return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Paginate
    const totalItems = disputes.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginated = disputes.slice(startIndex, startIndex + pageSize);

    // Transform to frontend-compatible format
    const items = paginated.map((d) => ({
      id: d.id,
      bookingId: d.bookingId,
      userId: d.travelerId, // Map travelerId to userId
      agentId: d.agentId,
      category: d.category,
      status: mapStateToStatus(d.state), // Map state to status
      description: d.description,
      userEvidence: [], // Evidence fetched separately
      agentEvidence: [],
      adminNotes: [],
      refundAmount: d.resolution?.refundAmount ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      resolvedAt: d.resolution?.resolvedAt?.toISOString() ?? null,
      resolvedBy: d.resolution?.adminId ?? null,
      // Additional fields
      title: d.title,
      isHighPriority:
        d.state === 'escalated' ||
        (d.agentResponseDeadline !== null && new Date() > d.agentResponseDeadline),
    }));

    // Return in frontend-expected PaginatedResponse format
    const response = {
      items,
      totalCount: totalItems,
      page,
      pageSize,
      hasMore: page < totalPages,
      totalPages,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Get dispute details for admin.
 * GET /api/v1/admin/disputes/:disputeId
 * Returns data in format compatible with admin-web frontend.
 */
export async function handleGetAdminDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const { disputeId } = req.params;
    const dispute = await getDispute(disputeId!);

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    const evidence = await getEvidenceForDispute(disputeId!);
    const agentResponse = await getAgentResponseForDispute(disputeId!);
    const resolution = await getResolution(disputeId!);
    const notes = await getNotesForDispute(disputeId!);

    // Split evidence by source
    const userEvidence = evidence.filter((e: any) => e.source === 'traveler').map((e: any) => e.fileUrl);
    const agentEvidence = evidence.filter((e: any) => e.source === 'agent').map((e: any) => e.fileUrl);

    // Map notes to frontend format
    const adminNotes = notes.map((n: any) => ({
      id: n.id,
      adminId: n.adminId,
      content: n.content,
      isInternal: n.isInternal,
      createdAt: n.createdAt?.toISOString?.() ?? n.createdAt,
    }));

    // Return in frontend-expected Dispute format
    const responseData = {
      id: dispute.id,
      bookingId: dispute.bookingId,
      userId: dispute.travelerId, // Map travelerId to userId
      agentId: dispute.agentId,
      category: dispute.category,
      status: mapStateToStatus(dispute.state), // Map state to status
      description: dispute.description,
      userEvidence,
      agentEvidence,
      adminNotes,
      refundAmount: resolution?.refundAmount ?? null,
      createdAt: dispute.createdAt.toISOString(),
      updatedAt: dispute.updatedAt.toISOString(),
      resolvedAt: resolution?.resolvedAt?.toISOString() ?? null,
      resolvedBy: resolution?.adminId ?? null,
      // Additional fields for detail view
      title: dispute.title,
      bookingAmount: dispute.bookingAmount,
      currency: dispute.currency,
      isSubjectiveComplaint: dispute.isSubjectiveComplaint,
      hasAgentResponse: !!agentResponse,
      agentResponseDeadline: dispute.agentResponseDeadline?.toISOString() ?? null,
      metadata: {
        bookingStartDate: dispute.metadata.bookingStartDate.toISOString(),
        bookingEndDate: dispute.metadata.bookingEndDate.toISOString(),
        destination: dispute.metadata.destination,
        disputeOpenedWithinWindow: dispute.metadata.disputeOpenedWithinWindow,
      },
      resolution: resolution ? {
        type: resolution.type,
        refundAmount: resolution.refundAmount,
        currency: resolution.currency,
        adminId: resolution.adminId,
        reason: resolution.reason,
        internalNotes: resolution.internalNotes,
        resolvedAt: resolution.resolvedAt.toISOString(),
      } : null,
    };

    res.json(responseData);
  } catch (error) {
    next(error);
  }
}

/**
 * Start admin review of a dispute.
 * POST /api/v1/admin/disputes/:disputeId/review
 */
export async function handleStartReview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const context = createEventContext(req);
    const { disputeId } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
      res.status(400).json({ error: 'Reason is required for admin actions' });
      return;
    }

    const dispute = await startAdminReview(disputeId!, adminId, reason, context);

    const evidence = await getEvidenceForDispute(disputeId!);
    const response = await getAgentResponseForDispute(disputeId!);

    logger.info({
      msg: 'Admin started review via API',
      disputeId,
      adminId,
      correlationId: context.correlationId,
    });

    res.json(toAdminDTO(dispute, evidence.length, !!response));
  } catch (error) {
    next(error);
  }
}

/**
 * Resolve a dispute.
 * POST /api/v1/admin/disputes/:disputeId/resolve
 */
export async function handleResolveDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const context = createEventContext(req);
    const { disputeId } = req.params;

    const validation = validateAdminDecision({ ...req.body, disputeId });
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const { dispute, resolution } = await resolveDispute(validation.data, adminId, context);

    const evidence = await getEvidenceForDispute(disputeId!);
    const response = await getAgentResponseForDispute(disputeId!);

    const disputeWithResolution = { ...dispute, resolution };

    logger.info({
      msg: 'Dispute resolved via API',
      disputeId,
      resolution: validation.data.resolution,
      adminId,
      correlationId: context.correlationId,
    });

    res.json(toAdminDTO(disputeWithResolution, evidence.length, !!response));
  } catch (error) {
    next(error);
  }
}

/**
 * Escalate a dispute.
 * POST /api/v1/admin/disputes/:disputeId/escalate
 */
export async function handleEscalateDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const context = createEventContext(req);
    const { disputeId } = req.params;

    const validation = validateAdminEscalate({ ...req.body, disputeId });
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const dispute = await escalateDispute(validation.data, adminId, context);

    const evidence = await getEvidenceForDispute(disputeId!);
    const response = await getAgentResponseForDispute(disputeId!);

    logger.info({
      msg: 'Dispute escalated via API',
      disputeId,
      priority: validation.data.priority,
      adminId,
      correlationId: context.correlationId,
    });

    res.json(toAdminDTO(dispute, evidence.length, !!response));
  } catch (error) {
    next(error);
  }
}

/**
 * Add a note to a dispute.
 * POST /api/v1/admin/disputes/:disputeId/notes
 */
export async function handleAddNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const context = createEventContext(req);
    const { disputeId } = req.params;

    const validation = validateAdminNote({ ...req.body, disputeId });
    if (!validation.success) {
      res.status(400).json({ error: 'Validation failed', details: validation.errors });
      return;
    }

    const noteData = {
      ...validation.data,
      isInternal: validation.data.isInternal ?? true,
    };
    const note = await addNote(noteData, adminId, context);

    res.status(201).json({
      id: note.id,
      note: note.note,
      adminId: note.adminId,
      isInternal: note.isInternal,
      createdAt: note.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get notes for a dispute.
 * GET /api/v1/admin/disputes/:disputeId/notes
 */
export async function handleGetNotes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const { disputeId } = req.params;
    const notes = await getNotesForDispute(disputeId!, true);

    res.json(
      notes.map((n) => ({
        id: n.id,
        note: n.note,
        adminId: n.adminId,
        isInternal: n.isInternal,
        createdAt: n.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get arbitration history for a dispute.
 * GET /api/v1/admin/disputes/:disputeId/history
 */
export async function handleGetArbitrationHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const { disputeId } = req.params;
    const history = await getArbitrationHistory(disputeId!);

    const entries: ArbitrationEntryDTO[] = history.map((h) => ({
      id: h.id,
      action: h.action,
      adminId: h.adminId,
      adminName: 'Admin', // In production, fetch from user service
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    }));

    res.json(entries);
  } catch (error) {
    next(error);
  }
}

/**
 * Get audit logs for a dispute.
 * GET /api/v1/admin/disputes/:disputeId/audit
 */
export async function handleGetAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const { disputeId } = req.params;
    const logs = await getAuditLogs('dispute', disputeId!);

    res.json(
      logs.map((l) => ({
        id: l.id,
        action: l.action,
        actorType: l.actorType,
        actorId: l.actorId,
        reason: l.reason,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get evidence for a dispute (admin view).
 * GET /api/v1/admin/disputes/:disputeId/evidence
 */
export async function handleGetAdminEvidence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const { disputeId } = req.params;
    const evidence = await getEvidenceForDispute(disputeId!);
    const stats = await getEvidenceStats(disputeId!);

    res.json({
      evidence: evidence.map(toEvidenceDTO),
      stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify evidence.
 * POST /api/v1/admin/evidence/:evidenceId/verify
 */
export async function handleVerifyEvidence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const context = createEventContext(req);
    const { evidenceId } = req.params;
    const { verified } = req.body;

    if (typeof verified !== 'boolean') {
      res.status(400).json({ error: 'verified field must be a boolean' });
      return;
    }

    const evidence = await verifyEvidence(evidenceId!, adminId, verified, context);

    res.json(toEvidenceDTO(evidence));
  } catch (error) {
    next(error);
  }
}

/**
 * Assign dispute to admin.
 * POST /api/v1/admin/disputes/:disputeId/assign
 */
export async function handleAssignDispute(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const context = createEventContext(req);
    const { disputeId } = req.params;
    const { assignTo, reason } = req.body;

    if (!reason?.trim()) {
      res.status(400).json({ error: 'Reason is required for admin actions' });
      return;
    }

    const targetAdminId = assignTo || adminId;
    const dispute = await assignToAdmin(disputeId!, targetAdminId, reason, context);

    const evidence = await getEvidenceForDispute(disputeId!);
    const response = await getAgentResponseForDispute(disputeId!);

    res.json(toAdminDTO(dispute, evidence.length, !!response));
  } catch (error) {
    next(error);
  }
}

/**
 * Get dispute statistics.
 * GET /api/v1/admin/statistics
 */
export async function handleGetStatistics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const adminId = checkAdminAuth(req, res);
    if (!adminId) return;

    const stats = await getDisputeStatistics();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}
