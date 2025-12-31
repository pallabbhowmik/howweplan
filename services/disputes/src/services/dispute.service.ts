/**
 * Dispute Service
 * 
 * Core business logic for dispute management.
 * All state changes go through the state machine.
 * All state changes emit audit events.
 */

import { v4 as uuidv4 } from 'uuid';
import { config } from '../env.js';
import {
  Dispute,
  DisputeCategory,
  DisputeState,
  DisputeMetadata,
  DisputeResolution,
  SUBJECTIVE_COMPLAINT_CATEGORIES,
} from '../types/domain.js';
import { DisputeCreateDTO } from '../types/dto.js';
import {
  attemptTransition,
  isTerminalState,
  resolutionToAction,
  type DisputeAction,
  type ActionActor,
} from '../state-machine/dispute-state.js';
import {
  eventPublisher,
  createDisputeCreatedEvent,
  createDisputeStateChangedEvent,
  createDisputeWithdrawnEvent,
  type EventContext,
} from '../events/publisher.js';
import { createAuditLog, auditAdminAction, logger } from '../audit/logger.js';
import { seedDisputeStore } from './seed.js';

/**
 * In-memory dispute store for development.
 * In production, this would be backed by a database.
 */
const disputeStore = new Map<string, Dispute>();

// Seed the store with sample data for development
if (process.env.NODE_ENV !== 'production') {
  seedDisputeStore(disputeStore);
}

/**
 * Booking details cache for dispute creation.
 */
interface BookingDetails {
  bookingId: string;
  travelerId: string;
  agentId: string;
  status: string;
  totalAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  destination: string;
  itineraryId: string;
  chatThreadId: string;
  completedAt: Date | null;
}

/**
 * Check if a category indicates a subjective complaint.
 * Subjective complaints are NOT eligible for refunds per business rules.
 */
function isSubjectiveComplaint(
  category: DisputeCategory,
  description: string
): boolean {
  // Check for subjective keywords in description
  const subjectiveKeywords = [
    'didn\'t like',
    'not my taste',
    'expected better',
    'personal preference',
    'changed my mind',
    'regret',
    'weather',
    'too crowded',
    'not as imagined',
  ];

  const descriptionLower = description.toLowerCase();
  const hasSubjectiveKeywords = subjectiveKeywords.some((keyword) =>
    descriptionLower.includes(keyword)
  );

  // Category 'other' with subjective keywords is flagged
  if (category === 'other' && hasSubjectiveKeywords) {
    return true;
  }

  return false;
}

/**
 * Calculate agent response deadline based on config.
 */
function calculateAgentResponseDeadline(): Date {
  const deadline = new Date();
  deadline.setHours(
    deadline.getHours() + config.limits.agentResponseDeadlineHours
  );
  return deadline;
}

/**
 * Check if dispute was opened within the allowed window.
 */
function isWithinDisputeWindow(bookingEndDate: Date): boolean {
  const now = new Date();
  const windowEnd = new Date(bookingEndDate);
  windowEnd.setHours(
    windowEnd.getHours() + config.limits.disputeWindowHours
  );
  return now <= windowEnd;
}

/**
 * Create a new dispute.
 */
export async function createDispute(
  dto: DisputeCreateDTO,
  bookingDetails: BookingDetails,
  context: EventContext
): Promise<Dispute> {
  const disputeId = uuidv4();

  // Validate booking can have disputes filed
  if (bookingDetails.status !== 'completed') {
    throw new Error('Disputes can only be filed for completed bookings');
  }

  // Check dispute window
  const withinWindow = isWithinDisputeWindow(bookingDetails.endDate);
  if (!withinWindow) {
    throw new Error(
      `Dispute window has expired. Disputes must be filed within ${config.limits.disputeWindowHours} hours of booking end.`
    );
  }

  // Detect subjective complaints
  const subjective = isSubjectiveComplaint(dto.category, dto.description);

  const metadata: DisputeMetadata = {
    bookingStartDate: bookingDetails.startDate,
    bookingEndDate: bookingDetails.endDate,
    destination: bookingDetails.destination,
    originalItineraryId: bookingDetails.itineraryId,
    chatThreadId: bookingDetails.chatThreadId,
    disputeOpenedWithinWindow: withinWindow,
  };

  const dispute: Dispute = {
    id: disputeId,
    bookingId: dto.bookingId,
    travelerId: bookingDetails.travelerId,
    agentId: bookingDetails.agentId,
    category: dto.category,
    state: 'pending_evidence',
    title: dto.title,
    description: dto.description,
    isSubjectiveComplaint: subjective,
    bookingAmount: bookingDetails.totalAmount,
    currency: bookingDetails.currency,
    createdAt: new Date(),
    updatedAt: new Date(),
    agentResponseDeadline: calculateAgentResponseDeadline(),
    adminAssignedId: null,
    adminAssignedAt: null,
    resolution: null,
    metadata,
  };

  // Store the dispute
  disputeStore.set(disputeId, dispute);

  // Create audit log
  await createAuditLog({
    entityType: 'dispute',
    entityId: disputeId,
    action: 'dispute_created',
    actorType: 'traveler',
    actorId: bookingDetails.travelerId,
    newState: dispute as unknown as Record<string, unknown>,
  });

  // Emit event
  await eventPublisher.publish(
    createDisputeCreatedEvent(context, {
      disputeId,
      bookingId: dto.bookingId,
      travelerId: bookingDetails.travelerId,
      agentId: bookingDetails.agentId,
      category: dto.category,
      title: dto.title,
      isSubjectiveComplaint: subjective,
      bookingAmount: bookingDetails.totalAmount,
      currency: bookingDetails.currency,
      agentResponseDeadline: dispute.agentResponseDeadline!,
    })
  );

  logger.info({
    msg: 'Dispute created',
    disputeId,
    bookingId: dto.bookingId,
    category: dto.category,
    isSubjectiveComplaint: subjective,
  });

  return dispute;
}

