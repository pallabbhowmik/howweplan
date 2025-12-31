/**
 * Status Badge Component
 * 
 * Consistent status display across the admin UI.
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type StatusVariant = 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'neutral'
  | 'pending';

interface StatusBadgeProps {
  readonly status: string;
  readonly variant?: StatusVariant;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

// ============================================================================
// STATUS MAPPINGS
// ============================================================================

const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  // Agent statuses
  pending_approval: 'pending',
  approved: 'success',
  suspended: 'error',
  rejected: 'error',
  deactivated: 'neutral',
  
  // Dispute statuses
  opened: 'warning',
  under_review: 'info',
  pending_user_response: 'pending',
  pending_agent_response: 'pending',
  resolved_user_favor: 'success',
  resolved_agent_favor: 'success',
  resolved_partial: 'info',
  closed_no_action: 'neutral',
  
  // Refund statuses
  pending_review: 'pending',
  processing: 'info',
  completed: 'success',
  failed: 'error',
  
  // Matching override statuses
  active: 'success',
  expired: 'neutral',
  cancelled: 'neutral',
  
  // Audit severities
  info: 'info',
  warning: 'warning',
  critical: 'error',
};

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const SIZE_STYLES: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function StatusBadge({
  status,
  variant,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? STATUS_VARIANT_MAP[status] ?? 'neutral';
  const displayStatus = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        VARIANT_STYLES[resolvedVariant],
        SIZE_STYLES[size],
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          resolvedVariant === 'success' && 'bg-green-500',
          resolvedVariant === 'warning' && 'bg-yellow-500',
          resolvedVariant === 'error' && 'bg-red-500',
          resolvedVariant === 'info' && 'bg-blue-500',
          resolvedVariant === 'neutral' && 'bg-gray-500',
          resolvedVariant === 'pending' && 'bg-orange-500 animate-pulse'
        )}
      />
      {displayStatus}
    </span>
  );
}
