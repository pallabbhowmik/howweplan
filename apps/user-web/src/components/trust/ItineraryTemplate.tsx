'use client';

/**
 * Itinerary Template Component (Read-Only, Obfuscated)
 * 
 * Displays a preview of the itinerary structure while keeping
 * sensitive details hidden until after payment.
 * 
 * BUSINESS RULES ENFORCED:
 * - No exact hotel names, vendors, or booking references pre-payment
 * - Generic descriptions like "4-star hotel in Jaipur Old City"
 * - Day-by-day structure visible but not executable
 * - Copy protection to prevent screen captures of structure
 * - Watermarked visual display
 * 
 * Post-payment: Full details revealed with vendor names, contacts, etc.
 */

import * as React from 'react';
import { 
  MapPin, 
  Clock, 
  Sun, 
  Sunset, 
  Moon, 
  Calendar,
  Hotel,
  Car,
  Utensils,
  Camera,
  Plane,
  Train,
  Bus,
  Ship,
  Star,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Shield,
  Info,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'full_day';
export type ItemCategory = 'accommodation' | 'transport' | 'activity' | 'meal' | 'transfer';

export interface ObfuscatedItineraryItem {
  id: string;
  dayNumber: number;
  timeOfDay: TimeOfDay;
  category: ItemCategory;
  description: string;
  locationArea: string;
  durationMinutes: number | null;
  starRating: number | null;
  included: boolean;
  estimatedCost: number | null;
}

export interface ItineraryDay {
  dayNumber: number;
  date?: string;
  title: string;
  description?: string;
  items: ObfuscatedItineraryItem[];
}

export interface ItineraryTemplateProps {
  /** Itinerary title */
  title: string;
  /** Total number of days */
  totalDays: number;
  /** Day-by-day breakdown */
  days: ItineraryDay[];
  /** Trip highlights */
  highlights?: string[];
  /** Whether the itinerary is revealed (post-payment) */
  isRevealed?: boolean;
  /** Show watermark overlay */
  showWatermark?: boolean;
  /** Watermark text */
  watermarkText?: string;
  /** Whether to start expanded */
  defaultExpanded?: boolean;
  /** Additional class names */
  className?: string;
  /** Called when user tries to copy */
  onCopyAttempt?: () => void;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const TIME_OF_DAY_CONFIG: Record<TimeOfDay, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  morning: { label: 'Morning', icon: Sun, color: 'text-amber-500' },
  afternoon: { label: 'Afternoon', icon: Sun, color: 'text-orange-500' },
  evening: { label: 'Evening', icon: Sunset, color: 'text-purple-500' },
  full_day: { label: 'Full Day', icon: Calendar, color: 'text-blue-500' },
};

const CATEGORY_CONFIG: Record<ItemCategory, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  accommodation: { 
    label: 'Stay', 
    icon: Hotel, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  transport: { 
    label: 'Transport', 
    icon: Car, 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  activity: { 
    label: 'Activity', 
    icon: Camera, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  meal: { 
    label: 'Meal', 
    icon: Utensils, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  transfer: { 
    label: 'Transfer', 
    icon: Plane, 
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
};

// =============================================================================
// COPY PROTECTION
// =============================================================================

/**
 * Hook to prevent text selection and copying.
 */
function useCopyProtection(
  ref: React.RefObject<HTMLElement>,
  onCopyAttempt?: () => void
) {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      onCopyAttempt?.();
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onCopyAttempt?.();
    };

    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    element.addEventListener('copy', preventCopy);
    element.addEventListener('contextmenu', preventContextMenu);
    element.addEventListener('selectstart', preventSelection);

    return () => {
      element.removeEventListener('copy', preventCopy);
      element.removeEventListener('contextmenu', preventContextMenu);
      element.removeEventListener('selectstart', preventSelection);
    };
  }, [ref, onCopyAttempt]);
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Star rating display.
 */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Obfuscated badge showing information is hidden.
 */
function ObfuscatedBadge({ className }: { className?: string }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
      'bg-gray-100 text-gray-600 border border-gray-200',
      className
    )}>
      <EyeOff className="h-3 w-3" />
      <span>Details after booking</span>
    </div>
  );
}

/**
 * Single itinerary item display.
 */
