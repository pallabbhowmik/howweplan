'use client';

/**
 * Trip Countdown Widget (Post-Payment Only)
 * 
 * Displays a countdown timer to the trip start date, showing:
 * - Days, hours, minutes, seconds until departure
 * - Trip status (upcoming, ongoing, completed)
 * - Progress indicator
 * - Trip highlights and destination info
 * 
 * BUSINESS RULE: Only shown after payment is confirmed
 */

import * as React from 'react';
import {
  Plane,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  PlayCircle,
  PartyPopper,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
  Timer,
  AlertCircle,
  Users,
  Luggage,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type TripStatus = 'upcoming' | 'departing_soon' | 'ongoing' | 'completed';

export interface TripCountdownProps {
  /** Trip/Booking ID */
  tripId: string;
  /** Destination name */
  destination: string;
  /** Optional destination image URL */
  destinationImage?: string;
  /** Trip start date */
  startDate: Date | string;
  /** Trip end date */
  endDate: Date | string;
  /** Payment confirmed status - widget only shows if true */
  isPaymentConfirmed: boolean;
  /** Booking reference number */
  bookingReference?: string;
  /** Number of travelers */
  travelerCount?: number;
  /** Trip highlights */
  highlights?: string[];
  /** Display variant */
  variant?: 'mini' | 'compact' | 'default' | 'full';
  /** Additional class names */
  className?: string;
  /** Callback when countdown reaches zero */
  onTripStart?: () => void;
  /** Callback when trip ends */
  onTripEnd?: () => void;
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMilliseconds: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const STATUS_CONFIG: Record<TripStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  gradient: string;
}> = {
  upcoming: {
    label: 'Upcoming Trip',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Calendar,
    gradient: 'from-blue-500 to-indigo-600',
  },
  departing_soon: {
    label: 'Departing Soon!',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: Plane,
    gradient: 'from-amber-500 to-orange-600',
  },
  ongoing: {
    label: 'Trip in Progress',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: PlayCircle,
    gradient: 'from-green-500 to-emerald-600',
  },
  completed: {
    label: 'Trip Completed',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: CheckCircle,
    gradient: 'from-purple-500 to-pink-600',
  },
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to calculate and update countdown time
 */
function useCountdown(targetDate: Date, onComplete?: () => void): CountdownTime {
  const [countdown, setCountdown] = React.useState<CountdownTime>(() => 
    calculateTimeRemaining(targetDate)
  );

  React.useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(targetDate);
      setCountdown(remaining);

      if (remaining.totalMilliseconds <= 0) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  return countdown;
}

function calculateTimeRemaining(targetDate: Date): CountdownTime {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMilliseconds: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, totalMilliseconds: diff };
}

/**
 * Determine trip status based on dates
 */
function getTripStatus(startDate: Date, endDate: Date): TripStatus {
  const now = new Date();
  const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (now > endDate) return 'completed';
  if (now >= startDate && now <= endDate) return 'ongoing';
  if (hoursUntilStart <= 48) return 'departing_soon';
  return 'upcoming';
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Single countdown unit display
 */
function CountdownUnit({
  value,
  label,
  size = 'default',
}: {
  value: number;
  label: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  const sizeClasses = {
    sm: { container: 'w-12 h-12', value: 'text-lg', label: 'text-[10px]' },
    default: { container: 'w-16 h-16', value: 'text-2xl', label: 'text-xs' },
    lg: { container: 'w-20 h-20', value: 'text-3xl', label: 'text-sm' },
  };

  const classes = sizeClasses[size];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl',
      'bg-white/80 backdrop-blur-sm shadow-sm border border-white/50',
      classes.container
    )}>
      <span className={cn('font-bold tabular-nums text-gray-900', classes.value)}>
        {String(value).padStart(2, '0')}
      </span>
      <span className={cn('text-gray-500 uppercase tracking-wide', classes.label)}>
        {label}
      </span>
    </div>
  );
}

