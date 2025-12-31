/**
 * Dispute State Machine
 * 
 * This module enforces the dispute lifecycle state machine.
 * All state transitions MUST go through this module.
 * Invalid transitions are rejected with clear error messages.
 * Every transition emits an audit event per business rules.
 * 
 * State Machine Diagram:
 * 
 *                          ┌──────────────────┐
 *                          │ pending_evidence │
 *                          └────────┬─────────┘
 *                                   │ submit_evidence
 *                                   ▼
 *                          ┌──────────────────┐
 *       ┌─────────────────►│evidence_submitted│◄──────────────┐
 *       │                  └────────┬─────────┘               │
 *       │                           │ agent_respond           │
 *       │                           ▼                         │
 *       │                  ┌──────────────────┐               │
 *       │                  │ agent_responded  │               │
 *       │                  └────────┬─────────┘               │
 *       │                           │ admin_review            │
 *       │                           ▼                         │
 *       │                  ┌──────────────────┐               │
 *       │   ┌──────────────│under_admin_review│───────────────┤
 *       │   │              └────────┬─────────┘               │
 *       │   │ escalate              │ resolve                 │
 *       │   ▼                       ▼                         │
 *       │ ┌─────────┐    ┌─────────────────────┐              │
 *       │ │escalated│───►│resolved_refund/     │              │
 *       │ └─────────┘    │partial/denied       │              │
 *       │                └─────────────────────┘              │
 *       │                                                     │
 *       │  withdraw (from any active state)                   │
 *       │  ─────────────────────────────────►closed_withdrawn │
 *       │                                                     │
 *       │  expire (from pending/evidence_submitted)           │
 *       └──────────────────────────────────────►closed_expired│
 * 
 */

import { DisputeState } from '../types/domain.js';

/**
 * Actions that can trigger state transitions.
 */
export type DisputeAction =
  | 'submit_evidence'
  | 'agent_respond'
  | 'admin_start_review'
  | 'admin_escalate'
  | 'admin_resolve_refund'
  | 'admin_resolve_partial'
  | 'admin_resolve_denied'
  | 'traveler_withdraw'
  | 'system_expire';

/**
 * Who can perform each action.
 */
export type ActionActor = 'traveler' | 'agent' | 'admin' | 'system';

/**
 * State transition definition.
 */
interface StateTransition {
  readonly from: DisputeState;
  readonly action: DisputeAction;
  readonly to: DisputeState;
  readonly allowedActors: readonly ActionActor[];
  readonly requiresReason: boolean;
}

/**
 * All valid state transitions in the dispute lifecycle.
 * This is the source of truth for the state machine.
 */
