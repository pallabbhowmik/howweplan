'use client';

/**
 * Enhanced Itinerary Template Component (Read-Only, Obfuscated)
 * 
 * A more visually appealing and interactive itinerary preview that keeps
 * sensitive details hidden until after payment while providing an engaging UX.
 */

import * as React from 'react';
import Image from 'next/image';
import { 
  MapPin, 
  Clock, 
  Sun, 
  Sunrise,
  Sunset, 
  Moon, 
  Calendar,
  Hotel,
  Car,
  Utensils,
  Camera,
  Plane,
  Mountain,
  Waves,
  TreePine,
  Building2,
  Landmark,
  ShoppingBag,
  Sparkles,
  Star,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Shield,
  Info,
  CheckCircle,
  Heart,
  Share2,
  Download,
  Maximize2,
  Play,
  Pause,
  Navigation,
  Coffee,
  Wine,
  Bike,
  Ship,
  Footprints,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type TimeOfDay = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'full_day';
export type ItemCategory = 'accommodation' | 'transport' | 'activity' | 'meal' | 'sightseeing' | 'leisure' | 'adventure' | 'cultural' | 'shopping';
export type ActivityIntensity = 'relaxed' | 'moderate' | 'active' | 'challenging';

export interface ItineraryItem {
  id: string;
  timeOfDay: TimeOfDay;
  category: ItemCategory;
  title: string;
  description: string;
  locationArea: string;
  durationMinutes: number | null;
  starRating: number | null;
  intensity?: ActivityIntensity;
  imageUrl?: string;
  included: boolean;
  estimatedCost?: number;
  highlights?: string[];
  tips?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date?: string;
  title: string;
  subtitle?: string;
  description?: string;
  heroImage?: string;
  weather?: { temp: number; condition: string };
  items: ItineraryItem[];
  overnightLocation?: string;
  distanceKm?: number;
}

export interface EnhancedItineraryProps {
  title: string;
  subtitle?: string;
  heroImage?: string;
  totalDays: number;
  days: ItineraryDay[];
  highlights?: string[];
  includedItems?: string[];
  excludedItems?: string[];
  isRevealed?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
  defaultExpanded?: boolean;
  variant?: 'default' | 'timeline' | 'cards' | 'magazine';
  className?: string;
  onCopyAttempt?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const TIME_CONFIG: Record<TimeOfDay, { label: string; icon: React.ElementType; gradient: string; time: string }> = {
  early_morning: { label: 'Early Morning', icon: Sunrise, gradient: 'from-orange-400 to-pink-500', time: '5:00 - 8:00' },
  morning: { label: 'Morning', icon: Sun, gradient: 'from-amber-400 to-orange-500', time: '8:00 - 12:00' },
  afternoon: { label: 'Afternoon', icon: Sun, gradient: 'from-yellow-400 to-amber-500', time: '12:00 - 17:00' },
  evening: { label: 'Evening', icon: Sunset, gradient: 'from-purple-500 to-pink-500', time: '17:00 - 20:00' },
  night: { label: 'Night', icon: Moon, gradient: 'from-indigo-600 to-purple-600', time: '20:00+' },
  full_day: { label: 'Full Day', icon: Calendar, gradient: 'from-blue-500 to-indigo-500', time: 'All Day' },
};

const CATEGORY_CONFIG: Record<ItemCategory, { label: string; icon: React.ElementType; color: string; bgColor: string; emoji: string }> = {
  accommodation: { label: 'Stay', icon: Hotel, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', emoji: '🏨' },
  transport: { label: 'Transport', icon: Car, color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', emoji: '🚗' },
  activity: { label: 'Activity', icon: Camera, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', emoji: '📸' },
  meal: { label: 'Dining', icon: Utensils, color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', emoji: '🍽️' },
  sightseeing: { label: 'Sightseeing', icon: Landmark, color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-200', emoji: '🏛️' },
  leisure: { label: 'Leisure', icon: Coffee, color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-200', emoji: '☕' },
  adventure: { label: 'Adventure', icon: Mountain, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', emoji: '🏔️' },
  cultural: { label: 'Cultural', icon: Building2, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', emoji: '🎭' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'text-pink-600', bgColor: 'bg-pink-50 border-pink-200', emoji: '🛍️' },
};

const INTENSITY_CONFIG: Record<ActivityIntensity, { label: string; color: string; icon: string }> = {
  relaxed: { label: 'Relaxed', color: 'text-green-600 bg-green-50', icon: '😌' },
  moderate: { label: 'Moderate', color: 'text-blue-600 bg-blue-50', icon: '🚶' },
  active: { label: 'Active', color: 'text-orange-600 bg-orange-50', icon: '🏃' },
  challenging: { label: 'Challenging', color: 'text-red-600 bg-red-50', icon: '💪' },
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClasses[size],
            i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
          )}
        />
      ))}
    </div>
  );
}

function ObfuscatedOverlay({ children, isRevealed }: { children: React.ReactNode; isRevealed: boolean }) {
  if (isRevealed) return <>{children}</>;
  
  return (
    <div className="relative">
      <div className="blur-[2px] select-none pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-gray-900/5 to-gray-900/10 backdrop-blur-[1px] rounded-lg">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 rounded-full shadow-sm border">
          <Lock className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">After booking</span>
        </div>
      </div>
    </div>
  );
}

function TimelineDot({ category, isFirst, isLast }: { category: ItemCategory; isFirst: boolean; isLast: boolean }) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  
  return (
    <div className="flex flex-col items-center">
      {!isFirst && <div className="w-0.5 h-4 bg-gray-200" />}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm',
        config.bgColor
      )}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>
      {!isLast && <div className="w-0.5 flex-1 min-h-8 bg-gray-200" />}
    </div>
  );
}

// Enhanced Item Card with Image
function EnhancedItemCard({
  item,
  isRevealed,
  variant,
}: {
  item: ItineraryItem;
  isRevealed: boolean;
  variant: 'default' | 'timeline' | 'cards' | 'magazine';
}) {
  const categoryConfig = CATEGORY_CONFIG[item.category];
  const timeConfig = TIME_CONFIG[item.timeOfDay];
  const TimeIcon = timeConfig.icon;
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (variant === 'cards') {
    return (
      <div className={cn(
        'group relative overflow-hidden rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300',
        categoryConfig.bgColor
      )}>
        {/* Image or Gradient Header */}
        <div className="relative h-32 overflow-hidden">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className={cn('absolute inset-0 bg-gradient-to-br', timeConfig.gradient, 'opacity-80')} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Category Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-white/90 rounded-full text-xs font-medium shadow-sm">
            <span>{categoryConfig.emoji}</span>
            <span className={categoryConfig.color}>{categoryConfig.label}</span>
          </div>
          
          {/* Time Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
            <TimeIcon className="h-3 w-3" />
            <span>{timeConfig.time}</span>
          </div>
          
          {/* Title Overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <h4 className="text-white font-semibold text-lg drop-shadow-lg line-clamp-1">
              {item.title}
            </h4>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.description}</p>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <ObfuscatedOverlay isRevealed={isRevealed}>
                <span>{item.locationArea}</span>
              </ObfuscatedOverlay>
            </div>
            {item.durationMinutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {item.durationMinutes >= 60 
                    ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60 > 0 ? `${item.durationMinutes % 60}m` : ''}`
                    : `${item.durationMinutes}m`
                  }
                </span>
              </div>
            )}
          </div>
          
          {/* Meta Row */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            {item.starRating && <StarRating rating={item.starRating} />}
            {item.intensity && (
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', INTENSITY_CONFIG[item.intensity].color)}>
                {INTENSITY_CONFIG[item.intensity].icon} {INTENSITY_CONFIG[item.intensity].label}
              </span>
            )}
            {item.included && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3 w-3" />
                Included
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default/Timeline variant
  return (
    <div 
      className={cn(
        'relative p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer',
        isExpanded && 'ring-2 ring-blue-200'
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex gap-4">
        {/* Image Thumbnail */}
        {item.imageUrl && (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                categoryConfig.bgColor, categoryConfig.color
              )}>
                {categoryConfig.emoji} {categoryConfig.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <TimeIcon className="h-3 w-3" />
                {timeConfig.label}
              </span>
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 text-gray-400 transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </div>
          
          <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
          <p className={cn('text-sm text-gray-600', !isExpanded && 'line-clamp-1')}>
            {item.description}
          </p>
          
          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <ObfuscatedOverlay isRevealed={isRevealed}>
                <span>{item.locationArea}</span>
              </ObfuscatedOverlay>
            </div>
            {item.durationMinutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {item.durationMinutes >= 60 
                    ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60 > 0 ? `${item.durationMinutes % 60}m` : ''}`
                    : `${item.durationMinutes}m`
                  }
                </span>
              </div>
            )}
            {item.starRating && <StarRating rating={item.starRating} />}
            {item.included && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                Included
              </span>
            )}
          </div>
          
          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {item.highlights && item.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.highlights.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                      ✨ {h}
                    </span>
                  ))}
                </div>
              )}
              {item.tips && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                  💡 <strong>Tip:</strong> {item.tips}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Day Section with Hero Image
function EnhancedDaySection({
  day,
  isRevealed,
  defaultExpanded,
  variant,
}: {
  day: ItineraryDay;
  isRevealed: boolean;
  defaultExpanded: boolean;
  variant: 'default' | 'timeline' | 'cards' | 'magazine';
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  
  // Group items by time of day
  const itemsByTime = React.useMemo(() => {
    const groups: Record<TimeOfDay, ItineraryItem[]> = {
      early_morning: [],
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
      full_day: [],
    };
    day.items.forEach(item => {
      groups[item.timeOfDay].push(item);
    });
    return groups;
  }, [day.items]);

  return (
    <div className="relative">
      {/* Day Header Card */}
      <div 
        className={cn(
          'relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300',
          isExpanded ? 'mb-4' : 'mb-2'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Hero Image or Gradient */}
        <div className="relative h-40 overflow-hidden rounded-2xl">
          {day.heroImage ? (
            <Image
              src={day.heroImage}
              alt={day.title}
              fill
              className={cn(
                'object-cover transition-all duration-500',
                isExpanded ? 'scale-100' : 'scale-105'
              )}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Day Number Badge */}
          <div className="absolute top-4 left-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-md flex flex-col items-center justify-center border border-white/30 shadow-lg">
              <span className="text-2xl font-bold text-white">{day.dayNumber}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/80">Day</span>
            </div>
          </div>
          
          {/* Weather Badge */}
          {day.weather && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-sm">
              <span>{day.weather.condition === 'sunny' ? '☀️' : day.weather.condition === 'cloudy' ? '☁️' : '🌧️'}</span>
              <span>{day.weather.temp}°C</span>
            </div>
          )}
          
          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end justify-between">
              <div>
                {day.date && (
                  <p className="text-sm text-white/80 mb-1">{day.date}</p>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{day.title}</h3>
                {day.subtitle && (
                  <p className="text-sm text-white/80">{day.subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-3 text-white/80 text-sm">
                <div className="flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  <span>{day.items.length}</span>
                </div>
                {day.distanceKm && (
                  <div className="flex items-center gap-1">
                    <Navigation className="h-4 w-4" />
                    <span>{day.distanceKm}km</span>
                  </div>
                )}
                <ChevronDown className={cn(
                  'h-5 w-5 transition-transform duration-300',
                  isExpanded && 'rotate-180'
                )} />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Day Items */}
      {isExpanded && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Description */}
          {day.description && (
            <p className="text-gray-600 px-1">{day.description}</p>
          )}
          
          {/* Items by Time */}
          {variant === 'timeline' ? (
            <div className="relative">
              {day.items.map((item, index) => (
                <div key={item.id} className="flex gap-4">
                  <TimelineDot 
                    category={item.category}
                    isFirst={index === 0}
                    isLast={index === day.items.length - 1}
                  />
                  <div className="flex-1 pb-4">
                    <EnhancedItemCard item={item} isRevealed={isRevealed} variant={variant} />
                  </div>
                </div>
              ))}
            </div>
          ) : variant === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {day.items.map((item) => (
                <EnhancedItemCard key={item.id} item={item} isRevealed={isRevealed} variant={variant} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {day.items.map((item) => (
                <EnhancedItemCard key={item.id} item={item} isRevealed={isRevealed} variant={variant} />
              ))}
            </div>
          )}
          
          {/* Overnight Location */}
          {day.overnightLocation && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <Hotel className="h-5 w-5 text-blue-600" />
              <div>
                <span className="text-xs text-blue-600 font-medium">Overnight stay</span>
                <ObfuscatedOverlay isRevealed={isRevealed}>
                  <p className="text-sm font-medium text-gray-900">{day.overnightLocation}</p>
                </ObfuscatedOverlay>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ItineraryTemplateEnhanced({
  title,
  subtitle,
  heroImage,
  totalDays,
  days,
  highlights,
  includedItems,
  excludedItems,
  isRevealed = false,
  showWatermark = true,
  watermarkText = 'PREVIEW',
  defaultExpanded = true,
  variant = 'default',
  className,
  onCopyAttempt,
  onSave,
  onShare,
}: EnhancedItineraryProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeDay, setActiveDay] = React.useState(1);

  // Copy protection
  React.useEffect(() => {
    if (isRevealed) return;
    
    const element = containerRef.current;
    if (!element) return;

    const prevent = (e: Event) => {
      e.preventDefault();
      onCopyAttempt?.();
    };

    element.addEventListener('copy', prevent);
    element.addEventListener('contextmenu', prevent);
    element.addEventListener('selectstart', prevent);

    return () => {
      element.removeEventListener('copy', prevent);
      element.removeEventListener('contextmenu', prevent);
      element.removeEventListener('selectstart', prevent);
    };
  }, [isRevealed, onCopyAttempt]);

  // Calculate stats
  const stats = React.useMemo(() => {
    let activities = 0, meals = 0, accommodations = 0, transport = 0;
    days.forEach(day => {
      day.items.forEach(item => {
        if (item.category === 'activity' || item.category === 'sightseeing' || item.category === 'adventure' || item.category === 'cultural') activities++;
        else if (item.category === 'meal') meals++;
        else if (item.category === 'accommodation') accommodations++;
        else if (item.category === 'transport') transport++;
      });
    });
    return { activities, meals, accommodations, transport };
  }, [days]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-white shadow-xl',
        !isRevealed && 'select-none',
        className
      )}
      style={!isRevealed ? { userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
    >
      {/* Watermark */}
      {showWatermark && !isRevealed && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="text-[120px] font-black text-gray-900/[0.02] transform -rotate-12 whitespace-nowrap"
              style={{ letterSpacing: '0.3em' }}
            >
              {watermarkText}
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative h-64 overflow-hidden">
        {heroImage ? (
          <Image src={heroImage} alt={title} fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        
        {/* Top Actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {onSave && (
            <button 
              onClick={onSave}
              className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <Heart className="h-5 w-5" />
            </button>
          )}
          {onShare && (
            <button 
              onClick={onShare}
              className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <Share2 className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium',
            isRevealed 
              ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
              : 'bg-white/20 text-white border border-white/30'
          )}>
            {isRevealed ? (
              <>
                <Eye className="h-4 w-4" />
                <span>Full Details Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Preview Mode</span>
              </>
            )}
          </div>
        </div>
        
        {/* Title Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
          {subtitle && <p className="text-lg text-white/80 mb-4">{subtitle}</p>}
          
          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-4 text-white/90">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{totalDays} Days</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
              <Camera className="h-4 w-4" />
              <span>{stats.activities} Activities</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
              <Utensils className="h-4 w-4" />
              <span>{stats.meals} Meals</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
              <Hotel className="h-4 w-4" />
              <span>{stats.accommodations} Stays</span>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights */}
      {highlights && highlights.length > 0 && (
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">Trip Highlights</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {highlights.map((h, i) => (
              <span key={i} className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-amber-200 shadow-sm">
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pre-payment Notice */}
      {!isRevealed && (
        <div className="mx-6 mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Preview Mode Active</h4>
            <p className="text-sm text-blue-700">
              Exact hotel names, vendor contacts, and booking references are hidden. 
              Full details will be revealed after booking confirmation.
            </p>
          </div>
        </div>
      )}

      {/* Day Navigation Pills */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
          {days.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => setActiveDay(day.dayNumber)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
                activeDay === day.dayNumber
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Day {day.dayNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Day-by-Day Itinerary */}
      <div className="p-6 space-y-6">
        {days.map((day) => (
          <EnhancedDaySection
            key={day.dayNumber}
            day={day}
            isRevealed={isRevealed}
            defaultExpanded={day.dayNumber === activeDay || defaultExpanded}
            variant={variant}
          />
        ))}
      </div>

      {/* Included/Excluded Section */}
      {(includedItems || excludedItems) && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {includedItems && includedItems.length > 0 && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  What&apos;s Included
                </h4>
                <ul className="space-y-1.5">
                  {includedItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-green-700">
                      <span className="text-green-500">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {excludedItems && excludedItems.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Not Included
                </h4>
                <ul className="space-y-1.5">
                  {excludedItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-gray-400">○</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      {!isRevealed && (
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-center gap-2 text-sm text-gray-500">
          <Lock className="h-4 w-4" />
          <span>Complete itinerary with all vendor details provided after booking confirmation</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function ItineraryTemplateEnhancedSkeleton() {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden animate-pulse">
      <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300" />
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-20 bg-gray-200 rounded-full" />
          ))}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default ItineraryTemplateEnhanced;
