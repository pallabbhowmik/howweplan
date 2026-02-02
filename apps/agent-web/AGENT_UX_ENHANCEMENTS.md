# Agent Experience UX Enhancements

This document describes the new UI components and hooks created to improve the agent experience for request handling, itinerary management, and updates.

## Overview

The following enhancements have been added to make the agent portal more smooth and attractive:

1. **Quick Actions** - Fast, keyboard-accessible action buttons
2. **Auto-Save with Undo** - Automatic saving with full undo/redo history
3. **Status Progress Tracker** - Visual workflow progress indicators
4. **Toast Notifications** - Non-intrusive feedback system
5. **Floating Action Bar** - Persistent action controls
6. **Keyboard Shortcuts** - Power-user keyboard navigation
7. **Draggable Day Cards** - Interactive itinerary day management
8. **Enhanced Request Cards** - Rich request display with smooth interactions
9. **Success Animations** - Celebratory feedback for completed actions

---

## Components

### 1. QuickActions

Fast, keyboard-accessible action buttons for requests and itineraries.

```tsx
import { QuickActions, RequestQuickActions, ItineraryQuickActions } from '@/components/ui';

// Generic quick actions
<QuickActions
  actions={[
    { id: 'save', label: 'Save', icon: <Save />, onClick: handleSave, shortcut: '⌘S' },
    { id: 'submit', label: 'Submit', icon: <Send />, variant: 'success', onClick: handleSubmit },
  ]}
/>

// Pre-configured for requests
<RequestQuickActions
  requestId={request.id}
  status={request.status}
  onAccept={handleAccept}
  onDecline={handleDecline}
  onMessage={handleMessage}
/>

// Pre-configured for itineraries
<ItineraryQuickActions
  itineraryId={itinerary.id}
  status={itinerary.status}
  onSave={handleSave}
  onSubmit={handleSubmit}
  hasUnsavedChanges={hasChanges}
/>
```

### 2. Auto-Save with Undo

Hook for automatic saving with full undo/redo history.

```tsx
import { useAutoSave, AutoSaveIndicator } from '@/lib/hooks';

function ItineraryEditor() {
  const {
    data,
    setData,
    hasUnsavedChanges,
    isSaving,
    lastSavedAt,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAutoSave({
    initialData: initialItinerary,
    onSave: async (data) => {
      await saveItinerary(data);
    },
    debounceMs: 2000,
  });

  return (
    <>
      <AutoSaveIndicator
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />
      {/* Editor content */}
    </>
  );
}
```

### 3. Status Progress Tracker

Visual workflow progress indicators.

```tsx
import { StatusProgressTracker, MiniStatusBadge } from '@/components/ui';

// Full progress tracker
<StatusProgressTracker
  workflow="request"  // 'request' | 'itinerary' | 'booking'
  currentStatus="accepted"
  showLabels
  orientation="horizontal"  // or 'vertical'
/>

// Compact inline badge
<MiniStatusBadge status="accepted" />
```

### 4. Toast Notifications

Non-intrusive feedback system.

```tsx
import { ToastProvider, useToast } from '@/components/ui';

// Wrap app in provider
<ToastProvider position="bottom-right">
  <App />
</ToastProvider>

// Use in components
function MyComponent() {
  const toast = useToast();

  const handleSave = async () => {
    await toast.promise(saveData(), {
      loading: 'Saving...',
      success: 'Saved successfully!',
      error: (err) => `Failed: ${err.message}`,
    });
  };

  // Or use individual methods
  toast.success('Request accepted!', 'You can now create an itinerary');
  toast.error('Failed to save', 'Please try again');
  toast.info('New request received');
}
```

### 5. Floating Action Bar

Persistent action controls with status and undo/redo.

```tsx
import { FloatingActionBar, ItineraryFloatingBar } from '@/components/ui';

// Pre-configured for itinerary editing
<ItineraryFloatingBar
  status="draft"
  isSaving={isSaving}
  hasUnsavedChanges={hasChanges}
  lastSavedAt={lastSavedAt}
  onSave={handleSave}
  onSubmit={handleSubmit}
  onPreview={handlePreview}
  canUndo={canUndo}
  canRedo={canRedo}
  onUndo={undo}
  onRedo={redo}
/>
```

### 6. Keyboard Shortcuts

Power-user keyboard navigation.

```tsx
import { useItineraryShortcuts, useRequestShortcuts, ShortcutBadge } from '@/lib/hooks';

// For itinerary editing
useItineraryShortcuts({
  onSave: handleSave,
  onSubmit: handleSubmit,
  onUndo: undo,
  onRedo: redo,
  onAddDay: handleAddDay,
});

// For request handling
useRequestShortcuts({
  onAccept: handleAccept,
  onDecline: handleDecline,
  onMessage: handleMessage,
  onViewDetails: handleView,
});

// Display shortcut
<ShortcutBadge keys="ctrl+s" />  // Shows: ⌃S
```

### 7. Draggable Day Card

Interactive itinerary day management with activities.

```tsx
import { DraggableDayCard, createEmptyDay, type DayPlan } from '@/components/ui';

const [days, setDays] = useState<DayPlan[]>([
  createEmptyDay(1, '2026-03-01'),
]);

{days.map((day, index) => (
  <DraggableDayCard
    key={day.id}
    day={day}
    onChange={(updated) => updateDay(index, updated)}
    onDelete={() => removeDay(index)}
    onDuplicate={() => duplicateDay(index)}
    onMoveUp={() => moveDay(index, 'up')}
    onMoveDown={() => moveDay(index, 'down')}
    canMoveUp={index > 0}
    canMoveDown={index < days.length - 1}
  />
))}
```

