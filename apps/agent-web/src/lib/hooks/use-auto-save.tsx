'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UndoableState<T> {
  current: T;
  history: T[];
  future: T[];
}

export interface UseAutoSaveOptions<T> {
  /** Initial data */
  initialData: T;
  /** Save function */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number;
  /** Max history items for undo (default: 50) */
  maxHistoryItems?: number;
  /** Enable auto-save (default: true) */
  enabled?: boolean;
  /** Called when save starts */
  onSaveStart?: () => void;
  /** Called when save completes */
  onSaveComplete?: () => void;
  /** Called on save error */
  onSaveError?: (error: Error) => void;
}

export interface UseAutoSaveReturn<T> {
  /** Current data state */
  data: T;
  /** Update data (triggers auto-save) */
  setData: (updater: T | ((prev: T) => T)) => void;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Whether currently saving */
  isSaving: boolean;
  /** Last saved timestamp */
  lastSavedAt: Date | null;
  /** Save error if any */
  saveError: Error | null;
  /** Force save now */
  saveNow: () => Promise<void>;
  /** Undo last change */
  undo: () => void;
  /** Redo last undone change */
  redo: () => void;
  /** Can undo */
  canUndo: boolean;
  /** Can redo */
  canRedo: boolean;
  /** Reset to initial state */
  reset: () => void;
  /** Discard unsaved changes */
  discardChanges: () => void;
}

// ============================================================================
// useAutoSave Hook
// ============================================================================

export function useAutoSave<T>({
  initialData,
  onSave,
  debounceMs = 2000,
  maxHistoryItems = 50,
  enabled = true,
  onSaveStart,
  onSaveComplete,
  onSaveError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [state, setState] = useState<UndoableState<T>>({
    current: initialData,
    history: [],
    future: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [lastSavedData, setLastSavedData] = useState<T>(initialData);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Check for unsaved changes
  const hasUnsavedChanges = JSON.stringify(state.current) !== JSON.stringify(lastSavedData);

  // Save function
  const performSave = useCallback(async (dataToSave: T) => {
    if (!isMountedRef.current) return;

    setIsSaving(true);
    setSaveError(null);
    onSaveStart?.();

    try {
      await onSave(dataToSave);
      if (!isMountedRef.current) return;

      setLastSavedData(dataToSave);
      setLastSavedAt(new Date());
      onSaveComplete?.();
    } catch (error) {
      if (!isMountedRef.current) return;

      const err = error instanceof Error ? error : new Error(String(error));
      setSaveError(err);
      onSaveError?.(err);
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [onSave, onSaveStart, onSaveComplete, onSaveError]);

  // Schedule auto-save
  const scheduleAutoSave = useCallback((data: T) => {
    if (!enabled) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      performSave(data);
    }, debounceMs);
  }, [enabled, debounceMs, performSave]);

  // Update data
  const setData = useCallback((updater: T | ((prev: T) => T)) => {
    setState((prev) => {
      const newData = typeof updater === 'function' 
        ? (updater as (prev: T) => T)(prev.current)
        : updater;

      // Add current state to history
      const newHistory = [...prev.history, prev.current].slice(-maxHistoryItems);

      return {
        current: newData,
        history: newHistory,
        future: [], // Clear redo stack on new change
      };
    });
  }, [maxHistoryItems]);

  // Effect to trigger auto-save when data changes
  useEffect(() => {
    if (hasUnsavedChanges && enabled) {
      scheduleAutoSave(state.current);
    }
  }, [state.current, hasUnsavedChanges, enabled, scheduleAutoSave]);

  // Undo
  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;

      const newHistory = [...prev.history];
      const previousState = newHistory.pop()!;

      return {
        current: previousState,
        history: newHistory,
        future: [prev.current, ...prev.future],
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;

      const newFuture = [...prev.future];
      const nextState = newFuture.shift()!;

      return {
        current: nextState,
        history: [...prev.history, prev.current],
        future: newFuture,
      };
    });
  }, []);

  // Save now
  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave(state.current);
  }, [performSave, state.current]);

  // Reset
  const reset = useCallback(() => {
    setState({
      current: initialData,
      history: [],
      future: [],
    });
    setLastSavedData(initialData);
  }, [initialData]);

  // Discard changes
  const discardChanges = useCallback(() => {
    setState((prev) => ({
      ...prev,
      current: lastSavedData,
      future: [],
    }));
  }, [lastSavedData]);

  return {
    data: state.current,
    setData,
    hasUnsavedChanges,
    isSaving,
    lastSavedAt,
    saveError,
    saveNow,
    undo,
    redo,
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,
    reset,
    discardChanges,
  };
}

// ============================================================================
// AutoSave Status Indicator Component
// ============================================================================

export interface AutoSaveIndicatorProps {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  saveError: Error | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSaveNow?: () => void;
  className?: string;
}

export function AutoSaveIndicator({
  isSaving,
  hasUnsavedChanges,
  lastSavedAt,
  saveError,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveNow,
  className,
}: AutoSaveIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex items-center gap-3 text-sm ${className || ''}`}>
      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        {isSaving ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-600">Saving...</span>
          </>
        ) : saveError ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            <span className="text-red-600">Save failed</span>
            {onSaveNow && (
              <button
                onClick={onSaveNow}
                className="ml-1 text-red-700 underline hover:no-underline"
              >
                Retry
              </button>
            )}
          </>
        ) : hasUnsavedChanges ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-blue-600">Unsaved changes</span>
          </>
        ) : lastSavedAt ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-gray-500">Saved at {formatTime(lastSavedAt)}</span>
          </>
        ) : (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
            <span className="text-gray-400">No changes</span>
          </>
        )}
      </div>

      {/* Undo/Redo buttons */}
      <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
