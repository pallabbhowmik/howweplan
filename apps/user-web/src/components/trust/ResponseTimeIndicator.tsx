'use client';

/**
 * Response Time Indicator Component
 * 
 * Displays an agent's typical response time with visual indicators.
 * Helps users understand how quickly agents typically respond to requests.
 * 
 * Privacy-safe: Only shows aggregate metrics, no personal information.
 */

import * as React from 'react';
import { Clock, Zap, TrendingUp, TrendingDown, Minus, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type ResponseTimeLabel =
  | 'NEW'
  | 'WITHIN_30_MIN'
  | 'WITHIN_1_HOUR'
  | 'WITHIN_2_HOURS'
  | 'WITHIN_4_HOURS'
  | 'WITHIN_8_HOURS'
  | 'WITHIN_24_HOURS'
  | 'MORE_THAN_24_HOURS';

export type ResponseTimeTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

export interface ResponseTimeDisplay {
  label: ResponseTimeLabel;
  displayText: string;
  shortText: string;
  responseRate: number;
  trend: ResponseTimeTrend;
  trendText: string | null;
  isReliable: boolean;
}

export interface ResponseTimeIndicatorProps {
  /** Response time metrics */
  metrics: ResponseTimeDisplay | null;
  /** Display variant */
  variant?: 'default' | 'compact' | 'detailed';
  /** Whether to show the trend indicator */
  showTrend?: boolean;
  /** Whether to show response rate */
  showResponseRate?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const LABEL_CONFIG: Record<ResponseTimeLabel, {
  displayText: string;
  shortText: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  description: string;
}> = {
  NEW: {
    displayText: 'New agent',
    shortText: 'New',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: Sparkles,
    description: 'This agent is new and building their response history.',
  },
  WITHIN_30_MIN: {
    displayText: 'Usually responds in < 30 min',
    shortText: '< 30 min',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: Zap,
    description: 'This agent typically responds very quickly, usually within 30 minutes.',
  },
  WITHIN_1_HOUR: {
    displayText: 'Usually responds in < 1 hour',
    shortText: '< 1 hour',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: Clock,
    description: 'This agent typically responds within an hour.',
  },
  WITHIN_2_HOURS: {
    displayText: 'Usually responds in < 2 hours',
    shortText: '< 2 hours',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Clock,
    description: 'This agent typically responds within a couple of hours.',
  },
  WITHIN_4_HOURS: {
    displayText: 'Usually responds in < 4 hours',
    shortText: '< 4 hours',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Clock,
    description: 'This agent typically responds within half a business day.',
  },
  WITHIN_8_HOURS: {
    displayText: 'Usually responds in < 8 hours',
    shortText: '< 8 hours',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Clock,
    description: 'This agent typically responds within a business day.',
  },
  WITHIN_24_HOURS: {
    displayText: 'Usually responds in < 24 hours',
    shortText: '< 24 hours',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Clock,
    description: 'This agent typically responds within a day.',
  },
  MORE_THAN_24_HOURS: {
    displayText: 'May take > 24 hours to respond',
    shortText: '> 24 hours',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: AlertCircle,
    description: 'This agent may take more than a day to respond.',
  },
};

const TREND_CONFIG: Record<ResponseTimeTrend, {
  icon: React.ElementType;
  color: string;
  text: string;
}> = {
  IMPROVING: {
    icon: TrendingUp,
    color: 'text-green-500',
    text: 'Getting faster',
  },
  STABLE: {
    icon: Minus,
    color: 'text-gray-400',
    text: 'Consistent',
  },
  DECLINING: {
    icon: TrendingDown,
    color: 'text-orange-500',
    text: 'Slowing down',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ResponseTimeIndicator({
  metrics,
  variant = 'default',
  showTrend = true,
  showResponseRate = false,
  className,
}: ResponseTimeIndicatorProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  // Handle null metrics (no data)
  const displayMetrics: ResponseTimeDisplay = metrics || {
    label: 'NEW',
    displayText: 'New agent',
    shortText: 'New',
    responseRate: 0,
    trend: 'STABLE',
    trendText: null,
    isReliable: false,
  };

  const config = LABEL_CONFIG[displayMetrics.label];
  const trendConfig = TREND_CONFIG[displayMetrics.trend];
  const Icon = config.icon;
  const TrendIcon = trendConfig.icon;

  // Compact variant (for lists)
  if (variant === 'compact') {
    return (
      <div 
        className={cn('flex items-center gap-1 relative', className)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Icon className={cn('h-3.5 w-3.5', config.color)} />
        <span className={cn('text-xs font-medium', config.color)}>
          {config.shortText}
        </span>
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-2 text-sm bg-popover text-popover-foreground border rounded-md shadow-md max-w-xs whitespace-nowrap">
            <p>{config.description}</p>
            {!displayMetrics.isReliable && (
              <p className="text-xs text-muted-foreground mt-1">
                Based on limited data
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detailed variant (for profile pages)
  if (variant === 'detailed') {
    return (
      <div className={cn('rounded-lg border p-4', config.bgColor, className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', config.color)} />
            <span className={cn('font-medium', config.color)}>
              {config.displayText}
            </span>
          </div>
          {showTrend && displayMetrics.isReliable && displayMetrics.trend !== 'STABLE' && (
            <div className={cn('flex items-center gap-1', trendConfig.color)}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-xs">{trendConfig.text}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          {config.description}
        </p>

        <div className="flex items-center gap-4 text-sm">
          {showResponseRate && displayMetrics.responseRate > 0 && (
            <div>
              <span className="text-muted-foreground">Response rate: </span>
              <span className="font-medium">{displayMetrics.responseRate}%</span>
            </div>
          )}
          {displayMetrics.trendText && (
            <div className={trendConfig.color}>
              {displayMetrics.trendText}
            </div>
          )}
        </div>

        {!displayMetrics.isReliable && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            * Based on limited data
          </p>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div 
      className={cn('flex items-center gap-2 relative', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md',
        config.bgColor
      )}>
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className={cn('text-sm font-medium', config.color)}>
          {config.shortText}
        </span>
      </div>
      {showTrend && displayMetrics.isReliable && displayMetrics.trend !== 'STABLE' && (
        <TrendIcon className={cn('h-4 w-4', trendConfig.color)} />
      )}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-3 py-2 text-sm bg-popover text-popover-foreground border rounded-md shadow-md max-w-xs">
          <p className="font-medium">{config.displayText}</p>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          {showResponseRate && displayMetrics.responseRate > 0 && (
            <p className="text-sm mt-1">
              Response rate: <span className="font-medium">{displayMetrics.responseRate}%</span>
            </p>
          )}
          {!displayMetrics.isReliable && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Based on limited data
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BADGE VARIANT (for inline use)
// =============================================================================

export function ResponseTimeBadge({
  metrics,
  className,
}: {
  metrics: ResponseTimeDisplay | null;
  className?: string;
}) {
  const label = metrics?.label || 'NEW';
  const config = LABEL_CONFIG[label];
  const Icon = config.icon;

  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      config.bgColor,
      config.color,
      className
    )}>
      <Icon className="h-3 w-3" />
      {config.shortText}
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function ResponseTimeIndicatorSkeleton({
  variant = 'default',
}: {
  variant?: 'default' | 'compact' | 'detailed';
}) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 animate-pulse">
        <div className="h-3.5 w-3.5 rounded bg-muted" />
        <div className="h-3 w-12 rounded bg-muted" />
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="rounded-lg border p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
        <div className="h-4 w-full rounded bg-muted mb-2" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-pulse">
      <div className="h-7 w-20 rounded-md bg-muted" />
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ResponseTimeIndicator;
