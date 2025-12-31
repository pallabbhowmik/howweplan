/**
 * Core Domain Types for Dispute Service
 * 
 * These types represent the domain model for disputes, evidence,
 * and arbitration. They are used throughout the service.
 */

/**
 * Dispute states following a strict state machine.
 * Transitions are enforced by the state machine module.
 */
export type DisputeState =
  | 'pending_evidence'      // Initial state, traveler must provide evidence
  | 'evidence_submitted'    // Evidence received, awaiting agent response
  | 'agent_responded'       // Agent has responded, awaiting admin review
  | 'under_admin_review'    // Admin is actively reviewing
  | 'escalated'            // Complex case requiring senior review
  | 'resolved_refund'      // Resolved with refund
  | 'resolved_partial'     // Resolved with partial refund
  | 'resolved_denied'      // Resolved, no refund (e.g., subjective complaint)
  | 'closed_withdrawn'     // Traveler withdrew the dispute
  | 'closed_expired';      // Dispute expired due to inactivity

/**
 * Categories of disputes that can be filed.
 * Each category has different evidence requirements and resolution paths.
 */
export type DisputeCategory =
  | 'service_not_provided'       // Booked service was not delivered
  | 'service_significantly_different'  // Service differed materially from description
  | 'safety_concern'             // Safety issues during the trip
  | 'unauthorized_charges'       // Extra charges not in the booking
  | 'cancellation_policy'        // Issues with cancellation/refund policy
  | 'agent_misconduct'           // Professional misconduct by agent
  | 'other';                     // Other issues (requires detailed explanation)

/**
 * Subjective complaint categories that are NOT eligible for refunds.
 * Per business rules: "Subjective complaints are NOT refundable"
 */
export const SUBJECTIVE_COMPLAINT_CATEGORIES = [
  'weather_related',
  'personal_preference',
  'taste_or_style',
  'crowding_or_popularity',
  'regret_or_change_of_mind',
] as const;

export type SubjectiveComplaintCategory = typeof SUBJECTIVE_COMPLAINT_CATEGORIES[number];

/**
 * Resolution types that can be applied to a dispute.
 */
export type ResolutionType =
  | 'full_refund'
  | 'partial_refund'
  | 'credit_issued'
  | 'no_refund_objective'    // Denied due to objective evidence against claim
  | 'no_refund_subjective'   // Denied due to subjective nature (not refundable)
  | 'withdrawn';

/**
 * Evidence types that can be submitted.
 */
export type EvidenceType =
  | 'photo'
  | 'document'
  | 'screenshot'
  | 'communication_log'
  | 'receipt'
  | 'video'
  | 'written_statement';

/**
 * Who submitted the evidence.
 */
export type EvidenceSource = 'traveler' | 'agent' | 'admin' | 'system';

/**
 * Admin action types for audit logging.
 */
export type AdminActionType =
  | 'dispute_opened'
  | 'dispute_assigned'
  | 'evidence_reviewed'
  | 'agent_response_requested'
  | 'resolution_proposed'
  | 'resolution_approved'
  | 'refund_initiated'
  | 'dispute_escalated'
  | 'dispute_closed'
  | 'note_added';

/**
 * Core Dispute entity.
 */
export interface Dispute {
  readonly id: string;
  readonly bookingId: string;
  readonly travelerId: string;
  readonly agentId: string;
  readonly category: DisputeCategory;
  readonly state: DisputeState;
  readonly title: string;
  readonly description: string;
  readonly isSubjectiveComplaint: boolean;
  readonly bookingAmount: number;
  readonly currency: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly agentResponseDeadline: Date | null;
  readonly adminAssignedId: string | null;
  readonly adminAssignedAt: Date | null;
  readonly resolution: DisputeResolution | null;
  readonly metadata: DisputeMetadata;
}

/**
 * Resolution details when a dispute is resolved.
 */
export interface DisputeResolution {
  readonly type: ResolutionType;
  readonly refundAmount: number | null;
  readonly currency: string;
  readonly adminId: string;
  readonly reason: string;
  readonly internalNotes: string | null;
  readonly resolvedAt: Date;
}

/**
 * Additional metadata for a dispute.
 */
export interface DisputeMetadata {
  readonly bookingStartDate: Date;
  readonly bookingEndDate: Date;
  readonly destination: string;
  readonly originalItineraryId: string;
  readonly chatThreadId: string;
  readonly disputeOpenedWithinWindow: boolean;
}

/**
 * Evidence item attached to a dispute.
 */
export interface Evidence {
  readonly id: string;
  readonly disputeId: string;
  readonly type: EvidenceType;
  readonly source: EvidenceSource;
  readonly submittedBy: string;
  readonly fileName: string;
  readonly fileUrl: string;
  readonly fileSizeBytes: number;
  readonly mimeType: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly isVerified: boolean;
  readonly verifiedBy: string | null;
  readonly verifiedAt: Date | null;
}

/**
 * Agent's response to a dispute.
 */
export interface AgentResponse {
  readonly id: string;
  readonly disputeId: string;
  readonly agentId: string;
  readonly response: string;
  readonly acceptsResponsibility: boolean;
  readonly proposedResolution: string | null;
  readonly evidenceIds: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Admin arbitration record.
 */
export interface AdminArbitration {
  readonly id: string;
  readonly disputeId: string;
  readonly adminId: string;
  readonly action: AdminActionType;
  readonly reason: string;
  readonly details: Record<string, unknown>;
  readonly createdAt: Date;
}

/**
 * Audit log entry for tracking all state changes.
 */
export interface AuditLogEntry {
  readonly id: string;
  readonly entityType: 'dispute' | 'evidence' | 'resolution';
  readonly entityId: string;
  readonly action: string;
  readonly actorType: 'traveler' | 'agent' | 'admin' | 'system';
  readonly actorId: string;
  readonly previousState: Record<string, unknown> | null;
  readonly newState: Record<string, unknown> | null;
  readonly reason: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: Date;
}

/**
 * Rate limit tracking for dispute creation.
 */
export interface DisputeRateLimit {
  readonly userId: string;
  readonly disputeCount: number;
  readonly windowStart: Date;
  readonly windowEnd: Date;
}
