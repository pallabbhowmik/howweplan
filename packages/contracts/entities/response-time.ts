/**
 * Response Time Types
 * 
 * Type definitions for the agent response time tracking system.
 */

// =============================================================================
// RESPONSE TIME LABELS
// =============================================================================

/**
 * Display labels for response time ranges.
 * Derived from P50 response time in minutes.
 */
export type ResponseTimeLabel =
  | 'NEW'                    // No data yet
  | 'WITHIN_30_MIN'          // P50 <= 30 min
  | 'WITHIN_1_HOUR'          // P50 <= 60 min  
  | 'WITHIN_2_HOURS'         // P50 <= 120 min
  | 'WITHIN_4_HOURS'         // P50 <= 240 min
  | 'WITHIN_8_HOURS'         // P50 <= 480 min
  | 'WITHIN_24_HOURS'        // P50 <= 1440 min
  | 'MORE_THAN_24_HOURS';    // P50 > 1440 min

/**
 * Trend direction for response time changes.
 */
export type ResponseTimeTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

/**
 * Type of response the agent made.
 */
export type ResponseType = 
  | 'PROPOSAL_SUBMITTED'   // Agent submitted itinerary/proposal
  | 'MESSAGE_SENT'         // Agent sent first message
  | 'DECLINED'             // Agent declined the request
  | 'EXPIRED';             // Request expired without response

// =============================================================================
// RESPONSE EVENT
// =============================================================================

/**
 * Individual response event record.
 * Tracks a single request-to-response interaction.
 */
export interface ResponseEvent {
  readonly id: string;
  readonly agentId: string;
  readonly requestId: string;
  readonly requestReceivedAt: Date;
  readonly firstResponseAt: Date | null;
  readonly responseTimeMinutes: number | null;
  readonly responseType: ResponseType | null;
  readonly wasWithinBusinessHours: boolean;
  readonly dayOfWeek: number;
  readonly createdAt: Date;
}

/**
 * Input for recording a new request received.
 */
export interface RecordRequestInput {
  readonly agentId: string;
  readonly requestId: string;
  readonly receivedAt?: Date;
}

/**
 * Input for recording an agent's response.
 */
export interface RecordResponseInput {
  readonly agentId: string;
  readonly requestId: string;
  readonly responseType: ResponseType;
  readonly respondedAt?: Date;
}

// =============================================================================
// RESPONSE METRICS
// =============================================================================

/**
 * Aggregated response time metrics for an agent.
 * Pre-calculated for fast display.
 */
export interface AgentResponseMetrics {
  readonly agentId: string;
  
  // Counts (last 90 days)
  readonly totalRequestsReceived: number;
  readonly totalResponses: number;
  readonly totalProposals: number;
  readonly totalDeclined: number;
  readonly totalExpired: number;
  
  // Response rate (percentage)
  readonly responseRate: number;
  
  // Response time percentiles (in minutes)
  readonly responseTimeP50: number | null;
  readonly responseTimeP75: number | null;
  readonly responseTimeP90: number | null;
  readonly responseTimeAvg: number | null;
  readonly responseTimeMin: number | null;
  readonly responseTimeMax: number | null;
  
  // Display label
  readonly responseTimeLabel: ResponseTimeLabel;
  
  // Business hours breakdown
  readonly businessHoursP50: number | null;
  readonly afterHoursP50: number | null;
  
  // Trend
  readonly trend: ResponseTimeTrend;
  readonly trendChangeMinutes: number;
  
  // Metadata
  readonly sampleSize: number;
  readonly lastResponseAt: Date | null;
  readonly lastRecalculatedAt: Date;
}

// =============================================================================
// DISPLAY TYPES
// =============================================================================

/**
 * Response time display data for UI components.
 * Safe to expose pre-payment.
 */
export interface ResponseTimeDisplay {
  readonly label: ResponseTimeLabel;
  readonly displayText: string;
  readonly shortText: string;
  readonly responseRate: number;
  readonly trend: ResponseTimeTrend;
  readonly trendText: string | null;
  readonly isReliable: boolean; // true if sample size >= 5
}

/**
 * Configuration for response time labels.
 */
export interface ResponseTimeLabelConfig {
  readonly label: ResponseTimeLabel;
  readonly maxMinutes: number;
  readonly displayText: string;
  readonly shortText: string;
  readonly color: string;
  readonly icon: string;
}

// =============================================================================
// LABEL CONFIGURATION
// =============================================================================

