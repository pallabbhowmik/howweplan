'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  FileText,
  Send,
  CreditCard,
  Plane,
  Star,
  XCircle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type WorkflowStatus = 
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'draft'
  | 'submitted'
  | 'sent'
  | 'revision_requested'
  | 'approved'
  | 'payment_pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WorkflowStep {
  id: string;
  label: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming' | 'skipped' | 'error';
  timestamp?: string;
  icon?: React.ReactNode;
}

export interface StatusProgressTrackerProps {
  workflow: 'request' | 'itinerary' | 'booking';
  currentStatus: WorkflowStatus | string;
  className?: string;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
  compact?: boolean;
}

// ============================================================================
// Workflow Definitions
// ============================================================================

const REQUEST_WORKFLOW: Omit<WorkflowStep, 'status'>[] = [
  { id: 'matched', label: 'Matched', description: 'Request matched to you', icon: <Clock className="h-4 w-4" /> },
  { id: 'accepted', label: 'Accepted', description: 'You accepted the request', icon: <CheckCircle className="h-4 w-4" /> },
  { id: 'itinerary', label: 'Itinerary', description: 'Create and send itinerary', icon: <FileText className="h-4 w-4" /> },
  { id: 'approved', label: 'Approved', description: 'Client approved itinerary', icon: <Star className="h-4 w-4" /> },
];

const ITINERARY_WORKFLOW: Omit<WorkflowStep, 'status'>[] = [
  { id: 'draft', label: 'Draft', description: 'Creating itinerary', icon: <FileText className="h-4 w-4" /> },
  { id: 'submitted', label: 'Submitted', description: 'Sent to client', icon: <Send className="h-4 w-4" /> },
  { id: 'review', label: 'Review', description: 'Client reviewing', icon: <Clock className="h-4 w-4" /> },
  { id: 'approved', label: 'Approved', description: 'Client approved', icon: <CheckCircle className="h-4 w-4" /> },
];