/**
 * Get a dispute by ID.
 */
export async function getDispute(disputeId: string): Promise<Dispute | null> {
  return disputeStore.get(disputeId) ?? null;
}

/**
 * Get disputes by traveler ID.
 */
export async function getDisputesByTraveler(
  travelerId: string
): Promise<Dispute[]> {
  return Array.from(disputeStore.values()).filter(
    (d) => d.travelerId === travelerId
  );
}

/**
 * Get disputes by agent ID.
 */
export async function getDisputesByAgent(agentId: string): Promise<Dispute[]> {
  return Array.from(disputeStore.values()).filter(
    (d) => d.agentId === agentId
  );
}

/**
 * Get disputes requiring admin attention.
 */
export async function getAdminQueue(
  filters: {
    assignedTo?: string;
    unassigned?: boolean;
    state?: DisputeState;
  } = {}
): Promise<Dispute[]> {
  return Array.from(disputeStore.values()).filter((d) => {
    // Only include states that need admin attention
    const needsAttention = [
      'evidence_submitted',
      'agent_responded',
      'under_admin_review',
      'escalated',
    ].includes(d.state);

    if (!needsAttention) return false;

    if (filters.assignedTo && d.adminAssignedId !== filters.assignedTo) {
      return false;
    }

    if (filters.unassigned && d.adminAssignedId !== null) {
      return false;
    }

    if (filters.state && d.state !== filters.state) {
      return false;
    }

    return true;
  });
}

/**
 * Transition dispute state.
 */