const STATE_TRANSITIONS: readonly StateTransition[] = [
  // Evidence submission
  {
    from: 'pending_evidence',
    action: 'submit_evidence',
    to: 'evidence_submitted',
    allowedActors: ['traveler'],
    requiresReason: false,
  },

  // Agent response
  {
    from: 'evidence_submitted',
    action: 'agent_respond',
    to: 'agent_responded',
    allowedActors: ['agent'],
    requiresReason: false,
  },

  // Admin starts review (can happen from multiple states)
  {
    from: 'evidence_submitted',
    action: 'admin_start_review',
    to: 'under_admin_review',
    allowedActors: ['admin'],
    requiresReason: true,
  },
  {
    from: 'agent_responded',
    action: 'admin_start_review',
    to: 'under_admin_review',
    allowedActors: ['admin'],
    requiresReason: true,
  },

  // Escalation
  {
    from: 'under_admin_review',
    action: 'admin_escalate',
    to: 'escalated',
    allowedActors: ['admin'],
    requiresReason: true,
  },

  // Resolutions from admin review
  {
    from: 'under_admin_review',
    action: 'admin_resolve_refund',
    to: 'resolved_refund',
    allowedActors: ['admin'],
    requiresReason: true,
  },
  {
    from: 'under_admin_review',
    action: 'admin_resolve_partial',
    to: 'resolved_partial',
    allowedActors: ['admin'],
    requiresReason: true,
  },
  {
    from: 'under_admin_review',
    action: 'admin_resolve_denied',
    to: 'resolved_denied',
    allowedActors: ['admin'],
    requiresReason: true,
  },

  // Resolutions from escalated state
  {
    from: 'escalated',
    action: 'admin_resolve_refund',
    to: 'resolved_refund',
    allowedActors: ['admin'],
    requiresReason: true,
  },
  {
    from: 'escalated',
    action: 'admin_resolve_partial',
    to: 'resolved_partial',
    allowedActors: ['admin'],
    requiresReason: true,
  },
  {
    from: 'escalated',
    action: 'admin_resolve_denied',
    to: 'resolved_denied',
    allowedActors: ['admin'],
    requiresReason: true,
  },

  // Withdrawal (from any active state)
  {
    from: 'pending_evidence',
    action: 'traveler_withdraw',
    to: 'closed_withdrawn',
    allowedActors: ['traveler'],
    requiresReason: true,
  },
  {
    from: 'evidence_submitted',
    action: 'traveler_withdraw',
    to: 'closed_withdrawn',
    allowedActors: ['traveler'],
    requiresReason: true,
  },
  {
    from: 'agent_responded',
    action: 'traveler_withdraw',
    to: 'closed_withdrawn',
    allowedActors: ['traveler'],
    requiresReason: true,
  },
  {
    from: 'under_admin_review',
    action: 'traveler_withdraw',
    to: 'closed_withdrawn',
    allowedActors: ['traveler'],
    requiresReason: true,
  },

  // Expiration (from inactive states)
  {
    from: 'pending_evidence',
    action: 'system_expire',
    to: 'closed_expired',
    allowedActors: ['system'],
    requiresReason: true,
  },
  {
    from: 'evidence_submitted',
    action: 'system_expire',
    to: 'closed_expired',
    allowedActors: ['system'],
    requiresReason: true,
  },
] as const;

/**
 * Result of a transition attempt.
 */
export type TransitionResult =
  | { success: true; newState: DisputeState }
  | { success: false; error: string; code: TransitionErrorCode };

/**
 * Error codes for transition failures.
 */
export type TransitionErrorCode =
  | 'INVALID_TRANSITION'
  | 'UNAUTHORIZED_ACTOR'
  | 'REASON_REQUIRED'
  | 'ALREADY_RESOLVED'
  | 'ALREADY_CLOSED';

/**
 * Check if a state is a terminal state (no further transitions possible).
 */
export function isTerminalState(state: DisputeState): boolean {
  return [
    'resolved_refund',
    'resolved_partial',
    'resolved_denied',
    'closed_withdrawn',
    'closed_expired',
  ].includes(state);
}

/**
 * Check if a state indicates the dispute is resolved with a refund.
 */
export function isRefundState(state: DisputeState): boolean {
  return state === 'resolved_refund' || state === 'resolved_partial';
}

/**
 * Check if a state allows evidence submission.
 */
export function canSubmitEvidence(state: DisputeState): boolean {
  return state === 'pending_evidence' || state === 'evidence_submitted';
}

/**
 * Check if a state requires admin attention.
 */
export function requiresAdminAttention(state: DisputeState): boolean {
  return [
    'evidence_submitted',
    'agent_responded',
    'under_admin_review',
    'escalated',
  ].includes(state);
}

/**
 * Get all valid actions from a given state.
 */
export function getValidActions(
  currentState: DisputeState,
  actor: ActionActor
): DisputeAction[] {
  return STATE_TRANSITIONS
    .filter(
      (t) => t.from === currentState && t.allowedActors.includes(actor)
    )
    .map((t) => t.action);
}

/**
 * Get all possible next states from a given state.
 */
