'use client';

/**
 * Price vs Budget Visual Comparison Component
 * 
 * Displays a visual comparison of proposal price against user's budget.
 * Helps travelers quickly understand value and budget fit.
 * 
 * Features:
 * - Progress bar showing price position within budget range
 * - Color-coded indicators (under budget = green, near max = yellow, over = red)
 * - Savings/overage amount display
 * - Percentage comparison
 * - Compact and detailed variants
 */

import * as React from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Check, 
  AlertTriangle,
  Sparkles,
  Target,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type PricePosition = 
  | 'GREAT_VALUE'      // Price <= min budget (exceptional deal)
  | 'UNDER_BUDGET'     // Price between min and midpoint
  | 'WITHIN_BUDGET'    // Price between midpoint and max
  | 'AT_BUDGET'        // Price at or very near max
  | 'OVER_BUDGET';     // Price exceeds max budget

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

export interface PriceBudgetComparisonProps {
  /** The proposal/itinerary price */
  price: number;
  /** User's budget range */
  budget: BudgetRange;
  /** Display variant */
  variant?: 'default' | 'compact' | 'detailed' | 'mini';
  /** Whether to show the progress bar */
  showProgressBar?: boolean;
  /** Whether to show exact amounts */
  showAmounts?: boolean;
  /** Number of travelers (for per-person display) */
  travelers?: number;
  /** Additional class names */
  className?: string;
}