/**
 * Animated departure icon
 */
function DepartureAnimation({ status }: { status: TripStatus }) {
  if (status === 'completed') {
    return (
      <div className="relative">
        <PartyPopper className="h-8 w-8 text-purple-500 animate-bounce" />
        <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" />
      </div>
    );
  }

  if (status === 'ongoing') {
    return (
      <div className="relative">
        <Plane className="h-8 w-8 text-green-500 animate-pulse" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-green-300 rounded-full animate-pulse" />
      </div>
    );
  }

  if (status === 'departing_soon') {
    return (
      <div className="relative animate-bounce">
        <Plane className="h-8 w-8 text-amber-500 transform -rotate-45" />
        <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-ping" />
      </div>
    );
  }

  return <Plane className="h-8 w-8 text-blue-500 transform -rotate-45" />;
}

/**
 * Progress bar showing trip timeline
 */
function TripProgressBar({
  startDate,
  endDate,
  status,
}: {
  startDate: Date;
  endDate: Date;
  status: TripStatus;
}) {
  const now = new Date();
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  const progress = status === 'completed' 
    ? 100 
    : status === 'ongoing' 
      ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
      : 0;

  const config = STATUS_CONFIG[status];

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{formatDate(startDate)}</span>
        <span>{formatDate(endDate)}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500 bg-gradient-to-r', config.gradient)}
          style={{ width: `${progress}%` }}
        />
      </div>
      {status === 'ongoing' && (
        <div className="text-center text-xs text-gray-500 mt-1">
          Day {Math.ceil(elapsed / (1000 * 60 * 60 * 24))} of {Math.ceil(totalDuration / (1000 * 60 * 60 * 24))}
        </div>
      )}
    </div>
  );
}

/**
 * Time of day greeting
 */
