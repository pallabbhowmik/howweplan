/**
 * Response Time Service
 * 
 * Tracks agent response times to requests and calculates metrics.
 * This data helps users understand how quickly agents typically respond.
 */

import {
  type ResponseEvent,
  type RecordRequestInput,
  type RecordResponseInput,
  type AgentResponseMetrics,
  type ResponseTimeDisplay,
  type ResponseTimeLabel,
  type ResponseTimeTrend,
  type ResponseType,
  formatResponseTimeDisplay,
  getResponseTimeLabelFromMinutes,
} from '@tripcomposer/contracts';
import { responseTimeRepository } from '../repositories';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Minimum sample size for reliable metrics */
const MIN_SAMPLE_SIZE = 5;

/** Rolling window in days for metrics calculation */
const METRICS_WINDOW_DAYS = 90;

/** Business hours (IST): 9 AM to 8 PM */
const BUSINESS_HOURS_START = 9;
const BUSINESS_HOURS_END = 20;

/** Days between trend comparisons */
const TREND_COMPARISON_DAYS = 30;

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

export const responseTimeService = {
  /**
   * Record that an agent received a new request.
   * Called when agent is matched to a travel request.
   */
  async recordRequestReceived(input: RecordRequestInput): Promise<void> {
    const { agentId, requestId, receivedAt = new Date() } = input;

    // Check if we already recorded this request
    const existing = await responseTimeRepository.findEvent(agentId, requestId);
    if (existing) {
      // Already recorded, skip
      return;
    }

    // Determine if within business hours (IST, UTC+5:30)
    const istHour = this.getISTHour(receivedAt);
    const dayOfWeek = receivedAt.getDay(); // 0 = Sunday
    const isBusinessHours = istHour >= BUSINESS_HOURS_START && 
                            istHour < BUSINESS_HOURS_END &&
                            dayOfWeek !== 0; // Not Sunday

    await responseTimeRepository.recordRequest({
      agentId,
      requestId,
      requestReceivedAt: receivedAt,
      wasWithinBusinessHours: isBusinessHours,
      dayOfWeek,
    });
  },

  /**
   * Record that an agent responded to a request.
   * Called when agent submits proposal, sends first message, or declines.
   */
  async recordResponse(input: RecordResponseInput): Promise<void> {
    const { agentId, requestId, responseType, respondedAt = new Date() } = input;

    // Find the request event
    const requestEvent = await responseTimeRepository.findEvent(agentId, requestId);
    
    if (!requestEvent) {
      // No request event found - might be a legacy request
      // Create both events together
      await this.recordRequestReceived({
        agentId,
        requestId,
        receivedAt: respondedAt, // Use response time as received time (worst case)
      });
    }

    // Check if already responded (only count first response)
    const existingResponse = await responseTimeRepository.findEvent(agentId, requestId);
    if (existingResponse?.firstResponseAt) {
      // Already has a response, skip
      return;
    }

    // Calculate response time in minutes
    const receivedAt = requestEvent?.requestReceivedAt || respondedAt;
    const responseTimeMinutes = Math.round(
      (respondedAt.getTime() - receivedAt.getTime()) / (1000 * 60)
    );

    await responseTimeRepository.recordResponse({
      agentId,
      requestId,
      firstResponseAt: respondedAt,
      responseTimeMinutes: Math.max(0, responseTimeMinutes), // Ensure non-negative
      responseType,
    });

    // Trigger metrics recalculation (async, don't wait)
    this.recalculateMetrics(agentId).catch((err) => {
      console.error(`Failed to recalculate response metrics for agent ${agentId}:`, err);
    });
  },

  /**
   * Mark a request as expired (no response within allowed time).
   * Called by a scheduled job or when request is cancelled.
   */
  async markRequestExpired(agentId: string, requestId: string): Promise<void> {
    const requestEvent = await responseTimeRepository.findEvent(agentId, requestId);
    
    if (!requestEvent || requestEvent.firstResponseAt) {
      // No request found or already responded
      return;
    }

    await responseTimeRepository.recordResponse({
      agentId,
      requestId,
      firstResponseAt: new Date(),
      responseTimeMinutes: null, // No valid response time
      responseType: 'EXPIRED',
    });

    // Recalculate metrics
    this.recalculateMetrics(agentId).catch(console.error);
  },

  /**
   * Get response time metrics for an agent.
   */
  async getMetrics(agentId: string): Promise<AgentResponseMetrics | null> {
    return responseTimeRepository.getMetrics(agentId);
  },

  /**
   * Get response time display for UI.
   * Safe to expose pre-payment.
   */
  async getDisplayMetrics(agentId: string): Promise<ResponseTimeDisplay> {
    const metrics = await this.getMetrics(agentId);
    return formatResponseTimeDisplay(metrics);
  },

  /**
   * Get response time metrics for multiple agents.
   * Efficient batch operation for listing pages.
   */
  async getBatchDisplayMetrics(agentIds: string[]): Promise<Map<string, ResponseTimeDisplay>> {
    const results = new Map<string, ResponseTimeDisplay>();
    
    if (agentIds.length === 0) {
      return results;
    }

    const metricsList = await responseTimeRepository.getBatchMetrics(agentIds);
    
    for (const agentId of agentIds) {
      const metrics = metricsList.find((m: AgentResponseMetrics) => m.agentId === agentId) || null;
      results.set(agentId, formatResponseTimeDisplay(metrics));
    }

    return results;
  },

  /**
   * Recalculate and cache metrics for an agent.
   * Called after recording responses.
   */
  async recalculateMetrics(agentId: string): Promise<AgentResponseMetrics> {
    // Get recent events
    const events = await responseTimeRepository.getRecentEvents(agentId, METRICS_WINDOW_DAYS);

    // Calculate counts
    const totalRequestsReceived = events.length;
    const respondedEvents = events.filter((e: ResponseEvent) => e.firstResponseAt && e.responseType !== 'EXPIRED');
    const totalResponses = respondedEvents.length;
    const totalProposals = events.filter((e: ResponseEvent) => e.responseType === 'PROPOSAL_SUBMITTED').length;
    const totalDeclined = events.filter((e: ResponseEvent) => e.responseType === 'DECLINED').length;
    const totalExpired = events.filter((e: ResponseEvent) => e.responseType === 'EXPIRED').length;

    // Calculate response rate
    const responseRate = totalRequestsReceived > 0 
      ? (totalResponses / totalRequestsReceived) * 100 
      : 0;

    // Get response times (excluding nulls and expired)
    const responseTimes = respondedEvents
      .filter((e: ResponseEvent) => e.responseTimeMinutes !== null)
      .map((e: ResponseEvent) => e.responseTimeMinutes as number)
      .sort((a: number, b: number) => a - b);

    // Calculate percentiles
    const responseTimeP50 = this.percentile(responseTimes, 50);
    const responseTimeP75 = this.percentile(responseTimes, 75);
    const responseTimeP90 = this.percentile(responseTimes, 90);
    const responseTimeAvg = responseTimes.length > 0 
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length 
      : null;
    const responseTimeMin = responseTimes.length > 0 ? responseTimes[0] : null;
    const responseTimeMax = responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : null;

    // Calculate business hours vs after hours
    const businessHoursTimes = respondedEvents
      .filter((e: ResponseEvent) => e.wasWithinBusinessHours && e.responseTimeMinutes !== null)
      .map((e: ResponseEvent) => e.responseTimeMinutes as number)
      .sort((a: number, b: number) => a - b);
    
    const afterHoursTimes = respondedEvents
      .filter((e: ResponseEvent) => !e.wasWithinBusinessHours && e.responseTimeMinutes !== null)
      .map((e: ResponseEvent) => e.responseTimeMinutes as number)
      .sort((a: number, b: number) => a - b);

    const businessHoursP50 = this.percentile(businessHoursTimes, 50);
    const afterHoursP50 = this.percentile(afterHoursTimes, 50);

    // Calculate trend (compare last 30 days vs previous 30 days)
    const { trend, trendChangeMinutes } = await this.calculateTrend(agentId, events);

    // Get label
    const responseTimeLabel = getResponseTimeLabelFromMinutes(responseTimeP50);

    // Get last response
    const lastResponseEvent = events
      .filter((e: ResponseEvent) => e.firstResponseAt)
      .sort((a: ResponseEvent, b: ResponseEvent) => 
        (b.firstResponseAt?.getTime() || 0) - (a.firstResponseAt?.getTime() || 0)
      )[0];

    const metrics: AgentResponseMetrics = {
      agentId,
      totalRequestsReceived,
      totalResponses,
      totalProposals,
      totalDeclined,
      totalExpired,
      responseRate,
      responseTimeP50,
      responseTimeP75,
      responseTimeP90,
      responseTimeAvg,
      responseTimeMin,
      responseTimeMax,
      responseTimeLabel,
      businessHoursP50,
      afterHoursP50,
      trend,
      trendChangeMinutes,
      sampleSize: responseTimes.length,
      lastResponseAt: lastResponseEvent?.firstResponseAt || null,
      lastRecalculatedAt: new Date(),
    };

    // Save to repository (cache)
    await responseTimeRepository.saveMetrics(metrics);

    return metrics;
  },

  /**
   * Helper: Calculate percentile value.
   */
  percentile(sortedArray: number[], p: number): number | null {
    if (sortedArray.length === 0) return null;
    
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const fraction = index - lower;
    return sortedArray[lower] + fraction * (sortedArray[upper] - sortedArray[lower]);
  },

  /**
   * Helper: Calculate trend compared to previous period.
   */
  async calculateTrend(
    agentId: string,
    recentEvents: ResponseEvent[]
  ): Promise<{ trend: ResponseTimeTrend; trendChangeMinutes: number }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - TREND_COMPARISON_DAYS * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 2 * TREND_COMPARISON_DAYS * 24 * 60 * 60 * 1000);

    // Split into current and previous periods
    const currentPeriod = recentEvents.filter(e => 
      e.requestReceivedAt >= thirtyDaysAgo && 
      e.responseTimeMinutes !== null
    );
    const previousPeriod = recentEvents.filter(e => 
      e.requestReceivedAt >= sixtyDaysAgo && 
      e.requestReceivedAt < thirtyDaysAgo &&
      e.responseTimeMinutes !== null
    );

    // Need minimum samples in both periods
    if (currentPeriod.length < 3 || previousPeriod.length < 3) {
      return { trend: 'STABLE', trendChangeMinutes: 0 };
    }

    // Calculate P50 for each period
    const currentTimes = currentPeriod
      .map(e => e.responseTimeMinutes as number)
      .sort((a, b) => a - b);
    const previousTimes = previousPeriod
      .map(e => e.responseTimeMinutes as number)
      .sort((a, b) => a - b);

    const currentP50 = this.percentile(currentTimes, 50) || 0;
    const previousP50 = this.percentile(previousTimes, 50) || 0;

    const change = currentP50 - previousP50;
    const threshold = 10; // 10 minutes is significant

    if (change < -threshold) {
      return { trend: 'IMPROVING', trendChangeMinutes: Math.abs(change) };
    } else if (change > threshold) {
      return { trend: 'DECLINING', trendChangeMinutes: Math.abs(change) };
    }

    return { trend: 'STABLE', trendChangeMinutes: Math.abs(change) };
  },

  /**
   * Helper: Get IST hour from UTC date.
   */
  getISTHour(date: Date): number {
    // IST is UTC+5:30
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    const totalMinutes = utcHours * 60 + utcMinutes + 330; // +5:30 = 330 minutes
    return Math.floor(totalMinutes / 60) % 24;
  },

  /**
   * Initialize metrics for a new agent.
   */
  async initializeMetrics(agentId: string): Promise<AgentResponseMetrics> {
    const metrics: AgentResponseMetrics = {
      agentId,
      totalRequestsReceived: 0,
      totalResponses: 0,
      totalProposals: 0,
      totalDeclined: 0,
      totalExpired: 0,
      responseRate: 0,
      responseTimeP50: null,
      responseTimeP75: null,
      responseTimeP90: null,
      responseTimeAvg: null,
      responseTimeMin: null,
      responseTimeMax: null,
      responseTimeLabel: 'NEW',
      businessHoursP50: null,
      afterHoursP50: null,
      trend: 'STABLE',
      trendChangeMinutes: 0,
      sampleSize: 0,
      lastResponseAt: null,
      lastRecalculatedAt: new Date(),
    };

    await responseTimeRepository.saveMetrics(metrics);
    return metrics;
  },
};

export default responseTimeService;