export const RESPONSE_TIME_LABELS: Record<ResponseTimeLabel, ResponseTimeLabelConfig> = {
  NEW: {
    label: 'NEW',
    maxMinutes: -1,
    displayText: 'New agent',
    shortText: 'New',
    color: 'gray',
    icon: 'sparkles',
  },
  WITHIN_30_MIN: {
    label: 'WITHIN_30_MIN',
    maxMinutes: 30,
    displayText: 'Usually responds within 30 minutes',
    shortText: '< 30 min',
    color: 'green',
    icon: 'zap',
  },
  WITHIN_1_HOUR: {
    label: 'WITHIN_1_HOUR',
    maxMinutes: 60,
    displayText: 'Usually responds within 1 hour',
    shortText: '< 1 hour',
    color: 'green',
    icon: 'clock',
  },
  WITHIN_2_HOURS: {
    label: 'WITHIN_2_HOURS',
    maxMinutes: 120,
    displayText: 'Usually responds within 2 hours',
    shortText: '< 2 hours',
    color: 'blue',
    icon: 'clock',
  },
  WITHIN_4_HOURS: {
    label: 'WITHIN_4_HOURS',
    maxMinutes: 240,
    displayText: 'Usually responds within 4 hours',
    shortText: '< 4 hours',
    color: 'blue',
    icon: 'clock',
  },
  WITHIN_8_HOURS: {
    label: 'WITHIN_8_HOURS',
    maxMinutes: 480,
    displayText: 'Usually responds within 8 hours',
    shortText: '< 8 hours',
    color: 'yellow',
    icon: 'clock',
  },
  WITHIN_24_HOURS: {
    label: 'WITHIN_24_HOURS',
    maxMinutes: 1440,
    displayText: 'Usually responds within 24 hours',
    shortText: '< 24 hours',
    color: 'yellow',
    icon: 'clock',
  },
  MORE_THAN_24_HOURS: {
    label: 'MORE_THAN_24_HOURS',
    maxMinutes: Infinity,
    displayText: 'May take more than 24 hours to respond',
    shortText: '> 24 hours',
    color: 'orange',
    icon: 'clock',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get response time label from P50 minutes.
 */
export function getResponseTimeLabelFromMinutes(p50Minutes: number | null): ResponseTimeLabel {
  if (p50Minutes === null) return 'NEW';
  if (p50Minutes <= 30) return 'WITHIN_30_MIN';
  if (p50Minutes <= 60) return 'WITHIN_1_HOUR';
  if (p50Minutes <= 120) return 'WITHIN_2_HOURS';
  if (p50Minutes <= 240) return 'WITHIN_4_HOURS';
  if (p50Minutes <= 480) return 'WITHIN_8_HOURS';
  if (p50Minutes <= 1440) return 'WITHIN_24_HOURS';
  return 'MORE_THAN_24_HOURS';
}

/**
 * Get display configuration for a response time label.
 */
export function getResponseTimeConfig(label: ResponseTimeLabel): ResponseTimeLabelConfig {
  return RESPONSE_TIME_LABELS[label];
}

/**
 * Format response time display.
 */
export function formatResponseTimeDisplay(metrics: AgentResponseMetrics | null): ResponseTimeDisplay {
  if (!metrics) {
    return {
      label: 'NEW',
      displayText: 'New agent',
      shortText: 'New',
      responseRate: 0,
      trend: 'STABLE',
      trendText: null,
      isReliable: false,
    };
  }

  const config = RESPONSE_TIME_LABELS[metrics.responseTimeLabel];
  const isReliable = metrics.sampleSize >= 5;

  let trendText: string | null = null;
  if (isReliable && metrics.trend !== 'STABLE') {
    const absChange = Math.abs(metrics.trendChangeMinutes);
    if (absChange >= 10) {
      trendText = metrics.trend === 'IMPROVING' 
        ? `${absChange} min faster than before`
        : `${absChange} min slower than before`;
    }
  }

  return {
    label: metrics.responseTimeLabel,
    displayText: config.displayText,
    shortText: config.shortText,
    responseRate: Math.round(metrics.responseRate),
    trend: metrics.trend,
    trendText,
    isReliable,
  };
}

/**
 * Get trend icon and color.
 */
export function getTrendDisplay(trend: ResponseTimeTrend): { icon: string; color: string; text: string } {
  switch (trend) {
    case 'IMPROVING':
      return { icon: 'trending-up', color: 'green', text: 'Improving' };
    case 'DECLINING':
      return { icon: 'trending-down', color: 'orange', text: 'Slowing' };
    default:
      return { icon: 'minus', color: 'gray', text: 'Stable' };
  }
}
