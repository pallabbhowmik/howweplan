/**
 * Arbitration Service
 * 
 * Handles admin arbitration and dispute resolution.
 * All admin actions require a reason and are audit-logged per business rules.
 * Disputes require admin arbitration per business rules.
 */

import { v4 as uuidv4 } from 'uuid';
import { config } from '../env.js';
import {
  Dispute,
  DisputeResolution,
  AdminArbitration,
  ResolutionType,
} from '../types/domain.js';
import { AdminDecisionDTO, AdminEscalateDTO, AdminNoteDTO } from '../types/dto.js';
import { getDispute, transitionDisputeState, assignToAdmin } from './dispute.service.js';
import {
  resolutionToAction,
  isTerminalState,
} from '../state-machine/dispute-state.js';
import {
  eventPublisher,
  createDisputeResolvedEvent,
  createRefundApprovedEvent,
  createDisputeEscalatedEvent,
  type EventContext,
} from '../events/publisher.js';
import { auditAdminAction, createAuditLog, logger } from '../audit/logger.js';

/**
 * In-memory arbitration store for development.
 */
const arbitrationStore = new Map<string, AdminArbitration>();
const disputeNotesStore = new Map<string, Array<{ id: string; note: string; adminId: string; isInternal: boolean; createdAt: Date }>>();

/**
 * Resolution store for tracking resolutions.
 */
const resolutionStore = new Map<string, DisputeResolution>();

/**
 * Start admin review of a dispute.
 * CRITICAL: Admin reason is mandatory per business rules.
 */
export async function startAdminReview(
  disputeId: string,
  adminId: string,
  reason: string,
  context: EventContext
): Promise<Dispute> {
  if (!reason?.trim()) {
    throw new Error('Admin reason is mandatory for starting review');
  }

  const dispute = await getDispute(disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  // Assign admin if not already assigned
  if (!dispute.adminAssignedId) {
    await assignToAdmin(disputeId, adminId, reason, context);
  }

  // Transition to under_admin_review
  const updatedDispute = await transitionDisputeState(
    disputeId,
    'admin_start_review',
    'admin',
    adminId,
    reason,
    context
  );

  // Record arbitration action
  const arbitration: AdminArbitration = {
    id: uuidv4(),
    disputeId,
    adminId,
    action: 'dispute_opened',
    reason,
    details: { previousState: dispute.state },
    createdAt: new Date(),
  };

  arbitrationStore.set(arbitration.id, arbitration);

  logger.info({
    msg: 'Admin review started',
    disputeId,
    adminId,
  });

  return updatedDispute;
}

/**
 * Resolve a dispute with admin decision.
 * CRITICAL: Admin reason is mandatory per business rules.
 * Subjective complaints are NOT refundable per business rules.
 */
export async function resolveDispute(
  dto: AdminDecisionDTO,
  adminId: string,
  context: EventContext
): Promise<{ dispute: Dispute; resolution: DisputeResolution }> {
  // Validate mandatory reason
  if (!dto.reason?.trim()) {
    throw new Error('Admin reason is mandatory for dispute resolution');
  }

  const dispute = await getDispute(dto.disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${dto.disputeId}`);
  }

  // Check if already resolved
  if (isTerminalState(dispute.state)) {
    throw new Error(`Dispute is already in terminal state: ${dispute.state}`);
  }

  // Enforce subjective complaint rule
  if (
    dispute.isSubjectiveComplaint &&
    (dto.resolution === 'full_refund' || dto.resolution === 'partial_refund')
  ) {
    throw new Error(
      'Subjective complaints are not eligible for refunds per business rules. ' +
      'Use no_refund_subjective resolution type instead.'
    );
  }

  // Calculate refund amount
  let refundAmount: number | null = null;
  if (dto.resolution === 'full_refund') {
    refundAmount = dispute.bookingAmount;
  } else if (dto.resolution === 'partial_refund' || dto.resolution === 'credit_issued') {
    if (!dto.refundAmount || dto.refundAmount <= 0) {
      throw new Error('Refund amount is required for partial refunds');
    }
    if (dto.refundAmount > dispute.bookingAmount) {
      throw new Error('Refund amount cannot exceed booking amount');
    }
    refundAmount = dto.refundAmount;
  }

  // Create resolution record
  const resolution: DisputeResolution = {
    type: dto.resolution,
    refundAmount,
    currency: dispute.currency,
    adminId,
    reason: dto.reason,
    internalNotes: dto.internalNotes ?? null,
    resolvedAt: new Date(),
  };

  resolutionStore.set(dto.disputeId, resolution);

  // Determine action for state machine
  const action = resolutionToAction(dto.resolution);

  // Transition state
  const updatedDispute = await transitionDisputeState(
    dto.disputeId,
    action,
    'admin',
    adminId,
    dto.reason,
    context
  );

  // Audit admin action
  await auditAdminAction({
    entityType: 'resolution',
    entityId: dto.disputeId,
    action: `resolution:${dto.resolution}`,
    adminId,
    reason: dto.reason,
    newState: resolution as unknown as Record<string, unknown>,
  });

  // Record arbitration
  const arbitration: AdminArbitration = {
    id: uuidv4(),
    disputeId: dto.disputeId,
    adminId,
    action: 'resolution_approved',
    reason: dto.reason,
    details: {
      resolution: dto.resolution,
      refundAmount,
      isSubjectiveComplaint: dispute.isSubjectiveComplaint,
    },
    createdAt: new Date(),
  };

  arbitrationStore.set(arbitration.id, arbitration);

  // Emit resolution event
  await eventPublisher.publish(
    createDisputeResolvedEvent(context, {
      disputeId: dto.disputeId,
      bookingId: dispute.bookingId,
      travelerId: dispute.travelerId,
      agentId: dispute.agentId,
      resolution: dto.resolution,
      refundAmount,
      currency: dispute.currency,
      adminId,
      reason: dto.reason,
    })
  );

  // If refund approved, emit refund event
  if (refundAmount && refundAmount > 0) {
    await eventPublisher.publish(
      createRefundApprovedEvent(context, {
        disputeId: dto.disputeId,
        bookingId: dispute.bookingId,
        travelerId: dispute.travelerId,
        agentId: dispute.agentId,
        refundAmount,
        currency: dispute.currency,
        refundType: dto.resolution === 'full_refund' ? 'full' : 'partial',
        approvedBy: adminId,
        approvalReason: dto.reason,
      })
    );
  }

  logger.info({
    msg: 'Dispute resolved',
    disputeId: dto.disputeId,
    resolution: dto.resolution,
    refundAmount,
    adminId,
    isSubjectiveComplaint: dispute.isSubjectiveComplaint,
  });

  // Return updated dispute with resolution
  const finalDispute: Dispute = {
    ...updatedDispute,
    resolution,
  };

  return { dispute: finalDispute, resolution };
}

/**
 * Escalate a dispute for senior review.
 * CRITICAL: Admin reason is mandatory per business rules.
 */
export async function escalateDispute(
  dto: AdminEscalateDTO,
  adminId: string,
  context: EventContext
): Promise<Dispute> {
  if (!dto.reason?.trim()) {
    throw new Error('Admin reason is mandatory for escalation');
  }

  const dispute = await getDispute(dto.disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${dto.disputeId}`);
  }

  // Transition to escalated state
  const updatedDispute = await transitionDisputeState(
    dto.disputeId,
    'admin_escalate',
    'admin',
    adminId,
    dto.reason,
    context
  );

  // Record arbitration
  const arbitration: AdminArbitration = {
    id: uuidv4(),
    disputeId: dto.disputeId,
    adminId,
    action: 'dispute_escalated',
    reason: dto.reason,
    details: { priority: dto.priority },
    createdAt: new Date(),
  };

  arbitrationStore.set(arbitration.id, arbitration);

  // Emit escalation event
  await eventPublisher.publish(
    createDisputeEscalatedEvent(context, {
      disputeId: dto.disputeId,
      escalatedBy: adminId,
      priority: dto.priority,
      reason: dto.reason,
    })
  );

  logger.info({
    msg: 'Dispute escalated',
    disputeId: dto.disputeId,
    priority: dto.priority,
    adminId,
  });

  return updatedDispute;
}

