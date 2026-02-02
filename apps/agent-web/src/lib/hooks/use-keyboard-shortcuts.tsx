'use client';

import { useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type KeyCombo = string | readonly string[] | string[];

/** Helper to normalize KeyCombo to a readonly string array */
function toKeyArray(keys: KeyCombo): readonly string[] {
  if (typeof keys === 'string') {
    return [keys];
  }
  return keys;
}

/** Helper to get first key combo as string */
function getFirstCombo(keys: KeyCombo): string {
  if (typeof keys === 'string') {
    return keys;
  }
  return keys[0];
}

export interface KeyboardShortcut {
  /** Unique identifier */
  id: string;
  /** Key combination(s) - e.g., 'ctrl+s', 'meta+s', ['ctrl+s', 'meta+s'] */
  keys: KeyCombo;
  /** Handler function */
  handler: (e: KeyboardEvent) => void;
  /** Description for display purposes */
  description?: string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether to stop propagation */
  stopPropagation?: boolean;
  /** Only trigger when a specific element is focused (CSS selector) */
  when?: string;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  /** List of shortcuts to register */
  shortcuts: KeyboardShortcut[];
  /** Enable/disable all shortcuts */
  enabled?: boolean;
  /** Scope for shortcuts (useful for modal/dialog contexts) */
  scope?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    control: 'ctrl',
    command: 'meta',
    cmd: 'meta',
    option: 'alt',
    return: 'enter',
    escape: 'esc',
    ' ': 'space',
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right',
  };
  return keyMap[key.toLowerCase()] || key.toLowerCase();
}

function parseKeyCombo(combo: string): { modifiers: Set<string>; key: string } {
  const parts = combo.toLowerCase().split('+').map((p) => p.trim());
  const modifiers = new Set<string>();
  let mainKey = '';

  for (const part of parts) {
    const normalized = normalizeKey(part);
    if (['ctrl', 'alt', 'shift', 'meta'].includes(normalized)) {
      modifiers.add(normalized);
    } else {
      mainKey = normalized;
    }
  }

  return { modifiers, key: mainKey };
}

function matchesKeyCombo(e: KeyboardEvent, combo: string): boolean {
  const { modifiers, key } = parseKeyCombo(combo);
  
  const pressedKey = normalizeKey(e.key);
  
  if (pressedKey !== key) return false;
  
  const ctrlMatch = modifiers.has('ctrl') === e.ctrlKey;
  const altMatch = modifiers.has('alt') === e.altKey;
  const shiftMatch = modifiers.has('shift') === e.shiftKey;
  const metaMatch = modifiers.has('meta') === e.metaKey;
  
  return ctrlMatch && altMatch && shiftMatch && metaMatch;
}

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  
  const tagName = element.tagName?.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }
  
  return false;
}

