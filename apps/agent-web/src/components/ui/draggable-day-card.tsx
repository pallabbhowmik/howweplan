'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Coffee,
  Plane,
  Hotel,
  MapPin,
  Utensils,
  Camera,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Badge } from './badge';

// ============================================================================
// Types
// ============================================================================

export interface DayActivity {
  id: string;
  time?: string;
  title: string;
  description?: string;
  type?: 'transport' | 'accommodation' | 'activity' | 'meal' | 'sightseeing' | 'rest' | 'other';
  location?: string;
  duration?: string;
  cost?: number;
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  date?: string;
  title: string;
  description?: string;
  activities: DayActivity[];
  accommodation?: {
    name: string;
    type: string;
    checkIn?: string;
    checkOut?: string;
  };
}

export interface DraggableDayCardProps {
  day: DayPlan;
  isExpanded?: boolean;
  isDragging?: boolean;
  canDelete?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onChange: (day: DayPlan) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
}

// ============================================================================
// Activity Type Configuration
// ============================================================================

const ACTIVITY_TYPES = {
  transport: { icon: <Plane className="h-4 w-4" />, label: 'Transport', color: 'bg-blue-100 text-blue-700' },
  accommodation: { icon: <Hotel className="h-4 w-4" />, label: 'Accommodation', color: 'bg-purple-100 text-purple-700' },
  activity: { icon: <MapPin className="h-4 w-4" />, label: 'Activity', color: 'bg-emerald-100 text-emerald-700' },
  meal: { icon: <Utensils className="h-4 w-4" />, label: 'Meal', color: 'bg-amber-100 text-amber-700' },
  sightseeing: { icon: <Camera className="h-4 w-4" />, label: 'Sightseeing', color: 'bg-pink-100 text-pink-700' },
  rest: { icon: <Coffee className="h-4 w-4" />, label: 'Rest', color: 'bg-gray-100 text-gray-700' },
  other: { icon: <MapPin className="h-4 w-4" />, label: 'Other', color: 'bg-slate-100 text-slate-700' },
};

const TIME_PERIODS = {
  morning: { icon: <Sun className="h-4 w-4" />, label: 'Morning', range: '06:00 - 12:00' },
  afternoon: { icon: <Sun className="h-4 w-4" />, label: 'Afternoon', range: '12:00 - 17:00' },
  evening: { icon: <Moon className="h-4 w-4" />, label: 'Evening', range: '17:00 - 21:00' },
  night: { icon: <Moon className="h-4 w-4" />, label: 'Night', range: '21:00+' },
};

// ============================================================================
// Activity Card Component
// ============================================================================

