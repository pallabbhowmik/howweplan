/**
 * Peak Season Detector
 * 
 * Determines if the current period is peak travel season
 * and adjusts matching behavior accordingly.
 * 
 * RULE: Peak-season agent scarcity is expected and must not break UX.
 */

import { peakSeasonConfig } from '../config/index.js';
import { logger } from './logger.js';

/**
 * Peak season period definition
 */
interface PeakSeasonPeriod {
  readonly name: string;
  readonly startMonth: number;
  readonly startDay: number;
  readonly endMonth: number;
  readonly endDay: number;
  readonly regions?: readonly string[];
}

/**
 * Well-known peak travel seasons
 */
const PEAK_SEASONS: readonly PeakSeasonPeriod[] = [
  // Northern hemisphere summer
  {
    name: 'Summer Peak',
    startMonth: 6,
    startDay: 15,
    endMonth: 8,
    endDay: 31,
    regions: ['EUROPE', 'NORTH_AMERICA', 'ASIA'],
  },
  // Christmas/New Year
  {
    name: 'Holiday Season',
    startMonth: 12,
    startDay: 15,
    endMonth: 1,
    endDay: 5,
  },
  // Spring break
  {
    name: 'Spring Break',
    startMonth: 3,
    startDay: 10,
    endMonth: 4,
    endDay: 15,
    regions: ['NORTH_AMERICA', 'CARIBBEAN', 'MEXICO'],
  },
  // Chinese New Year
  {
    name: 'Chinese New Year',
    startMonth: 1,
    startDay: 20,
    endMonth: 2,
    endDay: 15,
    regions: ['ASIA', 'OCEANIA'],
  },
  // Thanksgiving
  {
    name: 'Thanksgiving',
    startMonth: 11,
    startDay: 20,
    endMonth: 11,
    endDay: 30,
    regions: ['NORTH_AMERICA'],
  },
];

/**
 * Check if a date falls within a peak season period
 */
function isDateInPeriod(
  date: Date,
  period: PeakSeasonPeriod
): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Handle periods that span year boundary (e.g., Dec 15 - Jan 5)
  if (period.startMonth > period.endMonth) {
    return (
      (month === period.startMonth && day >= period.startDay) ||
      (month > period.startMonth) ||
      (month < period.endMonth) ||
      (month === period.endMonth && day <= period.endDay)
    );
  }

  // Normal period within same year
  return (
    (month > period.startMonth || (month === period.startMonth && day >= period.startDay)) &&
    (month < period.endMonth || (month === period.endMonth && day <= period.endDay))
  );
}

/**
 * Peak season detection result
 */
export interface PeakSeasonInfo {
  readonly isPeakSeason: boolean;
  readonly activePeriods: readonly string[];
  readonly adjustedMinAgents: number;
  readonly adjustedTimeoutHours: number;
}

/**
 * Detect if current date or trip dates fall in peak season
 */
export function detectPeakSeason(
  tripStartDate: Date,
  tripEndDate: Date,
  destinations: readonly string[],
  baseMinAgents: number,
  baseTimeoutHours: number
): PeakSeasonInfo {
  // Check if peak season mode is enabled
  if (!peakSeasonConfig.enabled) {
    return {
      isPeakSeason: false,
      activePeriods: [],
      adjustedMinAgents: baseMinAgents,
      adjustedTimeoutHours: baseTimeoutHours,
    };
  }

  const now = new Date();
  const activePeriods: string[] = [];

  // Check current date against peak seasons
  for (const period of PEAK_SEASONS) {
    // Check if current booking time is in peak season
    if (isDateInPeriod(now, period)) {
      // Check region filter if specified
      if (!period.regions || destinations.some(d => 
        period.regions?.some(r => d.toUpperCase().includes(r))
      )) {
        activePeriods.push(period.name);
      }
    }

    // Also check if trip dates fall in peak season
    if (isDateInPeriod(tripStartDate, period) || isDateInPeriod(tripEndDate, period)) {
      if (!period.regions || destinations.some(d => 
        period.regions?.some(r => d.toUpperCase().includes(r))
      )) {
        if (!activePeriods.includes(period.name)) {
          activePeriods.push(period.name);
        }
      }
    }
  }

  const isPeakSeason = activePeriods.length > 0;

  // Adjust parameters during peak season
  const adjustedMinAgents = isPeakSeason && peakSeasonConfig.allowSingleAgent
    ? 1
    : baseMinAgents;

  const adjustedTimeoutHours = isPeakSeason
    ? peakSeasonConfig.timeoutHours
    : baseTimeoutHours;

  if (isPeakSeason) {
    logger.info({
      activePeriods,
      adjustedMinAgents,
      adjustedTimeoutHours,
      tripStart: tripStartDate.toISOString(),
      tripEnd: tripEndDate.toISOString(),
    }, 'Peak season detected');
  }

  return {
    isPeakSeason,
    activePeriods,
    adjustedMinAgents,
    adjustedTimeoutHours,
  };
}

/**
 * Get current peak season status without trip context
 */
export function getCurrentPeakSeasonStatus(): {
  isPeakSeason: boolean;
  activePeriods: readonly string[];
} {
  if (!peakSeasonConfig.enabled) {
    return {
      isPeakSeason: false,
      activePeriods: [],
    };
  }

  const now = new Date();
  const activePeriods: string[] = [];

  for (const period of PEAK_SEASONS) {
    if (isDateInPeriod(now, period)) {
      activePeriods.push(period.name);
    }
  }

  return {
    isPeakSeason: activePeriods.length > 0,
    activePeriods,
  };
}