// ============================================================================
// useKeyboardShortcuts Hook
// ============================================================================

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in an editable element (unless the shortcut specifically handles it)
      const isEditable = isEditableElement(document.activeElement);
      
      for (const shortcut of shortcutsRef.current) {
        // Check if shortcut is enabled
        if (shortcut.enabled === false) continue;
        
        // Check scope/when condition
        if (shortcut.when) {
          const matchingElement = document.querySelector(shortcut.when);
          if (!matchingElement?.contains(document.activeElement) && 
              document.activeElement !== matchingElement) {
            continue;
          }
        }
        
        // Get key combinations as string array
        const keyCombos = toKeyArray(shortcut.keys);
        
        // Check if any combo matches
        const matches = keyCombos.some((combo) => matchesKeyCombo(e, combo));
        
        if (matches) {
          // For common shortcuts in editable elements, only prevent if explicitly needed
          if (isEditable && !shortcut.preventDefault) {
            continue;
          }
          
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          if (shortcut.stopPropagation) {
            e.stopPropagation();
          }
          
          shortcut.handler(e);
          return; // Only trigger one shortcut per keypress
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

// ============================================================================
// Common Shortcut Presets
// ============================================================================

export const COMMON_SHORTCUTS = {
  SAVE: ['ctrl+s', 'meta+s'],
  UNDO: ['ctrl+z', 'meta+z'],
  REDO: ['ctrl+shift+z', 'meta+shift+z', 'ctrl+y', 'meta+y'],
  COPY: ['ctrl+c', 'meta+c'],
  PASTE: ['ctrl+v', 'meta+v'],
  CUT: ['ctrl+x', 'meta+x'],
  SELECT_ALL: ['ctrl+a', 'meta+a'],
  ESCAPE: ['esc'],
  ENTER: ['enter'],
  SUBMIT: ['ctrl+enter', 'meta+enter'],
  DELETE: ['delete', 'backspace'],
  SEARCH: ['ctrl+k', 'meta+k', 'ctrl+f', 'meta+f'],
  NEW: ['ctrl+n', 'meta+n'],
  CLOSE: ['ctrl+w', 'meta+w'],
} as const;

// ============================================================================
// Shortcut Helper Component for Display
// ============================================================================

export interface ShortcutBadgeProps {
  keys: KeyCombo;
  className?: string;
}

const KEY_DISPLAY: Record<string, string> = {
  ctrl: '⌃',
  meta: '⌘',
  alt: '⌥',
  shift: '⇧',
  enter: '↵',
  esc: '⎋',
  space: '␣',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  backspace: '⌫',
  delete: '⌦',
  tab: '⇥',
};

export function formatShortcut(keys: KeyCombo): string {
  const combo = getFirstCombo(keys);
  return combo
    .split('+')
    .map((k: string) => {
      const normalized = normalizeKey(k.trim());
      return KEY_DISPLAY[normalized] || normalized.toUpperCase();
    })
    .join('');
}

export function ShortcutBadge({ keys, className }: ShortcutBadgeProps) {
  const display = formatShortcut(keys);
  
  return (
    <kbd
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono font-medium 
        bg-gray-100 text-gray-600 rounded border border-gray-200 shadow-sm ${className || ''}`}
    >
      {display}
    </kbd>
  );
}

// ============================================================================
// useItineraryShortcuts - Pre-configured for itinerary editing
// ============================================================================

export interface UseItineraryShortcutsOptions {
  onSave?: () => void;
  onSubmit?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onPreview?: () => void;
  onAddDay?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useItineraryShortcuts({
  onSave,
  onSubmit,
  onUndo,
  onRedo,
  onPreview,
  onAddDay,
  onDelete,
  onEscape,
  enabled = true,
}: UseItineraryShortcutsOptions): void {
  const shortcuts: KeyboardShortcut[] = [];

  if (onSave) {
    shortcuts.push({
      id: 'save',
      keys: COMMON_SHORTCUTS.SAVE,
      handler: onSave,
      description: 'Save itinerary',
    });
  }

  if (onSubmit) {
    shortcuts.push({
      id: 'submit',
      keys: COMMON_SHORTCUTS.SUBMIT,
      handler: onSubmit,
      description: 'Submit to client',
    });
  }

  if (onUndo) {
    shortcuts.push({
      id: 'undo',
      keys: COMMON_SHORTCUTS.UNDO,
      handler: onUndo,
      description: 'Undo',
    });
  }

  if (onRedo) {
    shortcuts.push({
      id: 'redo',
      keys: COMMON_SHORTCUTS.REDO,
      handler: onRedo,
      description: 'Redo',
    });
  }

  if (onPreview) {
    shortcuts.push({
      id: 'preview',
      keys: ['ctrl+p', 'meta+p'],
      handler: onPreview,
      description: 'Preview itinerary',
    });
  }

  if (onAddDay) {
    shortcuts.push({
      id: 'add-day',
      keys: ['ctrl+shift+d', 'meta+shift+d'],
      handler: onAddDay,
      description: 'Add new day',
    });
  }

  if (onDelete) {
    shortcuts.push({
      id: 'delete',
      keys: ['ctrl+shift+backspace', 'meta+shift+backspace'],
      handler: onDelete,
      description: 'Delete selected',
    });
  }

  if (onEscape) {
    shortcuts.push({
      id: 'escape',
      keys: COMMON_SHORTCUTS.ESCAPE,
      handler: onEscape,
      description: 'Cancel/Close',
      preventDefault: false,
    });
  }

  useKeyboardShortcuts({ shortcuts, enabled });
}

// ============================================================================
// useRequestShortcuts - Pre-configured for request handling
// ============================================================================

export interface UseRequestShortcutsOptions {
  onAccept?: () => void;
  onDecline?: () => void;
  onMessage?: () => void;
  onViewDetails?: () => void;
  onCreateItinerary?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useRequestShortcuts({
  onAccept,
  onDecline,
  onMessage,
  onViewDetails,
  onCreateItinerary,
  onEscape,
  enabled = true,
}: UseRequestShortcutsOptions): void {
  const shortcuts: KeyboardShortcut[] = [];

  if (onAccept) {
    shortcuts.push({
      id: 'accept',
      keys: ['a'],
      handler: onAccept,
      description: 'Accept request',
    });
  }

  if (onDecline) {
    shortcuts.push({
      id: 'decline',
      keys: ['d'],
      handler: onDecline,
      description: 'Decline request',
    });
  }

  if (onMessage) {
    shortcuts.push({
      id: 'message',
      keys: ['m'],
      handler: onMessage,
      description: 'Message client',
    });
  }

  if (onViewDetails) {
    shortcuts.push({
      id: 'view',
      keys: ['v', 'enter'],
      handler: onViewDetails,
      description: 'View details',
    });
  }

  if (onCreateItinerary) {
    shortcuts.push({
      id: 'create-itinerary',
      keys: ['i'],
      handler: onCreateItinerary,
      description: 'Create itinerary',
    });
  }

  if (onEscape) {
    shortcuts.push({
      id: 'escape',
      keys: COMMON_SHORTCUTS.ESCAPE,
      handler: onEscape,
      description: 'Cancel',
      preventDefault: false,
    });
  }

  useKeyboardShortcuts({ shortcuts, enabled });
}