function ItineraryItemCard({
  item,
  isRevealed,
}: {
  item: ObfuscatedItineraryItem;
  isRevealed: boolean;
}) {
  const categoryConfig = CATEGORY_CONFIG[item.category];
  const timeConfig = TIME_OF_DAY_CONFIG[item.timeOfDay];
  const CategoryIcon = categoryConfig.icon;
  const TimeIcon = timeConfig.icon;

  return (
    <div className={cn(
      'flex gap-3 p-3 rounded-lg border',
      categoryConfig.bgColor,
      'border-transparent hover:border-gray-200 transition-colors'
    )}>
      {/* Category Icon */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
        'bg-white shadow-sm'
      )}>
        <CategoryIcon className={cn('h-5 w-5', categoryConfig.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Time & Category */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <TimeIcon className={cn('h-3 w-3', timeConfig.color)} />
          <span>{timeConfig.label}</span>
          <span>•</span>
          <span>{categoryConfig.label}</span>
        </div>

        {/* Description */}
        <p className="text-sm font-medium text-gray-900 mb-1">
          {item.description}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span>{item.locationArea}</span>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          {item.starRating && (
            <StarRating rating={item.starRating} />
          )}
          {item.durationMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {item.durationMinutes >= 60 
                  ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m`
                  : `${item.durationMinutes}m`
                }
              </span>
            </div>
          )}
          {item.included && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span>Included</span>
            </div>
          )}
        </div>

        {/* Obfuscation Notice */}
        {!isRevealed && item.category === 'accommodation' && (
          <div className="mt-2">
            <ObfuscatedBadge />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Day section component.
 */
function DaySection({
  day,
  isRevealed,
  defaultExpanded,
}: {
  day: ItineraryDay;
  isRevealed: boolean;
  defaultExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Day Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-4',
          'bg-gradient-to-r from-slate-50 to-blue-50/50',
          'hover:from-slate-100 hover:to-blue-100/50 transition-colors',
          'text-left'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            {day.dayNumber}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{day.title}</h4>
            {day.date && (
              <p className="text-sm text-gray-500">{day.date}</p>
            )}
            {day.description && (
              <p className="text-sm text-gray-600 mt-0.5">{day.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {day.items.length} {day.items.length === 1 ? 'activity' : 'activities'}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Day Items */}
      {isExpanded && (
        <div className="p-4 space-y-3 border-t bg-gray-50/50">
          {day.items.map((item) => (
            <ItineraryItemCard
              key={item.id}
              item={item}
              isRevealed={isRevealed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ItineraryTemplate({
  title,
  totalDays,
  days,
  highlights,
  isRevealed = false,
  showWatermark = true,
  watermarkText = 'PREVIEW',
  defaultExpanded = true,
  className,
  onCopyAttempt,
}: ItineraryTemplateProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Apply copy protection when not revealed
  useCopyProtection(
    containerRef as React.RefObject<HTMLElement>,
    !isRevealed ? onCopyAttempt : undefined
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-xl border bg-white overflow-hidden',
        !isRevealed && 'select-none',
        className
      )}
      style={!isRevealed ? { userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
    >
      {/* Watermark Overlay */}
      {showWatermark && !isRevealed && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
            <div 
              className="text-8xl font-black text-gray-900 transform -rotate-45 whitespace-nowrap"
              style={{ letterSpacing: '0.5em' }}
            >
              {watermarkText}
            </div>
          </div>
          {/* Repeating watermark pattern */}
          <div className="absolute inset-0 opacity-[0.02]">
            {Array.from({ length: 5 }).map((_, row) => (
              <div key={row} className="flex justify-around my-20">
                {Array.from({ length: 3 }).map((_, col) => (
                  <span 
                    key={col}
                    className="text-2xl font-bold text-gray-900 transform -rotate-45"
                  >
                    {watermarkText}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">{title}</h3>
            <div className="flex items-center gap-4 text-blue-100 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{totalDays} Days</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{days.length} Destinations</span>
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
            isRevealed 
              ? 'bg-green-500/20 text-green-100' 
              : 'bg-white/20 text-white'
          )}>
            {isRevealed ? (
              <>
                <Eye className="h-4 w-4" />
                <span>Full Details</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Preview Mode</span>
              </>
            )}
          </div>
        </div>

        {/* Highlights */}
        {highlights && highlights.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {highlights.map((highlight, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium"
              >
                {highlight}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pre-payment Notice */}
      {!isRevealed && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Shield className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              Preview Mode - Exact Details Hidden
            </p>
            <p className="text-xs text-amber-600">
              Hotel names, vendor contacts, and booking references will be revealed after payment.
            </p>
          </div>
        </div>
      )}

      {/* Day-by-Day Itinerary */}
      <div className="p-6 space-y-4">
        {days.map((day) => (
          <DaySection
            key={day.dayNumber}
            day={day}
            isRevealed={isRevealed}
            defaultExpanded={defaultExpanded}
          />
        ))}
      </div>

      {/* Footer Notice */}
      {!isRevealed && (
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-center gap-2 text-sm text-gray-500">
          <Info className="h-4 w-4" />
          <span>
            Complete itinerary with all vendor details provided after booking confirmation
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT (for proposal cards)
// =============================================================================

export function ItineraryTemplateCompact({
  totalDays,
  highlights,
  itemCounts,
  className,
}: {
  totalDays: number;
  highlights: string[];
  itemCounts: {
    accommodations: number;
    activities: number;
    meals: number;
    transfers: number;
  };
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg bg-slate-50 p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-gray-900">{totalDays}-Day Itinerary</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Lock className="h-3 w-3" />
          <span>Preview</span>
        </div>
      </div>

      {/* Item Counts */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Hotel className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-gray-600">{itemCounts.accommodations}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Camera className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-gray-600">{itemCounts.activities}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Utensils className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-gray-600">{itemCounts.meals}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Car className="h-3.5 w-3.5 text-teal-500" />
          <span className="text-gray-600">{itemCounts.transfers}</span>
        </div>
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {highlights.slice(0, 4).map((highlight, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-white rounded text-xs text-gray-600 border"
            >
              {highlight}
            </span>
          ))}
          {highlights.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-gray-400">
              +{highlights.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function ItineraryTemplateSkeleton() {
  return (
    <div className="rounded-xl border bg-white overflow-hidden animate-pulse">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-gray-200 to-gray-300">
        <div className="h-6 w-48 bg-white/30 rounded mb-2" />
        <div className="h-4 w-32 bg-white/20 rounded" />
      </div>

      {/* Days */}
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200" />
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded mb-1" />
                <div className="h-4 w-24 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-20 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ItineraryTemplate;
