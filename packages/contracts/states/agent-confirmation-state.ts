/**
 * Agent Confirmation State Machine
 * Defines the lifecycle of agent confirmation for a request
 * 
 * Constitution rules enforced:
 * - Rule 9: Agents are semi-blind pre-confirmation (first name + photo only)
 * - Rule 10: Full agent identity revealed ONLY after agent confirmation
 * - Rule 16: Peak-season agent scarcity is expected
 */

export enum AgentConfirmationState {
  /** Agent has been matched but not yet notified */
  PENDING = 'PENDING',
  
  /** Agent has been notified of the request */
  NOTIFIED = 'NOTIFIED',
  
  /** Agent is reviewing the request */
  REVIEWING = 'REVIEWING',
  
  /** Agent has confirmed interest - identity can be revealed (rule 10) */
  CONFIRMED = 'CONFIRMED',
  
  /** Agent has declined the request */
  DECLINED = 'DECLINED',
  
  /** Agent did not respond in time (rule 16 - scarcity handling) */
  TIMED_OUT = 'TIMED_OUT',
  
  /** Agent was unmatched by system or admin */
  UNMATCHED = 'UNMATCHED',
  
  /** Agent was selected by user */
  SELECTED = 'SELECTED',
  
  /** Agent was not selected (another agent was chosen) */
  NOT_SELECTED = 'NOT_SELECTED',
}

/**
 * Valid state transitions for AgentConfirmationState
 */
export const AGENT_CONFIRMATION_STATE_TRANSITIONS: Record<AgentConfirmationState, readonly AgentConfirmationState[]> = {
  [AgentConfirmationState.PENDING]: [AgentConfirmationState.NOTIFIED, AgentConfirmationState.UNMATCHED],
  [AgentConfirmationState.NOTIFIED]: [AgentConfirmationState.REVIEWING, AgentConfirmationState.DECLINED, AgentConfirmationState.TIMED_OUT],
  [AgentConfirmationState.REVIEWING]: [AgentConfirmationState.CONFIRMED, AgentConfirmationState.DECLINED, AgentConfirmationState.TIMED_OUT],
  [AgentConfirmationState.CONFIRMED]: [AgentConfirmationState.SELECTED, AgentConfirmationState.NOT_SELECTED, AgentConfirmationState.UNMATCHED],
  [AgentConfirmationState.DECLINED]: [],
  [AgentConfirmationState.TIMED_OUT]: [],
  [AgentConfirmationState.UNMATCHED]: [],
  [AgentConfirmationState.SELECTED]: [],
  [AgentConfirmationState.NOT_SELECTED]: [],
} as const;
