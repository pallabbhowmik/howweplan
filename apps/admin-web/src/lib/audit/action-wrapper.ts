/**
 * Admin Action Wrapper
 * 
 * CRITICAL: All admin actions MUST go through this wrapper.
 * This ensures:
 * 1. Reason is always required and validated
 * 2. Correlation ID is generated for tracing
 * 3. Audit events are emitted
 * 4. Actions are type-safe
 */

import type { AdminActionBase, AdminAction, AdminActionType } from '@/types';
import { assertValidReason } from '@/types';

// ============================================================================
// ACTION CONTEXT
// ============================================================================

export interface AdminActionContext {
  readonly adminId: string;
  readonly adminEmail: string;
  readonly sessionId: string;
}

// ============================================================================
// ACTION BUILDER
// ============================================================================

export interface ActionBuilderResult<T extends AdminAction> {
  readonly action: T;
  readonly correlationId: string;
}

/**
 * Creates the base properties for any admin action.
 * Validates reason and generates correlation ID.
 */
export function createActionBase(
  context: AdminActionContext,
  reason: string
): Omit<AdminActionBase, 'type'> {
  // ENFORCE: Reason is required and must be meaningful
  assertValidReason(reason);

  return {
    adminId: context.adminId,
    reason: reason.trim(),
    timestamp: new Date().toISOString(),
    correlationId: generateCorrelationId(),
  };
}

/**
 * Generates a unique correlation ID for tracing.
 * Format: admin-{timestamp}-{random}
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `admin-${timestamp}-${random}`;
}

// ============================================================================
// ACTION TYPE MAP
// ============================================================================

/**
 * Maps action types to their human-readable descriptions.
 * Used in audit logs and UI.
 */
export const ACTION_DESCRIPTIONS: Record<AdminActionType, string> = {
  // Agent actions
  AGENT_APPROVE: 'Approved agent application',
  AGENT_SUSPEND: 'Suspended agent account',
  AGENT_REACTIVATE: 'Reactivated agent account',
  AGENT_REJECT: 'Rejected agent application',
  
  // Matching actions
  MATCHING_OVERRIDE_CREATE: 'Created matching override',
  MATCHING_OVERRIDE_CANCEL: 'Cancelled matching override',
  
  // Dispute actions
  DISPUTE_UPDATE_STATUS: 'Updated dispute status',
  DISPUTE_ADD_NOTE: 'Added note to dispute',
  DISPUTE_RESOLVE: 'Resolved dispute',
  
  // Refund actions
  REFUND_APPROVE: 'Approved refund request',
  REFUND_REJECT: 'Rejected refund request',
  REFUND_TRIGGER: 'Triggered manual refund',
} as const;

// ============================================================================
// SEVERITY MAPPING
// ============================================================================

/**
 * Maps action types to audit severity levels.
 */
export const ACTION_SEVERITY: Record<AdminActionType, 'info' | 'warning' | 'critical'> = {
  // Agent actions
  AGENT_APPROVE: 'info',
  AGENT_SUSPEND: 'warning',
  AGENT_REACTIVATE: 'info',
  AGENT_REJECT: 'warning',
  
  // Matching actions
  MATCHING_OVERRIDE_CREATE: 'warning',
  MATCHING_OVERRIDE_CANCEL: 'info',
  
  // Dispute actions
  DISPUTE_UPDATE_STATUS: 'info',
  DISPUTE_ADD_NOTE: 'info',
  DISPUTE_RESOLVE: 'warning',
  
  // Refund actions
  REFUND_APPROVE: 'warning',
  REFUND_REJECT: 'warning',
  REFUND_TRIGGER: 'critical',
} as const;

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

/**
 * Maps action types to audit categories.
 */
export function getActionCategory(actionType: AdminActionType): string {
  if (actionType.startsWith('AGENT_')) return 'agent_management';
  if (actionType.startsWith('MATCHING_')) return 'matching';
  if (actionType.startsWith('DISPUTE_')) return 'dispute';
  if (actionType.startsWith('REFUND_')) return 'refund';
  return 'system';
}
