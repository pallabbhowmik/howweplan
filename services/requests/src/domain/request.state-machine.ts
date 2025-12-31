/**
 * Request State Machine
 * 
 * Defines the valid states and transitions for travel requests.
 * Enforces business rules around state transitions.
 * Every transition is validated before execution.
 */

/**
 * All possible states for a travel request.
 * 
 * Lifecycle:
 * draft -> submitted -> matching -> matched -> completed
 *                    \-> expired
 *       \-> cancelled (from any non-terminal state)
 */
export type RequestState =
  | 'draft'           // User created but not yet submitted
  | 'submitted'       // User submitted, awaiting agent matching
  | 'matching'        // System is actively finding agents
  | 'matched'         // At least one agent has been matched (external state change)
  | 'expired'         // No agents matched within time limit
  | 'cancelled'       // User or admin cancelled
  | 'completed';      // Successfully completed (booking made)

/**
 * Valid state transitions map
 * Key: current state
 * Value: array of valid next states
 */
const STATE_TRANSITIONS: Record<RequestState, RequestState[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['matching', 'cancelled', 'expired'],
  matching: ['matched', 'cancelled', 'expired'],
  matched: ['completed', 'cancelled'],  // matched is controlled by matching service
  expired: [],                           // terminal state
  cancelled: [],                         // terminal state
  completed: [],                         // terminal state
};

/**
 * Check if a transition from one state to another is valid
 */
export function isValidTransition(
  fromState: RequestState,
  toState: RequestState
): boolean {
  const validNextStates = STATE_TRANSITIONS[fromState];
  return validNextStates.includes(toState);
}

/**
 * Get all valid transitions from a given state
 */
export function getValidTransitions(state: RequestState): RequestState[] {
  return STATE_TRANSITIONS[state];
}

/**
 * Check if a state is terminal (no further transitions possible)
 */
export function isTerminal(state: RequestState): boolean {
  return STATE_TRANSITIONS[state].length === 0;
}

/**
 * Transition trigger types for audit purposes
 */
export type TransitionTrigger =
  | 'user_action'
  | 'system_auto'
  | 'admin_action'
  | 'external_event';

/**
 * State transition request with context
 */
export interface StateTransitionRequest {
  readonly requestId: string;
  readonly fromState: RequestState;
  readonly toState: RequestState;
  readonly trigger: TransitionTrigger;
  readonly triggeredBy: string;  // userId or 'system'
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * State transition result
 */
export type StateTransitionResult =
  | { success: true; newState: RequestState }
  | { success: false; error: StateTransitionError };

export interface StateTransitionError {
  readonly code: StateTransitionErrorCode;
  readonly message: string;
  readonly fromState: RequestState;
  readonly toState: RequestState;
}

export type StateTransitionErrorCode =
  | 'INVALID_TRANSITION'
  | 'TERMINAL_STATE'
  | 'PRECONDITION_FAILED';

/**
 * Validate and execute a state transition
 */
export function validateTransition(
  request: StateTransitionRequest
): StateTransitionResult {
  const { fromState, toState } = request;

  // Check if current state is terminal
  if (isTerminal(fromState)) {
    return {
      success: false,
      error: {
        code: 'TERMINAL_STATE',
        message: `Cannot transition from terminal state '${fromState}'`,
        fromState,
        toState,
      },
    };
  }

  // Check if transition is valid
  if (!isValidTransition(fromState, toState)) {
    return {
      success: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `Invalid transition from '${fromState}' to '${toState}'. Valid transitions: ${getValidTransitions(fromState).join(', ') || 'none'}`,
        fromState,
        toState,
      },
    };
  }

  return {
    success: true,
    newState: toState,
  };
}

/**
 * Human-readable state labels for UI
 */
export const STATE_LABELS: Record<RequestState, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  matching: 'Finding Agents',
  matched: 'Agent Matched',
  expired: 'Expired',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

/**
 * States that count toward "open requests" limit
 */
export const OPEN_REQUEST_STATES: RequestState[] = [
  'draft',
  'submitted',
  'matching',
  'matched',
];

/**
 * States that count toward "daily cap"
 * (requests created today, regardless of current state)
 */
export const DAILY_CAP_COUNTED_STATES: RequestState[] = [
  'draft',
  'submitted',
  'matching',
  'matched',
  'completed',
];
