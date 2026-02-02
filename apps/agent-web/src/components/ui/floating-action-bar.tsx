'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Save,
  Send,
  Eye,
  Download,
  Copy,
  Trash2,
  MoreHorizontal,
  ChevronUp,
  Loader2,
  Undo,
  Redo,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from './button';

// ============================================================================
// Types
// ============================================================================

export interface FloatingAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  shortcut?: string;
  showInCollapsed?: boolean;
}

export interface FloatingActionBarProps {
  /** Primary action (always visible, emphasized) */
  primaryAction?: FloatingAction;
  /** Secondary actions */
  actions?: FloatingAction[];
  /** Status indicator */
  status?: {
    type: 'saving' | 'saved' | 'error' | 'unsaved' | 'idle';
    message?: string;
    lastSaved?: Date | null;
  };
  /** Undo/Redo controls */
  undoRedo?: {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
  };
  /** Position */
  position?: 'bottom' | 'top';
  /** Additional class names */
  className?: string;
}

// ============================================================================
// FloatingActionBar Component
// ============================================================================

export function FloatingActionBar({
  primaryAction,
  actions = [],
  status,
  undoRedo,
  position = 'bottom',
  className,
}: FloatingActionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const barRef = useRef<HTMLDivElement>(null);

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActionClick = async (action: FloatingAction) => {
    if (action.disabled || loadingIds.has(action.id)) return;

    setLoadingIds((prev) => new Set(prev).add(action.id));
    try {
      await action.onClick();
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(action.id);
        return next;
      });
    }
  };

  const getStatusIcon = () => {
    switch (status?.type) {
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'saved':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'unsaved':
        return <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status?.type) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        if (status.lastSaved) {
          return `Saved at ${status.lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return 'Saved';
      case 'error':
        return status.message || 'Save failed';
      case 'unsaved':
        return 'Unsaved changes';
      default:
        return '';
    }
  };

  const getVariantClasses = (variant?: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white';
      case 'destructive':
        return 'bg-red-600 hover:bg-red-700 text-white';
      default:
        return 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const visibleActions = isExpanded 
    ? actions 
    : actions.filter((a) => a.showInCollapsed);

  return (
    <div
      ref={barRef}
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-40 transition-all duration-300',
        position === 'bottom' ? 'bottom-6' : 'top-20',
        className
      )}
    >
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 px-2 py-2">
        {/* Status indicator */}
        {status && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-r border-gray-200">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">{getStatusMessage()}</span>
          </div>
        )}

        {/* Undo/Redo */}
        {undoRedo && (
          <div className="flex items-center gap-1 px-2 border-r border-gray-200">
            <button
              onClick={undoRedo.onUndo}
              disabled={!undoRedo.canUndo}
              className={cn(
                'p-2 rounded-lg transition-colors',
                undoRedo.canUndo
                  ? 'hover:bg-gray-100 text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
              )}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              onClick={undoRedo.onRedo}
              disabled={!undoRedo.canRedo}
              className={cn(
                'p-2 rounded-lg transition-colors',
                undoRedo.canRedo
                  ? 'hover:bg-gray-100 text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
              )}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {visibleActions.map((action) => {
            const isLoading = loadingIds.has(action.id) || action.loading;

            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                disabled={action.disabled || isLoading}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  getVariantClasses(action.variant)
                )}
                title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  action.icon
                )}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            );
          })}

          {/* More actions toggle */}
          {actions.length > 0 && actions.some((a) => !a.showInCollapsed) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'p-2 rounded-lg hover:bg-gray-100 transition-colors',
                isExpanded && 'bg-gray-100'
              )}
              title={isExpanded ? 'Less options' : 'More options'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <MoreHorizontal className="h-4 w-4 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {/* Primary action */}
        {primaryAction && (
          <>
            <div className="w-px h-8 bg-gray-200 mx-1" />
            <button
              onClick={() => handleActionClick(primaryAction)}
              disabled={primaryAction.disabled || loadingIds.has(primaryAction.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                getVariantClasses(primaryAction.variant || 'primary')
              )}
              title={primaryAction.shortcut ? `${primaryAction.label} (${primaryAction.shortcut})` : primaryAction.label}
            >
              {loadingIds.has(primaryAction.id) || primaryAction.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                primaryAction.icon
              )}
              <span>{primaryAction.label}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Pre-configured for Itinerary Editor
// ============================================================================

export interface ItineraryFloatingBarProps {
  itineraryId?: string;
  status: 'draft' | 'submitted' | 'sent' | 'revision_requested' | string;
  // Save state
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  lastSavedAt?: Date | null;
  saveError?: Error | null;
  // Handlers
  onSave?: () => Promise<void>;
  onSubmit?: () => Promise<void>;
  onPreview?: () => void;
  onExportPDF?: () => void;
  onDuplicate?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  // Undo/Redo
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  // Other
  className?: string;
}

export function ItineraryFloatingBar({
  itineraryId,
  status,
  isSaving = false,
  hasUnsavedChanges = false,
  lastSavedAt,
  saveError,
  onSave,
  onSubmit,
  onPreview,
  onExportPDF,
  onDuplicate,
  onDelete,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  className,
}: ItineraryFloatingBarProps) {
  const isDraft = status === 'draft' || status === 'revision_requested';

  const actions: FloatingAction[] = [];

  // Save action (for drafts)
  if (onSave && isDraft) {
    actions.push({
      id: 'save',
      label: 'Save',
      icon: <Save className="h-4 w-4" />,
      onClick: onSave,
      variant: hasUnsavedChanges ? 'warning' : 'default',
      loading: isSaving,
      shortcut: '⌘S',
      showInCollapsed: true,
    });
  }

  // Preview
  if (onPreview) {
    actions.push({
      id: 'preview',
      label: 'Preview',
      icon: <Eye className="h-4 w-4" />,
      onClick: onPreview,
      showInCollapsed: true,
    });
  }

  // Export PDF
  if (onExportPDF) {
    actions.push({
      id: 'export',
      label: 'Export PDF',
      icon: <Download className="h-4 w-4" />,
      onClick: onExportPDF,
    });
  }

  // Duplicate
  if (onDuplicate) {
    actions.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="h-4 w-4" />,
      onClick: onDuplicate,
    });
  }

  // Delete
  if (onDelete) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'destructive',
    });
  }

  // Primary action: Submit
  const primaryAction: FloatingAction | undefined = onSubmit && isDraft
    ? {
        id: 'submit',
        label: 'Submit to Client',
        icon: <Send className="h-4 w-4" />,
        onClick: onSubmit,
        variant: 'success',
        shortcut: '⌘⏎',
        disabled: hasUnsavedChanges,
      }
    : undefined;

  // Determine status
  let statusType: 'saving' | 'saved' | 'error' | 'unsaved' | 'idle' = 'idle';
  if (isSaving) statusType = 'saving';
  else if (saveError) statusType = 'error';
  else if (hasUnsavedChanges) statusType = 'unsaved';
  else if (lastSavedAt) statusType = 'saved';

  return (
    <FloatingActionBar
      actions={actions}
      primaryAction={primaryAction}
      status={{
        type: statusType,
        message: saveError?.message,
        lastSaved: lastSavedAt,
      }}
      undoRedo={
        onUndo && onRedo
          ? { canUndo, canRedo, onUndo, onRedo }
          : undefined
      }
      className={className}
    />
  );
}