function TimeGreeting() {
  const hour = new Date().getHours();
  
  if (hour < 6) return { icon: Moon, text: 'Good night' };
  if (hour < 12) return { icon: Sunrise, text: 'Good morning' };
  if (hour < 18) return { icon: Sun, text: 'Good afternoon' };
  return { icon: Moon, text: 'Good evening' };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// =============================================================================
// MINI VARIANT
// =============================================================================

function TripCountdownMini({
  destination,
  startDate,
  status,
  countdown,
  className,
}: {
  destination: string;
  startDate: Date;
  status: TripStatus;
  countdown: CountdownTime;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];

  if (status === 'completed') {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full', config.bgColor, className)}>
        <CheckCircle className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium text-purple-700">Trip completed</span>
      </div>
    );
  }

  if (status === 'ongoing') {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full', config.bgColor, className)}>
        <PlayCircle className="h-4 w-4 text-green-500 animate-pulse" />
        <span className="text-sm font-medium text-green-700">Currently traveling</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full', config.bgColor, className)}>
      <Timer className="h-4 w-4" />
      <span className="text-sm font-medium tabular-nums">
        {countdown.days}d {countdown.hours}h to go
      </span>
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

function TripCountdownCompact({
  destination,
  startDate,
  status,
  countdown,
  travelerCount,
  className,
}: {
  destination: string;
  startDate: Date;
  status: TripStatus;
  countdown: CountdownTime;
  travelerCount?: number;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div className={cn(
      'rounded-xl border p-4',
      config.bgColor,
      config.borderColor,
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('h-4 w-4', config.color)} />
          <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
        </div>
        {travelerCount && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="h-3 w-3" />
            <span>{travelerCount}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-gray-400" />
        <span className="font-semibold text-gray-900">{destination}</span>
      </div>

      {(status === 'upcoming' || status === 'departing_soon') && (
        <div className="flex justify-center gap-2">
          <CountdownUnit value={countdown.days} label="Days" size="sm" />
          <CountdownUnit value={countdown.hours} label="Hrs" size="sm" />
          <CountdownUnit value={countdown.minutes} label="Min" size="sm" />
        </div>
      )}

      {status === 'ongoing' && (
        <div className="text-center py-2">
          <span className="text-lg font-bold text-green-600">🌴 Enjoy your trip!</span>
        </div>
      )}

      {status === 'completed' && (
        <div className="text-center py-2">
          <span className="text-lg font-bold text-purple-600">✨ Hope you had a great time!</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FULL VARIANT
// =============================================================================

function TripCountdownFull({
  destination,
  destinationImage,
  startDate,
  endDate,
  status,
  countdown,
  bookingReference,
  travelerCount,
  highlights,
  className,
}: {
  destination: string;
  destinationImage?: string;
  startDate: Date;
  endDate: Date;
  status: TripStatus;
  countdown: CountdownTime;
  bookingReference?: string;
  travelerCount?: number;
  highlights?: string[];
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const greeting = TimeGreeting();
  const GreetingIcon = greeting.icon;

  return (
    <div className={cn(
      'rounded-2xl overflow-hidden border shadow-lg',
      className
    )}>
      {/* Header with gradient */}
      <div className={cn(
        'relative px-6 py-8 text-white bg-gradient-to-r',
        config.gradient
      )}>
        {destinationImage && (
          <div 
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${destinationImage})` }}
          />
        )}
        <div className="relative z-10">
          {/* Greeting */}
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <GreetingIcon className="h-4 w-4" />
            <span className="text-sm">{greeting.text}</span>
          </div>

          {/* Destination */}
          <div className="flex items-center gap-3 mb-4">
            <DepartureAnimation status={status} />
            <div>
              <h2 className="text-2xl font-bold">{destination}</h2>
              <p className="text-white/80 text-sm">{config.label}</p>
            </div>
          </div>

          {/* Booking Reference */}
          {bookingReference && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm">
              <Luggage className="h-4 w-4" />
              <span>Ref: {bookingReference}</span>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Section */}
      <div className="px-6 py-6 bg-gradient-to-b from-gray-50 to-white">
        {(status === 'upcoming' || status === 'departing_soon') && (
          <>
            <div className="text-center mb-4">
              <p className="text-gray-600">
                {status === 'departing_soon' ? '🎉 Almost time!' : 'Your adventure begins in'}
              </p>
            </div>
            <div className="flex justify-center gap-3 mb-6">
              <CountdownUnit value={countdown.days} label="Days" size="lg" />
              <CountdownUnit value={countdown.hours} label="Hours" size="lg" />
              <CountdownUnit value={countdown.minutes} label="Minutes" size="lg" />
              <CountdownUnit value={countdown.seconds} label="Seconds" size="lg" />
            </div>
          </>
        )}

        {status === 'ongoing' && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
              <PlayCircle className="h-5 w-5 text-green-600 animate-pulse" />
              <span className="font-semibold text-green-700">You're on your trip!</span>
            </div>
            <p className="text-gray-600">
              Make the most of every moment 🌟
            </p>
          </div>
        )}

        {status === 'completed' && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-4">
              <PartyPopper className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-purple-700">Trip Complete!</span>
            </div>
            <p className="text-gray-600">
              We hope you had an amazing time ✨
            </p>
          </div>
        )}

        {/* Progress Bar */}
        <TripProgressBar startDate={startDate} endDate={endDate} status={status} />

        {/* Trip Details */}
        <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Departure</p>
              <p className="text-sm font-medium">{formatFullDate(startDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Return</p>
              <p className="text-sm font-medium">{formatFullDate(endDate)}</p>
            </div>
          </div>
          {travelerCount && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Travelers</p>
                <p className="text-sm font-medium">{travelerCount} {travelerCount === 1 ? 'person' : 'people'}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-medium">
                {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
        </div>

        {/* Highlights */}
        {highlights && highlights.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Trip Highlights</p>
            <div className="flex flex-wrap gap-2">
              {highlights.map((highlight, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TripCountdown({
  tripId,
  destination,
  destinationImage,
  startDate: startDateProp,
  endDate: endDateProp,
  isPaymentConfirmed,
  bookingReference,
  travelerCount,
  highlights,
  variant = 'default',
  className,
  onTripStart,
  onTripEnd,
}: TripCountdownProps) {
  // Parse dates
  const startDate = React.useMemo(
    () => (startDateProp instanceof Date ? startDateProp : new Date(startDateProp)),
    [startDateProp]
  );
  const endDate = React.useMemo(
    () => (endDateProp instanceof Date ? endDateProp : new Date(endDateProp)),
    [endDateProp]
  );

  // Get status and countdown
  const status = getTripStatus(startDate, endDate);
  const countdown = useCountdown(startDate, onTripStart);

  // Check for trip end
  React.useEffect(() => {
    if (status === 'completed') {
      onTripEnd?.();
    }
  }, [status, onTripEnd]);

  // Don't render if payment not confirmed
  if (!isPaymentConfirmed) {
    return (
      <div className={cn(
        'rounded-xl border border-dashed border-gray-300 p-6 text-center',
        className
      )}>
        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">
          Trip countdown will appear after payment confirmation
        </p>
      </div>
    );
  }

  // Render based on variant
  if (variant === 'mini') {
    return (
      <TripCountdownMini
        destination={destination}
        startDate={startDate}
        status={status}
        countdown={countdown}
        className={className}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <TripCountdownCompact
        destination={destination}
        startDate={startDate}
        status={status}
        countdown={countdown}
        travelerCount={travelerCount}
        className={className}
      />
    );
  }

  if (variant === 'full') {
    return (
      <TripCountdownFull
        destination={destination}
        destinationImage={destinationImage}
        startDate={startDate}
        endDate={endDate}
        status={status}
        countdown={countdown}
        bookingReference={bookingReference}
        travelerCount={travelerCount}
        highlights={highlights}
        className={className}
      />
    );
  }

  // Default variant
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      config.borderColor,
      className
    )}>
      {/* Header */}
      <div className={cn('px-4 py-3 flex items-center justify-between', config.bgColor)}>
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('h-5 w-5', config.color)} />
          <span className={cn('font-medium', config.color)}>{config.label}</span>
        </div>
        {bookingReference && (
          <span className="text-xs text-gray-500">Ref: {bookingReference}</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-gray-400" />
          <span className="text-lg font-semibold text-gray-900">{destination}</span>
        </div>

        {(status === 'upcoming' || status === 'departing_soon') && (
          <div className="flex justify-center gap-2 mb-4">
            <CountdownUnit value={countdown.days} label="Days" />
            <CountdownUnit value={countdown.hours} label="Hrs" />
            <CountdownUnit value={countdown.minutes} label="Min" />
            <CountdownUnit value={countdown.seconds} label="Sec" />
          </div>
        )}

        {status === 'ongoing' && (
          <div className="text-center py-3 mb-4">
            <span className="text-xl font-bold text-green-600">🎉 Have a wonderful trip!</span>
          </div>
        )}

        {status === 'completed' && (
          <div className="text-center py-3 mb-4">
            <span className="text-xl font-bold text-purple-600">✨ Welcome back!</span>
          </div>
        )}

        <TripProgressBar startDate={startDate} endDate={endDate} status={status} />
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function TripCountdownSkeleton({ variant = 'default' }: { variant?: 'mini' | 'compact' | 'default' | 'full' }) {
  if (variant === 'mini') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 animate-pulse">
        <div className="h-4 w-4 rounded-full bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
        </div>
        <div className="h-6 w-32 rounded bg-gray-200 mb-3" />
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-12 h-12 rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="px-4 py-3 bg-gray-100">
        <div className="h-5 w-32 rounded bg-gray-200" />
      </div>
      <div className="p-4">
        <div className="h-6 w-40 rounded bg-gray-200 mb-4" />
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-16 h-16 rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="h-2 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default TripCountdown;
