/**
 * Price Budget Comparison Types
 * 
 * Type definitions for price vs budget visual comparison.
 */

// =============================================================================
// PRICE POSITION
// =============================================================================

/**
 * Classification of price relative to budget.
 */
export type PricePosition = 
  | 'GREAT_VALUE'      // Price <= min budget (exceptional deal)
  | 'UNDER_BUDGET'     // Price between min and midpoint
  | 'WITHIN_BUDGET'    // Price between midpoint and max
  | 'AT_BUDGET'        // Price at or very near max
  | 'OVER_BUDGET';     // Price exceeds max budget

// =============================================================================
// BUDGET RANGE
// =============================================================================

/**
 * User's budget range for a travel request.
 */
export interface BudgetRange {
  readonly min: number;
  readonly max: number;
  readonly currency: string;
}

// =============================================================================
// PRICE ANALYSIS
// =============================================================================

/**
 * Analysis result comparing price to budget.
 */
export interface PriceAnalysis {
  /** Classification of price position */
  readonly position: PricePosition;
  /** Price as percentage of max budget */
  readonly percentOfMax: number;
  /** Price position as percentage within budget range (0-100) */
  readonly percentOfRange: number;
  /** Difference from max budget (positive = under, negative = over) */
  readonly difference: number;
  /** Difference as percentage of max */
  readonly differencePercent: number;
  /** Whether price exceeds max budget */
  readonly isOverBudget: boolean;
  /** Amount saved from max budget (0 if over) */
  readonly savingsFromMax: number;
}

// =============================================================================
// DISPLAY CONFIGURATION
// =============================================================================

/**
 * Display configuration for each price position.
 */
export interface PricePositionConfig {
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly color: string;
  readonly bgColor: string;
  readonly progressColor: string;
  readonly icon: string;
}

/**
 * Configuration map for all price positions.
 */
export const PRICE_POSITION_CONFIG: Record<PricePosition, PricePositionConfig> = {
  GREAT_VALUE: {
    label: 'Great Value!',
    shortLabel: 'Great Value',
    description: 'Below your minimum budget - exceptional deal',
    color: 'emerald',
    bgColor: 'emerald-50',
    progressColor: 'emerald-500',
    icon: 'sparkles',
  },
  UNDER_BUDGET: {
    label: 'Under Budget',
    shortLabel: 'Under',
    description: 'Well within your budget range',
    color: 'green',
    bgColor: 'green-50',
    progressColor: 'green-500',
    icon: 'trending-down',
  },
  WITHIN_BUDGET: {
    label: 'Within Budget',
    shortLabel: 'Within',
    description: 'Fits comfortably in your budget',
    color: 'blue',
    bgColor: 'blue-50',
    progressColor: 'blue-500',
    icon: 'check',
  },
  AT_BUDGET: {
    label: 'At Budget Limit',
    shortLabel: 'At Limit',
    description: 'Near your maximum budget',
    color: 'amber',
    bgColor: 'amber-50',
    progressColor: 'amber-500',
    icon: 'target',
  },
  OVER_BUDGET: {
    label: 'Over Budget',
    shortLabel: 'Over',
    description: 'Exceeds your stated budget',
    color: 'red',
    bgColor: 'red-50',
    progressColor: 'red-500',
    icon: 'trending-up',
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
 * Get the position configuration.
 */
export function getPricePositionConfig(position: PricePosition): PricePositionConfig {
  return PRICE_POSITION_CONFIG[position];
}

/**
 * Format currency amount for India.
 */
export function formatINR(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN')}`;
}