interface ActivityCardProps {
  activity: DayActivity;
  index: number;
  onChange: (activity: DayActivity) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

function ActivityCard({
  activity,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: ActivityCardProps) {
  const [isEditing, setIsEditing] = useState(!activity.title);
  const typeConfig = ACTIVITY_TYPES[activity.type || 'other'];

  if (isEditing) {
    return (
      <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Time</label>
            <Input
              type="time"
              value={activity.time || ''}
              onChange={(e) => onChange({ ...activity, time: e.target.value })}
              className="h-8"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Type</label>
            <select
              value={activity.type || 'activity'}
              onChange={(e) => onChange({ ...activity, type: e.target.value as DayActivity['type'] })}
              className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md"
            >
              {Object.entries(ACTIVITY_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Title</label>
          <Input
            value={activity.title}
            onChange={(e) => onChange({ ...activity, title: e.target.value })}
            placeholder="Activity title"
            className="h-8"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Description</label>
          <Textarea
            value={activity.description || ''}
            onChange={(e) => onChange({ ...activity, description: e.target.value })}
            placeholder="Optional description..."
            rows={2}
            className="text-sm"
          />
        </div>
        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
          <Button
            size="sm"
            onClick={() => setIsEditing(false)}
            disabled={!activity.title}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => setIsEditing(true)}
    >
      {/* Time */}
      <div className="flex-shrink-0 w-14 text-center">
        {activity.time ? (
          <span className="text-sm font-medium text-gray-900">{activity.time}</span>
        ) : (
          <span className="text-xs text-gray-400">No time</span>
        )}
      </div>

      {/* Type Icon */}
      <div className={cn('flex-shrink-0 p-2 rounded-lg', typeConfig.color)}>
        {typeConfig.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{activity.title || 'Untitled Activity'}</p>
        {activity.description && (
          <p className="text-sm text-gray-500 line-clamp-1">{activity.description}</p>
        )}
        {activity.location && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            {activity.location}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {canMoveUp && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Move up"
          >
            <ChevronUp className="h-4 w-4 text-gray-400" />
          </button>
        )}
        {canMoveDown && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Move down"
          >
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DraggableDayCard Component
// ============================================================================

export function DraggableDayCard({
  day,
  isExpanded: initialExpanded = true,
  isDragging = false,
  canDelete = true,
  canMoveUp = true,
  canMoveDown = true,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  className,
}: DraggableDayCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID for new activities
  const generateId = () => `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Add new activity
  const addActivity = () => {
    const newActivity: DayActivity = {
      id: generateId(),
      title: '',
      type: 'activity',
    };
    onChange({
      ...day,
      activities: [...day.activities, newActivity],
    });
  };

  // Update activity
  const updateActivity = (index: number, activity: DayActivity) => {
    const newActivities = [...day.activities];
    newActivities[index] = activity;
    onChange({ ...day, activities: newActivities });
  };

  // Remove activity
  const removeActivity = (index: number) => {
    onChange({
      ...day,
      activities: day.activities.filter((_, i) => i !== index),
    });
  };

  // Move activity
  const moveActivity = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= day.activities.length) return;

    const newActivities = [...day.activities];
    [newActivities[index], newActivities[newIndex]] = [newActivities[newIndex], newActivities[index]];
    onChange({ ...day, activities: newActivities });
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isDragging && 'opacity-50 scale-[0.98] ring-2 ring-blue-500',
        className
      )}
    >
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div
            className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            onMouseDown={onDragStart}
            onMouseUp={onDragEnd}
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>

          {/* Day Number Badge */}
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{day.dayNumber}</span>
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={day.title}
                onChange={(e) => onChange({ ...day, title: e.target.value })}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                className="h-8 font-semibold"
                placeholder="Day title"
                autoFocus
              />
            ) : (
              <h3
                className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
                onClick={() => setIsEditingTitle(true)}
              >
                {day.title || `Day ${day.dayNumber}`}
              </h3>
            )}
            {day.date && (
              <p className="text-sm text-gray-500">{formatDate(day.date)}</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex">
              {day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {canMoveUp && (
              <Button variant="ghost" size="sm" onClick={onMoveUp} className="h-8 w-8 p-0">
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {canMoveDown && (
              <Button variant="ghost" size="sm" onClick={onMoveDown} className="h-8 w-8 p-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDuplicate} className="h-8 w-8 p-0" title="Duplicate day">
              <Copy className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete day">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      {isExpanded && (
        <CardContent className="pt-0">
          {/* Day Description */}
          <div className="mb-4">
            <Textarea
              value={day.description || ''}
              onChange={(e) => onChange({ ...day, description: e.target.value })}
              placeholder="Add a day overview or special notes..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Activities */}
          <div className="space-y-2">
            {day.activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No activities yet</p>
                <p className="text-xs text-gray-400">Add activities to plan this day</p>
              </div>
            ) : (
              day.activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={index}
                  onChange={(updated) => updateActivity(index, updated)}
                  onRemove={() => removeActivity(index)}
                  onMoveUp={() => moveActivity(index, 'up')}
                  onMoveDown={() => moveActivity(index, 'down')}
                  canMoveUp={index > 0}
                  canMoveDown={index < day.activities.length - 1}
                />
              ))
            )}
          </div>

          {/* Add Activity Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addActivity}
            className="w-full mt-4 border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// Export utility for generating empty day
// ============================================================================

export function createEmptyDay(dayNumber: number, date?: string): DayPlan {
  return {
    id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    dayNumber,
    date,
    title: '',
    description: '',
    activities: [],
  };
}
