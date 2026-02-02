'use client';

import { useState, useRef, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  FileText,
  Zap,
  ChevronDown,
  Loader2,
  Send,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Badge } from './badge';

// ============================================================================
// Types
// ============================================================================

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  shortcut?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void | Promise<void>;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

// ============================================================================
// QuickActions Component
// ============================================================================

export function QuickActions({
  actions,
  orientation = 'horizontal',
  size = 'md',
  showLabels = true,
  className,
}: QuickActionsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleClick = async (action: QuickAction) => {
    if (action.disabled || action.loading || loadingId) return;
    
    setLoadingId(action.id);
    try {
      await action.onClick();
    } finally {
      setLoadingId(null);
    }
  };

  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200';
      case 'destructive':
        return 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs gap-1.5',
    md: 'h-9 px-3 text-sm gap-2',
    lg: 'h-10 px-4 text-sm gap-2.5',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={cn(
        'flex gap-2',
        orientation === 'vertical' && 'flex-col',
        className
      )}
    >
      {actions.map((action) => {
        const isLoading = loadingId === action.id || action.loading;
        const isDisabled = action.disabled || !!loadingId;

        return (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            disabled={isDisabled}
            className={cn(
              'inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              sizeClasses[size],
              getVariantClasses(action.variant)
            )}
            title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
          >
            {isLoading ? (
              <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
            ) : (
              <span className={iconSizes[size]}>{action.icon}</span>
            )}
            {showLabels && <span>{action.label}</span>}
            {action.shortcut && !showLabels && (
              <kbd className="ml-1 text-[10px] opacity-60 bg-white/50 px-1 rounded">
                {action.shortcut}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// RequestQuickActions - Pre-configured for request handling
// ============================================================================

export interface RequestQuickActionsProps {
  requestId: string;
  status: 'pending' | 'accepted' | 'declined' | string;
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<void>;
  onMessage?: () => void;
  onCreateItinerary?: () => void;
  onViewDetails?: () => void;
  busy?: boolean;
  className?: string;
}

export function RequestQuickActions({
  requestId,
  status,
  onAccept,
  onDecline,
  onMessage,
  onCreateItinerary,
  onViewDetails,
  busy = false,
  className,
}: RequestQuickActionsProps) {
  const actions: QuickAction[] = [];

  if (status === 'pending') {
    if (onAccept) {
      actions.push({
        id: 'accept',
        label: 'Accept',
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'success',
        shortcut: 'A',
        disabled: busy,
        onClick: onAccept,
      });
    }
    if (onDecline) {
      actions.push({
        id: 'decline',
        label: 'Decline',
        icon: <XCircle className="h-4 w-4" />,
        variant: 'destructive',
        shortcut: 'D',
        disabled: busy,
        onClick: onDecline,
      });
    }
  }

  if (status === 'accepted' && onCreateItinerary) {
    actions.push({
      id: 'create-itinerary',
      label: 'Create Itinerary',
      icon: <FileText className="h-4 w-4" />,
      variant: 'default',
      shortcut: 'I',
      onClick: onCreateItinerary,
    });
  }

  if (onMessage) {
    actions.push({
      id: 'message',
      label: 'Message',
      icon: <MessageSquare className="h-4 w-4" />,
      shortcut: 'M',
      onClick: onMessage,
    });
  }

  if (onViewDetails) {
    actions.push({
      id: 'details',
      label: 'Details',
      icon: <ExternalLink className="h-4 w-4" />,
      shortcut: 'V',
      onClick: onViewDetails,
    });
  }

  return <QuickActions actions={actions} className={className} />;
}

// ============================================================================
// ItineraryQuickActions - Pre-configured for itinerary handling
// ============================================================================

export interface ItineraryQuickActionsProps {
  itineraryId: string;
  status: 'draft' | 'submitted' | 'sent' | 'approved' | 'revision_requested' | string;
  onSave?: () => Promise<void>;
  onSubmit?: () => Promise<void>;
  onDuplicate?: () => Promise<void>;
  onExport?: () => void;
  onPreview?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  className?: string;
}

export function ItineraryQuickActions({
  itineraryId,
  status,
  onSave,
  onSubmit,
  onDuplicate,
  onExport,
  onPreview,
  isSaving = false,
  hasUnsavedChanges = false,
  className,
}: ItineraryQuickActionsProps) {
  const actions: QuickAction[] = [];

  if (onSave && (status === 'draft' || status === 'revision_requested')) {
    actions.push({
      id: 'save',
      label: hasUnsavedChanges ? 'Save Changes' : 'Saved',
      icon: hasUnsavedChanges ? <Zap className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />,
      variant: hasUnsavedChanges ? 'warning' : 'success',
      shortcut: '⌘S',
      loading: isSaving,
      disabled: !hasUnsavedChanges && !isSaving,
      onClick: onSave,
    });
  }

  if (onSubmit && (status === 'draft' || status === 'revision_requested')) {
    actions.push({
      id: 'submit',
      label: 'Submit to Client',
      icon: <Send className="h-4 w-4" />,
      variant: 'success',
      shortcut: '⌘⏎',
      onClick: onSubmit,
    });
  }

  if (onPreview) {
    actions.push({
      id: 'preview',
      label: 'Preview',
      icon: <ExternalLink className="h-4 w-4" />,
      shortcut: 'P',
      onClick: onPreview,
    });
  }

  if (onDuplicate) {
    actions.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="h-4 w-4" />,
      onClick: onDuplicate,
    });
  }

  if (onExport) {
    actions.push({
      id: 'export',
      label: 'Export PDF',
      icon: <FileText className="h-4 w-4" />,
      onClick: onExport,
    });
  }

  return <QuickActions actions={actions} className={className} />;
}
