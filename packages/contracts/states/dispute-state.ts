/**
 * Dispute State Machine
 * Defines the lifecycle of a dispute
 * 
 * Constitution rules enforced:
 * - Rule 13: Subjective complaints are NOT refundable
 * - Rule 15: Disputes require admin arbitration
 */

export enum DisputeState {
  /** Dispute opened by user */
  OPENED = 'OPENED',
  
  /** Awaiting agent response */
  AWAITING_AGENT_RESPONSE = 'AWAITING_AGENT_RESPONSE',
  
  /** Agent has responded */
  AGENT_RESPONDED = 'AGENT_RESPONDED',
  
  /** Under review by user (reviewing agent response) */
  USER_REVIEWING = 'USER_REVIEWING',
  
  /** Escalated to admin arbitration (rule 15) */
  ESCALATED_TO_ADMIN = 'ESCALATED_TO_ADMIN',
  
  /** Admin is actively investigating */
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  
  /** Awaiting additional evidence */
  AWAITING_EVIDENCE = 'AWAITING_EVIDENCE',
  
  /** Resolved in favor of user */
  RESOLVED_USER_FAVOR = 'RESOLVED_USER_FAVOR',
  
  /** Resolved in favor of agent */
  RESOLVED_AGENT_FAVOR = 'RESOLVED_AGENT_FAVOR',
  
  /** Resolved with partial refund */
  RESOLVED_PARTIAL = 'RESOLVED_PARTIAL',
  
  /** Dismissed as subjective complaint (rule 13) */
  DISMISSED_SUBJECTIVE = 'DISMISSED_SUBJECTIVE',
  
  /** Dismissed for other reasons */
  DISMISSED = 'DISMISSED',
  
  /** Withdrawn by user */
  WITHDRAWN = 'WITHDRAWN',
  
  /** Closed after resolution */
  CLOSED = 'CLOSED',
}

/**
 * Valid state transitions for DisputeState
 * Enforces admin arbitration requirement (rule 15)
 */
export const DISPUTE_STATE_TRANSITIONS: Record<DisputeState, readonly DisputeState[]> = {
  [DisputeState.OPENED]: [DisputeState.AWAITING_AGENT_RESPONSE, DisputeState.WITHDRAWN],
  [DisputeState.AWAITING_AGENT_RESPONSE]: [DisputeState.AGENT_RESPONDED, DisputeState.ESCALATED_TO_ADMIN, DisputeState.WITHDRAWN],
  [DisputeState.AGENT_RESPONDED]: [DisputeState.USER_REVIEWING, DisputeState.ESCALATED_TO_ADMIN],
  [DisputeState.USER_REVIEWING]: [DisputeState.ESCALATED_TO_ADMIN, DisputeState.WITHDRAWN, DisputeState.CLOSED],
  [DisputeState.ESCALATED_TO_ADMIN]: [DisputeState.UNDER_INVESTIGATION],
  [DisputeState.UNDER_INVESTIGATION]: [
    DisputeState.AWAITING_EVIDENCE,
    DisputeState.RESOLVED_USER_FAVOR,
    DisputeState.RESOLVED_AGENT_FAVOR,
    DisputeState.RESOLVED_PARTIAL,
    DisputeState.DISMISSED_SUBJECTIVE,
    DisputeState.DISMISSED,
  ],
  [DisputeState.AWAITING_EVIDENCE]: [DisputeState.UNDER_INVESTIGATION, DisputeState.DISMISSED],
  [DisputeState.RESOLVED_USER_FAVOR]: [DisputeState.CLOSED],
  [DisputeState.RESOLVED_AGENT_FAVOR]: [DisputeState.CLOSED],
  [DisputeState.RESOLVED_PARTIAL]: [DisputeState.CLOSED],
  [DisputeState.DISMISSED_SUBJECTIVE]: [DisputeState.CLOSED],
  [DisputeState.DISMISSED]: [DisputeState.CLOSED],
  [DisputeState.WITHDRAWN]: [DisputeState.CLOSED],
  [DisputeState.CLOSED]: [],
} as const;

/**
 * States that require admin involvement (rule 15)
 */
export const ADMIN_REQUIRED_STATES: readonly DisputeState[] = [
  DisputeState.ESCALATED_TO_ADMIN,
  DisputeState.UNDER_INVESTIGATION,
  DisputeState.AWAITING_EVIDENCE,
] as const;

/**
 * States that result in refund
 */
export const REFUND_OUTCOME_STATES: readonly DisputeState[] = [
  DisputeState.RESOLVED_USER_FAVOR,
  DisputeState.RESOLVED_PARTIAL,
] as const;

/**
 * States where dispute is considered resolved (rule 13 - subjective = no refund)
 */
export const NON_REFUNDABLE_RESOLUTION_STATES: readonly DisputeState[] = [
  DisputeState.RESOLVED_AGENT_FAVOR,
  DisputeState.DISMISSED_SUBJECTIVE,
  DisputeState.DISMISSED,
  DisputeState.WITHDRAWN,
] as const;