export function getPossibleNextStates(currentState: DisputeState): DisputeState[] {
  const states = STATE_TRANSITIONS
    .filter((t) => t.from === currentState)
    .map((t) => t.to);
  return [...new Set(states)];
}

/**
 * Find the transition definition for a given action.
 */
function findTransition(
  currentState: DisputeState,
  action: DisputeAction
): StateTransition | undefined {
  return STATE_TRANSITIONS.find(
    (t) => t.from === currentState && t.action === action
  );
}

/**
 * Attempt a state transition.
 * This is the main entry point for the state machine.
 * 
 * @param currentState - Current state of the dispute
 * @param action - Action to perform
 * @param actor - Who is performing the action
 * @param reason - Reason for the transition (required for some actions)
 * @returns Result indicating success or failure with details
 */
export function attemptTransition(
  currentState: DisputeState,
  action: DisputeAction,
  actor: ActionActor,
  reason?: string
): TransitionResult {
  // Check if already in terminal state
  if (isTerminalState(currentState)) {
    const isResolved = currentState.startsWith('resolved_');
    return {
      success: false,
      error: `Dispute is already ${isResolved ? 'resolved' : 'closed'}. No further transitions allowed.`,
      code: isResolved ? 'ALREADY_RESOLVED' : 'ALREADY_CLOSED',
    };
  }

  // Find valid transition
  const transition = findTransition(currentState, action);

  if (!transition) {
    const validActions = getValidActions(currentState, actor);
    return {
      success: false,
      error: `Invalid transition: cannot perform '${action}' from state '${currentState}'. Valid actions: ${validActions.join(', ') || 'none'}`,
      code: 'INVALID_TRANSITION',
    };
  }

  // Check actor permission
  if (!transition.allowedActors.includes(actor)) {
    return {
      success: false,
      error: `Unauthorized: '${actor}' cannot perform '${action}'. Allowed actors: ${transition.allowedActors.join(', ')}`,
      code: 'UNAUTHORIZED_ACTOR',
    };
  }

  // Check reason requirement
  if (transition.requiresReason && !reason?.trim()) {
    return {
      success: false,
      error: `Reason is required for action '${action}'`,
      code: 'REASON_REQUIRED',
    };
  }

  return {
    success: true,
    newState: transition.to,
  };
}

/**
 * Validate if a transition would be valid without performing it.
 */
export function canTransition(
  currentState: DisputeState,
  action: DisputeAction,
  actor: ActionActor
): boolean {
  const result = attemptTransition(currentState, action, actor, 'validation');
  return result.success;
}

/**
 * Get a human-readable description of the current state.
 */
export function getStateDescription(state: DisputeState): string {
  const descriptions: Record<DisputeState, string> = {
    pending_evidence: 'Awaiting evidence from traveler',
    evidence_submitted: 'Evidence received, awaiting agent response',
    agent_responded: 'Agent has responded, awaiting admin review',
    under_admin_review: 'Under review by admin',
    escalated: 'Escalated for senior review',
    resolved_refund: 'Resolved with full refund',
    resolved_partial: 'Resolved with partial refund',
    resolved_denied: 'Resolved, refund denied',
    closed_withdrawn: 'Withdrawn by traveler',
    closed_expired: 'Expired due to inactivity',
  };
  return descriptions[state];
}

/**
 * Map resolution type to the appropriate state transition action.
 */
export function resolutionToAction(
  resolution: 'full_refund' | 'partial_refund' | 'credit_issued' | 'no_refund_objective' | 'no_refund_subjective'
): DisputeAction {
  switch (resolution) {
    case 'full_refund':
      return 'admin_resolve_refund';
    case 'partial_refund':
    case 'credit_issued':
      return 'admin_resolve_partial';
    case 'no_refund_objective':
    case 'no_refund_subjective':
      return 'admin_resolve_denied';
  }
}

/**
 * Export the transitions for documentation purposes.
 */
export function getTransitionDocs(): readonly StateTransition[] {
  return STATE_TRANSITIONS;
}