export interface PriceAnalysis {
  position: PricePosition;
  percentOfMax: number;
  percentOfRange: number;
  difference: number;
  differencePercent: number;
  isOverBudget: boolean;
  savingsFromMax: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const POSITION_CONFIG: Record<PricePosition, {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  progressColor: string;
  icon: React.ElementType;
}> = {
  GREAT_VALUE: {
    label: 'Great Value!',
    shortLabel: 'Great Value',
    description: 'Below your minimum budget - exceptional deal',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    progressColor: 'bg-emerald-500',
    icon: Sparkles,
  },
  UNDER_BUDGET: {
    label: 'Under Budget',
    shortLabel: 'Under',
    description: 'Well within your budget range',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    progressColor: 'bg-green-500',
    icon: TrendingDown,
  },
  WITHIN_BUDGET: {
    label: 'Within Budget',
    shortLabel: 'Within',
    description: 'Fits comfortably in your budget',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    progressColor: 'bg-blue-500',
    icon: Check,
  },
  AT_BUDGET: {
    label: 'At Budget Limit',
    shortLabel: 'At Limit',
    description: 'Near your maximum budget',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    progressColor: 'bg-amber-500',
    icon: Target,
  },
  OVER_BUDGET: {
    label: 'Over Budget',
    shortLabel: 'Over',
    description: 'Exceeds your stated budget',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    progressColor: 'bg-red-500',
    icon: TrendingUp,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Analyze price position relative to budget.
 */
export function analyzePriceBudget(price: number, budget: BudgetRange): PriceAnalysis {
  const { min, max } = budget;
  const range = max - min;
  const midpoint = min + range / 2;
  
  // Calculate percentages
  const percentOfMax = (price / max) * 100;
  const percentOfRange = range > 0 ? ((price - min) / range) * 100 : 0;
  
  // Calculate difference from max
  const difference = max - price;
  const differencePercent = (difference / max) * 100;
  const isOverBudget = price > max;
  const savingsFromMax = Math.max(0, difference);
  
  // Determine position
  let position: PricePosition;
  
  if (price <= min) {
    position = 'GREAT_VALUE';
  } else if (price <= midpoint) {
    position = 'UNDER_BUDGET';
  } else if (price <= max * 0.95) {
    position = 'WITHIN_BUDGET';
  } else if (price <= max * 1.05) {
    position = 'AT_BUDGET';
  } else {
    position = 'OVER_BUDGET';
  }
  
  return {
    position,
    percentOfMax,
    percentOfRange: Math.min(100, Math.max(0, percentOfRange)),
    difference,
    differencePercent,
    isOverBudget,
    savingsFromMax,
  };
}

/**
 * Format currency amount for display.
 */
export function formatAmount(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

/**
 * Get position label for display.
 */
export function getPositionLabel(analysis: PriceAnalysis): string {
  const config = POSITION_CONFIG[analysis.position];
  
  if (analysis.position === 'OVER_BUDGET') {
    return `${formatAmount(Math.abs(analysis.difference))} over budget`;
  }
  if (analysis.savingsFromMax > 0 && analysis.position !== 'AT_BUDGET') {
    return `${formatAmount(analysis.savingsFromMax)} under max budget`;
  }
  return config.label;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PriceBudgetComparison({
  price,
  budget,
  variant = 'default',
  showProgressBar = true,
  showAmounts = true,
  travelers,
  className,
}: PriceBudgetComparisonProps) {
  const analysis = analyzePriceBudget(price, budget);
  const config = POSITION_CONFIG[analysis.position];
  const Icon = config.icon;
  
  // Calculate per-person if travelers provided
  const perPerson = travelers && travelers > 0 ? Math.round(price / travelers) : null;
  
  // Mini variant (just an icon + short label)
  if (variant === 'mini') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Icon className={cn('h-3.5 w-3.5', config.color)} />
        <span className={cn('text-xs font-medium', config.color)}>
          {config.shortLabel}
        </span>
      </div>
    );
  }
  
  // Compact variant (for list views)
  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Icon className={cn('h-4 w-4', config.color)} />
            <span className={cn('text-sm font-medium', config.color)}>
              {config.shortLabel}
            </span>
          </div>
          {showAmounts && analysis.savingsFromMax > 0 && !analysis.isOverBudget && (
            <span className="text-xs text-green-600 font-medium">
              Save {formatAmount(analysis.savingsFromMax, budget.currency)}
            </span>
          )}
          {showAmounts && analysis.isOverBudget && (
            <span className="text-xs text-red-600 font-medium">
              +{formatAmount(Math.abs(analysis.difference), budget.currency)}
            </span>
          )}
        </div>
        {showProgressBar && (
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', config.progressColor)}
              style={{ width: `${Math.min(100, analysis.percentOfMax)}%` }}
            />
          </div>
        )}
      </div>
    );
  }
  
  // Detailed variant (for proposal detail pages)
  if (variant === 'detailed') {
    return (
      <div className={cn('rounded-lg border p-4', config.bgColor, className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', config.color)} />
            <span className={cn('font-semibold', config.color)}>{config.label}</span>
          </div>
          {!analysis.isOverBudget && analysis.savingsFromMax > 0 && (
            <div className="text-sm font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded">
              Save {formatAmount(analysis.savingsFromMax, budget.currency)}
            </div>
          )}
          {analysis.isOverBudget && (
            <div className="text-sm font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              +{formatAmount(Math.abs(analysis.difference), budget.currency)}
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        {showProgressBar && (
          <div className="mb-3">
            <div className="h-3 bg-white/50 rounded-full overflow-hidden relative">
              {/* Budget range markers */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-gray-300"
                style={{ left: `${(budget.min / budget.max) * 100}%` }}
                title={`Min: ${formatAmount(budget.min, budget.currency)}`}
              />
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
                style={{ left: '100%' }}
              />
              {/* Price fill */}
              <div
                className={cn('h-full rounded-full transition-all duration-500', config.progressColor)}
                style={{ width: `${Math.min(110, analysis.percentOfMax)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Min: {formatAmount(budget.min, budget.currency)}</span>
              <span>Max: {formatAmount(budget.max, budget.currency)}</span>
            </div>
          </div>
        )}
        
        {/* Price Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Proposal Price</span>
            <div className="font-semibold text-gray-900 flex items-center gap-1">
              <IndianRupee className="h-4 w-4" />
              {price.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Your Budget</span>
            <div className="font-medium text-gray-700">
              {formatAmount(budget.min, budget.currency)} - {formatAmount(budget.max, budget.currency)}
            </div>
          </div>
          {perPerson && (
            <div className="col-span-2 pt-2 border-t">
              <span className="text-gray-500">Per Person</span>
              <div className="font-medium text-gray-700">
                {formatAmount(perPerson, budget.currency)} × {travelers} travelers
              </div>
            </div>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-gray-600 mt-3">{config.description}</p>
      </div>
    );
  }
  
  // Default variant
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
          config.bgColor
        )}>
          <Icon className={cn('h-4 w-4', config.color)} />
          <span className={cn('text-sm font-medium', config.color)}>
            {getPositionLabel(analysis)}
          </span>
        </div>
        {showAmounts && (
          <span className="text-sm text-gray-500">
            {Math.round(analysis.percentOfMax)}% of max budget
          </span>
        )}
      </div>
      
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="relative">
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', config.progressColor)}
              style={{ width: `${Math.min(100, analysis.percentOfMax)}%` }}
            />
          </div>
          {/* Over budget indicator */}
          {analysis.isOverBudget && (
            <div 
              className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
              title="Over budget"
            />
          )}
        </div>
      )}
      
      {/* Budget Range Labels */}
      {showAmounts && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatAmount(budget.min, budget.currency)}</span>
          <span>{formatAmount(budget.max, budget.currency)}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BADGE VARIANT (for inline use)
// =============================================================================

export function PriceBudgetBadge({
  price,
  budget,
  className,
}: {
  price: number;
  budget: BudgetRange;
  className?: string;
}) {
  const analysis = analyzePriceBudget(price, budget);
  const config = POSITION_CONFIG[analysis.position];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      config.bgColor,
      config.color,
      className
    )}>
      <Icon className="h-3 w-3" />
      {config.shortLabel}
    </div>
  );
}

// =============================================================================
// SAVINGS HIGHLIGHT (for marketing emphasis)
// =============================================================================

export function SavingsHighlight({
  price,
  budget,
  className,
}: {
  price: number;
  budget: BudgetRange;
  className?: string;
}) {
  const analysis = analyzePriceBudget(price, budget);
  
  if (analysis.isOverBudget || analysis.savingsFromMax <= 0) {
    return null;
  }
  
  // Only show if significant savings (> 5%)
  if (analysis.differencePercent < 5) {
    return null;
  }
  
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg',
      className
    )}>
      <TrendingDown className="h-4 w-4 text-green-600" />
      <span className="text-sm font-medium text-green-700">
        Save {formatAmount(analysis.savingsFromMax, budget.currency)} from your max budget
      </span>
      <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
        -{Math.round(analysis.differencePercent)}%
      </span>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function PriceBudgetComparisonSkeleton({
  variant = 'default',
}: {
  variant?: 'default' | 'compact' | 'detailed' | 'mini';
}) {
  if (variant === 'mini') {
    return (
      <div className="flex items-center gap-1 animate-pulse">
        <div className="h-3.5 w-3.5 rounded bg-muted" />
        <div className="h-3 w-12 rounded bg-muted" />
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div className="flex flex-col gap-1 animate-pulse">
        <div className="flex justify-between">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted" />
      </div>
    );
  }
  
  if (variant === 'detailed') {
    return (
      <div className="rounded-lg border p-4 animate-pulse">
        <div className="flex justify-between mb-3">
          <div className="h-5 w-28 rounded bg-muted" />
          <div className="h-5 w-20 rounded bg-muted" />
        </div>
        <div className="h-3 w-full rounded-full bg-muted mb-3" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="flex justify-between">
        <div className="h-7 w-36 rounded-full bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted" />
      <div className="flex justify-between">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PriceBudgetComparison;