const BOOKING_WORKFLOW: Omit<WorkflowStep, 'status'>[] = [
  { id: 'approved', label: 'Approved', description: 'Itinerary approved', icon: <CheckCircle className="h-4 w-4" /> },
  { id: 'payment', label: 'Payment', description: 'Awaiting payment', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'confirmed', label: 'Confirmed', description: 'Booking confirmed', icon: <CheckCircle className="h-4 w-4" /> },
  { id: 'travel', label: 'Travel', description: 'Trip in progress', icon: <Plane className="h-4 w-4" /> },
  { id: 'completed', label: 'Completed', description: 'Trip completed', icon: <Star className="h-4 w-4" /> },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getWorkflowSteps(workflow: 'request' | 'itinerary' | 'booking'): Omit<WorkflowStep, 'status'>[] {
  switch (workflow) {
    case 'request':
      return REQUEST_WORKFLOW;
    case 'itinerary':
      return ITINERARY_WORKFLOW;
    case 'booking':
      return BOOKING_WORKFLOW;
    default:
      return [];
  }
}

function getCurrentStepIndex(workflow: 'request' | 'itinerary' | 'booking', status: string): number {
  const statusMapping: Record<string, Record<string, number>> = {
    request: {
      pending: 0,
      accepted: 1,
      declined: -1,
      expired: -1,
      draft: 2,
      submitted: 2,
      sent: 2,
      revision_requested: 2,
      approved: 3,
    },
    itinerary: {
      draft: 0,
      submitted: 1,
      sent: 1,
      revision_requested: 2,
      approved: 3,
      completed: 3,
    },
    booking: {
      approved: 0,
      payment_pending: 1,
      confirmed: 2,
      in_progress: 3,
      completed: 4,
    },
  };

  return statusMapping[workflow]?.[status] ?? 0;
}

function isErrorStatus(status: string): boolean {
  return ['declined', 'expired', 'cancelled'].includes(status);
}

// ============================================================================
// StatusProgressTracker Component
// ============================================================================

export function StatusProgressTracker({
  workflow,
  currentStatus,
  className,
  showLabels = true,
  orientation = 'horizontal',
  compact = false,
}: StatusProgressTrackerProps) {
  const steps = useMemo(() => {
    const baseSteps = getWorkflowSteps(workflow);
    const currentIndex = getCurrentStepIndex(workflow, currentStatus);
    const hasError = isErrorStatus(currentStatus);

    return baseSteps.map((step, index): WorkflowStep => {
      let status: WorkflowStep['status'] = 'upcoming';

      if (hasError) {
        if (index <= Math.max(currentIndex, 0)) {
          status = index === Math.max(currentIndex, 0) ? 'error' : 'completed';
        }
      } else if (index < currentIndex) {
        status = 'completed';
      } else if (index === currentIndex) {
        status = 'current';
      }

      return {
        ...step,
        status,
      };
    });
  }, [workflow, currentStatus]);

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={cn(
        'w-full',
        isHorizontal ? 'overflow-x-auto' : '',
        className
      )}
    >
      <div
        className={cn(
          'flex',
          isHorizontal ? 'items-start gap-2 min-w-max' : 'flex-col gap-4',
          compact && 'gap-1'
        )}
      >
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex',
              isHorizontal ? 'flex-col items-center' : 'items-start gap-4',
              isHorizontal && !compact && 'min-w-[100px]'
            )}
          >
            {/* Step with connector */}
            <div className={cn('flex items-center', isHorizontal ? 'w-full' : 'flex-col')}>
              {/* Connector line (before) */}
              {index > 0 && (
                <div
                  className={cn(
                    'transition-colors duration-300',
                    isHorizontal ? 'flex-1 h-0.5' : 'w-0.5 h-8',
                    step.status === 'completed' || step.status === 'current' || step.status === 'error'
                      ? step.status === 'error'
                        ? 'bg-red-300'
                        : 'bg-blue-500'
                      : 'bg-gray-200'
                  )}
                />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  'relative flex items-center justify-center rounded-full transition-all duration-300',
                  compact ? 'h-6 w-6' : 'h-10 w-10',
                  step.status === 'completed' && 'bg-blue-500 text-white',
                  step.status === 'current' && 'bg-blue-100 text-blue-600 ring-4 ring-blue-50',
                  step.status === 'upcoming' && 'bg-gray-100 text-gray-400',
                  step.status === 'error' && 'bg-red-100 text-red-600',
                  step.status === 'skipped' && 'bg-gray-50 text-gray-300'
                )}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className={compact ? 'h-3 w-3' : 'h-5 w-5'} />
                ) : step.status === 'error' ? (
                  <XCircle className={compact ? 'h-3 w-3' : 'h-5 w-5'} />
                ) : step.status === 'current' ? (
                  <span className="relative">
                    {step.icon || <Circle className={compact ? 'h-3 w-3' : 'h-5 w-5'} />}
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  </span>
                ) : (
                  step.icon || <Circle className={compact ? 'h-3 w-3' : 'h-5 w-5'} />
                )}
              </div>

              {/* Connector line (after) */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'transition-colors duration-300',
                    isHorizontal ? 'flex-1 h-0.5' : 'w-0.5 h-8',
                    step.status === 'completed'
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  )}
                />
              )}
            </div>

            {/* Labels */}
            {showLabels && !compact && (
              <div
                className={cn(
                  isHorizontal ? 'mt-2 text-center' : 'flex-1',
                  'min-w-0'
                )}
              >
                <p
                  className={cn(
                    'text-sm font-medium truncate',
                    step.status === 'completed' && 'text-blue-600',
                    step.status === 'current' && 'text-blue-700',
                    step.status === 'upcoming' && 'text-gray-500',
                    step.status === 'error' && 'text-red-600'
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p
                    className={cn(
                      'text-xs mt-0.5 truncate',
                      step.status === 'current' ? 'text-blue-500' : 'text-gray-400'
                    )}
                  >
                    {step.description}
                  </p>
                )}
                {step.timestamp && (
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(step.timestamp).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Mini Status Badge - Compact inline status display
// ============================================================================

export interface MiniStatusBadgeProps {
  status: WorkflowStatus | string;
  workflow?: 'request' | 'itinerary' | 'booking';
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIGS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="h-3 w-3" /> },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3 w-3" /> },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: <FileText className="h-3 w-3" /> },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-3 w-3" /> },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-3 w-3" /> },
  revision_requested: { label: 'Revision', color: 'bg-amber-100 text-amber-700', icon: <AlertCircle className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  payment_pending: { label: 'Awaiting Payment', color: 'bg-amber-100 text-amber-700', icon: <CreditCard className="h-3 w-3" /> },
  confirmed: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: <Plane className="h-3 w-3" /> },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: <Star className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
};

export function MiniStatusBadge({
  status,
  showLabel = true,
  className,
}: MiniStatusBadgeProps) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.pending;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.color,
        className
      )}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