export async function transitionDisputeState(
  disputeId: string,
  action: DisputeAction,
  actor: ActionActor,
  actorId: string,
  reason: string,
  context: EventContext
): Promise<Dispute> {
  const dispute = await getDispute(disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  const previousState = dispute.state;

  // Attempt the transition through state machine
  const result = attemptTransition(dispute.state, action, actor, reason);

  if (!result.success) {
    throw new Error(result.error);
  }

  // Update dispute state
  const updatedDispute: Dispute = {
    ...dispute,
    state: result.newState,
    updatedAt: new Date(),
  };

  disputeStore.set(disputeId, updatedDispute);

  // Create audit log
  await createAuditLog({
    entityType: 'dispute',
    entityId: disputeId,
    action: `state_changed:${action}`,
    actorType: actor,
    actorId,
    previousState: { state: previousState },
    newState: { state: result.newState },
    reason,
  });

  // Emit state change event
  await eventPublisher.publish(
    createDisputeStateChangedEvent(context, {
      disputeId,
      previousState,
      newState: result.newState,
      changedBy: actorId,
      changedByType: actor,
      reason,
    })
  );

  logger.info({
    msg: 'Dispute state transitioned',
    disputeId,
    previousState,
    newState: result.newState,
    action,
    actor,
  });

  return updatedDispute;
}

/**
 * Withdraw a dispute by traveler.
 */
export async function withdrawDispute(
  disputeId: string,
  travelerId: string,
  reason: string,
  context: EventContext
): Promise<Dispute> {
  const dispute = await getDispute(disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  if (dispute.travelerId !== travelerId) {
    throw new Error('Only the dispute creator can withdraw the dispute');
  }

  // Use state machine to transition
  const updatedDispute = await transitionDisputeState(
    disputeId,
    'traveler_withdraw',
    'traveler',
    travelerId,
    reason,
    context
  );

  // Emit withdrawal event
  await eventPublisher.publish(
    createDisputeWithdrawnEvent(context, {
      disputeId,
      travelerId,
      reason,
    })
  );

  return updatedDispute;
}

/**
 * Assign dispute to admin.
 */
export async function assignToAdmin(
  disputeId: string,
  adminId: string,
  reason: string,
  context: EventContext
): Promise<Dispute> {
  const dispute = await getDispute(disputeId);
  if (!dispute) {
    throw new Error(`Dispute not found: ${disputeId}`);
  }

  if (isTerminalState(dispute.state)) {
    throw new Error('Cannot assign a closed or resolved dispute');
  }

  const previousAdminId = dispute.adminAssignedId;

  const updatedDispute: Dispute = {
    ...dispute,
    adminAssignedId: adminId,
    adminAssignedAt: new Date(),
    updatedAt: new Date(),
  };

  disputeStore.set(disputeId, updatedDispute);

  // Audit admin action
  await auditAdminAction({
    entityType: 'dispute',
    entityId: disputeId,
    action: 'admin_assigned',
    adminId,
    reason,
    previousState: { adminAssignedId: previousAdminId },
    newState: { adminAssignedId: adminId },
  });

  logger.info({
    msg: 'Dispute assigned to admin',
    disputeId,
    adminId,
    previousAdminId,
  });

  return updatedDispute;
}

/**
 * Get dispute statistics for admin dashboard.
 * Returns data in format expected by admin-web frontend.
 */
export async function getDisputeStatistics(): Promise<{
  totalOpen: number;
  pendingReview: number;
  pendingUserResponse: number;
  pendingAgentResponse: number;
  resolvedThisMonth: number;
  averageResolutionDays: number;
  byCategory: Record<DisputeCategory, number>;
  // Legacy fields for backward compatibility
  total: number;
  byState: Record<DisputeState, number>;
  avgResolutionTimeHours: number;
  subjectiveComplaintCount: number;
}> {
  const disputes = Array.from(disputeStore.values());

  const byState: Record<DisputeState, number> = {
    pending_evidence: 0,
    evidence_submitted: 0,
    agent_responded: 0,
    under_admin_review: 0,
    escalated: 0,
    resolved_refund: 0,
    resolved_partial: 0,
    resolved_denied: 0,
    closed_withdrawn: 0,
    closed_expired: 0,
  };

  // Use Record<string, number> for flexible category tracking
  const byCategory: Record<string, number> = {
    service_not_provided: 0,
    service_significantly_different: 0,
    safety_concern: 0,
    unauthorized_charges: 0,
    cancellation_policy: 0,
    agent_misconduct: 0,
    other: 0,
  };

  let totalResolutionTime = 0;
  let resolvedCount = 0;
  let subjectiveCount = 0;
  let resolvedThisMonth = 0;
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const dispute of disputes) {
    byState[dispute.state]++;
    // Track category - handle any category value
    const cat = dispute.category;
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    if (dispute.isSubjectiveComplaint) {
      subjectiveCount++;
    }

    if (dispute.resolution) {
      const resolutionTime =
        dispute.resolution.resolvedAt.getTime() - dispute.createdAt.getTime();
      totalResolutionTime += resolutionTime;
      resolvedCount++;
      
      // Check if resolved this month
      if (dispute.resolution.resolvedAt >= startOfMonth) {
        resolvedThisMonth++;
      }
    }
  }

  const avgResolutionTimeHours =
    resolvedCount > 0
      ? totalResolutionTime / resolvedCount / (1000 * 60 * 60)
      : 0;
  
  const averageResolutionDays = avgResolutionTimeHours / 24;

  // Calculate frontend-expected stats
  const totalOpen = byState.pending_evidence + byState.evidence_submitted + 
    byState.agent_responded + byState.under_admin_review + byState.escalated;
  const pendingReview = byState.under_admin_review + byState.escalated;
  const pendingUserResponse = byState.pending_evidence;
  const pendingAgentResponse = byState.evidence_submitted;

  return {
    // Frontend-expected fields
    totalOpen,
    pendingReview,
    pendingUserResponse,
    pendingAgentResponse,
    resolvedThisMonth,
    averageResolutionDays: Math.round(averageResolutionDays * 10) / 10,
    byCategory,
    // Legacy fields
    total: disputes.length,
    byState,
    avgResolutionTimeHours,
    subjectiveComplaintCount: subjectiveCount,
  };
}