### 8. Enhanced Request Card

Rich request display with smooth interactions.

```tsx
import { EnhancedRequestCard } from '@/components/ui';

<EnhancedRequestCard
  request={requestData}
  onAccept={async () => {
    await acceptRequest(request.matchId);
  }}
  onDecline={async (reason) => {
    await declineRequest(request.matchId, reason);
  }}
  onMessage={() => router.push(`/messages/${request.requestId}`)}
  onCreateItinerary={() => router.push(`/itineraries/new?requestId=${request.requestId}`)}
  showProgress  // Show workflow progress tracker
/>
```

### 9. Success Animations

Celebratory feedback for completed actions.

```tsx
import { useSuccessAnimation, SuccessAnimation } from '@/components/ui';

function MyComponent() {
  const { show, SuccessAnimationPortal } = useSuccessAnimation({
    duration: 2000,
    fullScreen: true,
  });

  const handleAccept = async () => {
    await acceptRequest();
    show('accepted', 'Request Accepted!', 'You can now create an itinerary');
  };

  return (
    <>
      {/* Component content */}
      <SuccessAnimationPortal />
    </>
  );
}

// Available animation types:
// 'success', 'error', 'accepted', 'declined', 'submitted', 'saved', 'loading'
```

---

## CSS Animations

The following CSS animation classes are available in `globals.css`:

- `.animate-confetti` - Falling confetti effect
- `.animate-success-pulse` - Green pulse ring effect
- `.animate-shimmer` - Loading shimmer effect
- `.animate-bounce-scale` - Subtle bounce scale
- `.animate-slide-in-bottom` - Slide up from bottom
- `.animate-attention-shake` - Attention-grabbing shake

---

## Best Practices

### Request Handling
1. Use `EnhancedRequestCard` for rich request display
2. Add `RequestQuickActions` for fast accept/decline
3. Show `StatusProgressTracker` to visualize workflow
4. Use toast notifications for feedback
5. Add `useRequestShortcuts` for power users

### Itinerary Creation & Editing
1. Use `useAutoSave` to prevent data loss
2. Add `ItineraryFloatingBar` for persistent actions
3. Use `DraggableDayCard` for day management
4. Enable `useItineraryShortcuts` for efficiency
5. Show `SuccessAnimation` on submit

### General UX
1. Always provide feedback for actions (toasts, animations)
2. Enable keyboard shortcuts where possible
3. Show save status and allow undo
4. Use smooth transitions between states
5. Display progress indicators for workflows

---

## Integration Example

Here's how to integrate all components in the itinerary editor:

```tsx
'use client';

import { useState } from 'react';
import {
  DraggableDayCard,
  createEmptyDay,
  ItineraryFloatingBar,
  ToastProvider,
  useToast,
  useSuccessAnimation,
} from '@/components/ui';
import { useAutoSave, useItineraryShortcuts } from '@/lib/hooks';

export default function ItineraryEditorPage() {
  const toast = useToast();
  const { show, SuccessAnimationPortal } = useSuccessAnimation({ fullScreen: true });

  const {
    data: itinerary,
    setData,
    hasUnsavedChanges,
    isSaving,
    lastSavedAt,
    saveError,
    saveNow,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAutoSave({
    initialData: initialItinerary,
    onSave: async (data) => {
      await saveItinerary(data);
      toast.success('Saved!');
    },
    onSaveError: (error) => {
      toast.error('Save failed', error.message);
    },
  });

  const handleSubmit = async () => {
    await saveNow();
    await submitItinerary(itinerary.id);
    show('submitted', 'Sent to Client!', 'They will be notified');
  };

  // Keyboard shortcuts
  useItineraryShortcuts({
    onSave: saveNow,
    onSubmit: handleSubmit,
    onUndo: undo,
    onRedo: redo,
  });

  return (
    <div className="pb-24">
      {/* Day cards */}
      {itinerary.days.map((day, index) => (
        <DraggableDayCard
          key={day.id}
          day={day}
          onChange={(updated) => {
            setData((prev) => ({
              ...prev,
              days: prev.days.map((d, i) => (i === index ? updated : d)),
            }));
          }}
          onDelete={() => {
            setData((prev) => ({
              ...prev,
              days: prev.days.filter((_, i) => i !== index),
            }));
          }}
        />
      ))}

      {/* Floating action bar */}
      <ItineraryFloatingBar
        status={itinerary.status}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        lastSavedAt={lastSavedAt}
        saveError={saveError}
        onSave={saveNow}
        onSubmit={handleSubmit}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <SuccessAnimationPortal />
    </div>
  );
}
```

---

## File Structure

```
apps/agent-web/src/
├── components/ui/
│   ├── quick-actions.tsx         # QuickActions, RequestQuickActions, ItineraryQuickActions
│   ├── status-progress-tracker.tsx  # StatusProgressTracker, MiniStatusBadge
│   ├── toast.tsx                 # ToastProvider, useToast, toast
│   ├── floating-action-bar.tsx   # FloatingActionBar, ItineraryFloatingBar
│   ├── draggable-day-card.tsx    # DraggableDayCard, createEmptyDay
│   ├── enhanced-request-card.tsx # EnhancedRequestCard
│   ├── success-animation.tsx     # SuccessAnimation, useSuccessAnimation
│   └── index.ts                  # Exports all components
├── lib/hooks/
│   ├── use-auto-save.ts          # useAutoSave, AutoSaveIndicator
│   ├── use-keyboard-shortcuts.ts # useKeyboardShortcuts, useItineraryShortcuts, etc.
│   └── index.ts                  # Exports all hooks
└── app/globals.css               # Animation keyframes
```