/**
 * Add a note to a dispute.
 * CRITICAL: All admin actions are audit-logged per business rules.
 */
export async function addNote(
  dto: AdminNoteDTO,
  adminId: string,
  context: EventContext
): Promise<{ id: string; note: string; adminId: string; isInternal: boolean; createdAt: Date }> {
  const dispute = await getDispute(dto.disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${dto.disputeId}`);
  }

  const noteEntry = {
    id: uuidv4(),
    note: dto.note,
    adminId,
    isInternal: dto.isInternal,
    createdAt: new Date(),
  };

  const existingNotes = disputeNotesStore.get(dto.disputeId) ?? [];
  existingNotes.push(noteEntry);
  disputeNotesStore.set(dto.disputeId, existingNotes);

  // Record arbitration
  const arbitration: AdminArbitration = {
    id: uuidv4(),
    disputeId: dto.disputeId,
    adminId,
    action: 'note_added',
    reason: dto.note,
    details: { isInternal: dto.isInternal },
    createdAt: new Date(),
  };

  arbitrationStore.set(arbitration.id, arbitration);

  // Audit admin action
  await auditAdminAction({
    entityType: 'dispute',
    entityId: dto.disputeId,
    action: 'note_added',
    adminId,
    reason: 'Admin added note to dispute',
    newState: { noteId: noteEntry.id, isInternal: dto.isInternal },
  });

  logger.info({
    msg: 'Note added to dispute',
    disputeId: dto.disputeId,
    noteId: noteEntry.id,
    adminId,
    isInternal: dto.isInternal,
  });

  return noteEntry;
}

/**
 * Get notes for a dispute.
 */
export async function getNotesForDispute(
  disputeId: string,
  includeInternal: boolean = false
): Promise<Array<{ id: string; note: string; adminId: string; isInternal: boolean; createdAt: Date }>> {
  const notes = disputeNotesStore.get(disputeId) ?? [];

  if (includeInternal) {
    return notes;
  }

  return notes.filter((n) => !n.isInternal);
}

/**
 * Get arbitration history for a dispute.
 */
export async function getArbitrationHistory(
  disputeId: string
): Promise<AdminArbitration[]> {
  return Array.from(arbitrationStore.values())
    .filter((a) => a.disputeId === disputeId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Get resolution for a dispute.
 */
export async function getResolution(
  disputeId: string
): Promise<DisputeResolution | null> {
  return resolutionStore.get(disputeId) ?? null;
}
