/**
 * Marketplace Metrics Service
 * 
 * Monitors supply/demand balance across the platform to ensure healthy
 * marketplace operations and enable data-driven decisions.
 * 
 * BUSINESS RULES:
 * - Daily snapshots of marketplace health
 * - Alert when supply/demand imbalance detected
 * - Track response times and conversion rates
 * - Support admin dashboard metrics
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface MarketplaceSnapshot {
    id: string;
    snapshotDate: Date;
    destination: string | null;
    // Demand metrics
    pendingRequests: number;
    newRequestsToday: number;
    totalActiveRequests: number;
    // Supply metrics
    availableAdvisors: number;
    advisorsOnVacation: number;
    advisorsAtCapacity: number;
    // Performance metrics
    avgResponseTimeHours: number | null;
    medianResponseTimeHours: number | null;
    matchSuccessRate: number | null;
    bookingConversionRate: number | null;
    // Quality metrics
    avgRequestQualityScore: number | null;
    requestsBelowQualityThreshold: number;
    // Platform health
    supplyDemandRatio: number;
    estimatedWaitTimeHours: number | null;
    healthScore: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
    createdAt: Date;
}

export interface DestinationHealth {
    destination: string;
    pendingRequests: number;
    availableAdvisors: number;
    supplyDemandRatio: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
    trendDirection: 'improving' | 'stable' | 'declining';
}

export interface MarketplaceSummary {
    overallHealth: 'healthy' | 'warning' | 'critical';
    healthScore: number;
    totalPendingRequests: number;
    totalAvailableAdvisors: number;
    avgResponseTimeHours: number;
    matchSuccessRate: number;
    topDemandDestinations: string[];
    lowSupplyDestinations: string[];
    recommendedActions: string[];
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const HEALTH_THRESHOLDS = {
    // Supply/demand ratio thresholds
    CRITICAL_RATIO: 0.3,    // Less than 0.3 advisors per request = critical
    WARNING_RATIO: 0.5,     // Less than 0.5 advisors per request = warning
    HEALTHY_RATIO: 1.0,     // 1+ advisors per request = healthy

    // Response time thresholds (hours)
    TARGET_RESPONSE_TIME: 4,
    WARNING_RESPONSE_TIME: 12,
    CRITICAL_RESPONSE_TIME: 24,

    // Success rate thresholds
    TARGET_MATCH_RATE: 0.85,
    WARNING_MATCH_RATE: 0.70,
    CRITICAL_MATCH_RATE: 0.50,

    // Quality score threshold
    MIN_QUALITY_SCORE: 40,
};

// =============================================================================
// MARKETPLACE METRICS SERVICE
// =============================================================================

export class MarketplaceMetricsService {
    private readonly supabase: SupabaseClient;

    constructor(supabaseUrl: string, supabaseServiceKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    /**
     * Generate daily marketplace health snapshot.
     * Called by scheduled job.
     */
    async generateDailySnapshot(destination?: string): Promise<MarketplaceSnapshot> {
        const snapshotDate = new Date().toISOString().split('T')[0];

        // Gather all metrics
        const [
            demandMetrics,
            supplyMetrics,
            performanceMetrics,
            qualityMetrics,
        ] = await Promise.all([
            this.getDemandMetrics(destination),
            this.getSupplyMetrics(destination),
            this.getPerformanceMetrics(destination),
            this.getQualityMetrics(destination),
        ]);

        // Calculate derived metrics
        const supplyDemandRatio = demandMetrics.totalActiveRequests > 0
            ? supplyMetrics.availableAdvisors / demandMetrics.totalActiveRequests
            : supplyMetrics.availableAdvisors;

        const healthScore = this.calculateHealthScore({
            supplyDemandRatio,
            avgResponseTimeHours: performanceMetrics.avgResponseTimeHours,
            matchSuccessRate: performanceMetrics.matchSuccessRate,
        });

        const healthStatus = this.getHealthStatus(healthScore);

        const estimatedWaitTimeHours = this.estimateWaitTime(
            demandMetrics.totalActiveRequests,
            supplyMetrics.availableAdvisors,
            performanceMetrics.avgResponseTimeHours
        );

        // Insert snapshot
        const { data, error } = await this.supabase
            .from('marketplace_health_snapshots')
            .upsert({
                snapshot_date: snapshotDate,
                destination: destination || null,
                pending_requests: demandMetrics.pendingRequests,
                new_requests_today: demandMetrics.newRequestsToday,
                total_active_requests: demandMetrics.totalActiveRequests,
                available_advisors: supplyMetrics.availableAdvisors,
                advisors_on_vacation: supplyMetrics.advisorsOnVacation,
                advisors_at_capacity: supplyMetrics.advisorsAtCapacity,
                avg_response_time_hours: performanceMetrics.avgResponseTimeHours,
                median_response_time_hours: performanceMetrics.medianResponseTimeHours,
                match_success_rate: performanceMetrics.matchSuccessRate,
                booking_conversion_rate: performanceMetrics.bookingConversionRate,
                avg_request_quality_score: qualityMetrics.avgQualityScore,
                requests_below_quality_threshold: qualityMetrics.belowThresholdCount,
                supply_demand_ratio: supplyDemandRatio,
                estimated_wait_time_hours: estimatedWaitTimeHours,
                health_score: healthScore,
                health_status: healthStatus,
            }, {
                onConflict: 'snapshot_date,destination',
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create snapshot: ${error.message}`);
        }

        logger.info({
            snapshotDate,
            destination,
            healthScore,
            healthStatus,
        }, 'Generated marketplace health snapshot');

        return this.mapToSnapshot(data);
    }

    /**
     * Get current marketplace summary (real-time).
     */
    async getMarketplaceSummary(): Promise<MarketplaceSummary> {
        const [demandMetrics, supplyMetrics, performanceMetrics] = await Promise.all([
            this.getDemandMetrics(),
            this.getSupplyMetrics(),
            this.getPerformanceMetrics(),
        ]);

        const supplyDemandRatio = demandMetrics.totalActiveRequests > 0
            ? supplyMetrics.availableAdvisors / demandMetrics.totalActiveRequests
            : supplyMetrics.availableAdvisors;

        const healthScore = this.calculateHealthScore({
            supplyDemandRatio,
            avgResponseTimeHours: performanceMetrics.avgResponseTimeHours,
            matchSuccessRate: performanceMetrics.matchSuccessRate,
        });

        // Get destination-specific insights
        const destinationHealth = await this.getDestinationBreakdown();

        const topDemandDestinations = destinationHealth
            .sort((a, b) => b.pendingRequests - a.pendingRequests)
            .slice(0, 5)
            .map(d => d.destination);

        const lowSupplyDestinations = destinationHealth
            .filter(d => d.healthStatus !== 'healthy')
            .sort((a, b) => a.supplyDemandRatio - b.supplyDemandRatio)
            .slice(0, 5)
            .map(d => d.destination);

        const recommendedActions = this.generateRecommendations({
            healthScore,
            supplyDemandRatio,
            avgResponseTimeHours: performanceMetrics.avgResponseTimeHours || 0,
            lowSupplyDestinations,
            advisorsAtCapacity: supplyMetrics.advisorsAtCapacity,
            advisorsOnVacation: supplyMetrics.advisorsOnVacation,
        });

        return {
            overallHealth: this.getHealthStatus(healthScore),
            healthScore,
            totalPendingRequests: demandMetrics.pendingRequests,
            totalAvailableAdvisors: supplyMetrics.availableAdvisors,
            avgResponseTimeHours: performanceMetrics.avgResponseTimeHours || 0,
            matchSuccessRate: performanceMetrics.matchSuccessRate || 0,
            topDemandDestinations,
            lowSupplyDestinations,
            recommendedActions,
        };
    }

    /**
     * Get health history for trending.
     */
    async getHealthHistory(
        days: number = 30,
        destination?: string
    ): Promise<MarketplaceSnapshot[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        let query = this.supabase
            .from('marketplace_health_snapshots')
            .select('*')
            .gte('snapshot_date', startDate.toISOString().split('T')[0])
            .order('snapshot_date', { ascending: true });

        if (destination) {
            query = query.eq('destination', destination);
        } else {
            query = query.is('destination', null);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to get health history: ${error.message}`);
        }

        return (data || []).map(this.mapToSnapshot);
    }

    /**
     * Get destination-specific health breakdown.
     */
    async getDestinationBreakdown(): Promise<DestinationHealth[]> {
        // Get pending requests by destination
        const { data: requestData } = await this.supabase
            .from('travel_requests')
            .select('destination')
            .in('state', ['submitted', 'matched'])
            .not('destination', 'is', null);

        // Count by destination
        const requestCounts = new Map<string, number>();
        for (const req of requestData || []) {
            const dest = req.destination as string;
            requestCounts.set(dest, (requestCounts.get(dest) || 0) + 1);
        }

        // Get advisor specializations
        const { data: agentData } = await this.supabase
            .from('agents')
            .select('specializations')
            .eq('is_verified', true);

        // Count advisors by destination specialization (simplified)
        const advisorCounts = new Map<string, number>();
        for (const agent of agentData || []) {
            const specs = agent.specializations as string[] || [];
            for (const spec of specs) {
                advisorCounts.set(spec, (advisorCounts.get(spec) || 0) + 1);
            }
        }

        // Build health data
        const destinations = [...new Set([...requestCounts.keys(), ...advisorCounts.keys()])];

        return destinations.map(destination => {
            const pending = requestCounts.get(destination) || 0;
            const available = advisorCounts.get(destination) || 0;
            const ratio = pending > 0 ? available / pending : available;

            return {
                destination,
                pendingRequests: pending,
                availableAdvisors: available,
                supplyDemandRatio: ratio,
                healthStatus: this.getHealthStatusFromRatio(ratio),
                trendDirection: 'stable' as const, // Would need historical data for trend
            };
        });
    }

    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================

    private async getDemandMetrics(destination?: string): Promise<{
        pendingRequests: number;
        newRequestsToday: number;
        totalActiveRequests: number;
    }> {
        const today = new Date().toISOString().split('T')[0];

        let pendingQuery = this.supabase
            .from('travel_requests')
            .select('id', { count: 'exact', head: true })
            .eq('state', 'submitted');

        let newTodayQuery = this.supabase
            .from('travel_requests')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', today);

        let activeQuery = this.supabase
            .from('travel_requests')
            .select('id', { count: 'exact', head: true })
            .in('state', ['submitted', 'matched', 'proposals_received']);

        if (destination) {
            pendingQuery = pendingQuery.eq('destination', destination);
            newTodayQuery = newTodayQuery.eq('destination', destination);
            activeQuery = activeQuery.eq('destination', destination);
        }

        const [pending, newToday, active] = await Promise.all([
            pendingQuery,
            newTodayQuery,
            activeQuery,
        ]);

        return {
            pendingRequests: pending.count || 0,
            newRequestsToday: newToday.count || 0,
            totalActiveRequests: active.count || 0,
        };
    }

    private async getSupplyMetrics(_destination?: string): Promise<{
        availableAdvisors: number;
        advisorsOnVacation: number;
        advisorsAtCapacity: number;
    }> {
        // Total verified advisors
        const { count: total } = await this.supabase
            .from('agents')
            .select('id', { count: 'exact', head: true })
            .eq('is_verified', true);

        // On vacation
        const { count: onVacation } = await this.supabase
            .from('advisor_workload_limits')
            .select('agent_id', { count: 'exact', head: true })
            .eq('vacation_mode', true);

        // At capacity
        const { data: workloadData } = await this.supabase
            .from('advisor_workload_limits')
            .select('current_active_requests, max_active_requests');

        const atCapacity = (workloadData || []).filter(
            w => w.current_active_requests >= w.max_active_requests
        ).length;

        const available = Math.max(0, (total || 0) - (onVacation || 0) - atCapacity);

        return {
            availableAdvisors: available,
            advisorsOnVacation: onVacation || 0,
            advisorsAtCapacity: atCapacity,
        };
    }

    private async getPerformanceMetrics(_destination?: string): Promise<{
        avgResponseTimeHours: number | null;
        medianResponseTimeHours: number | null;
        matchSuccessRate: number | null;
        bookingConversionRate: number | null;
    }> {
        // Get response metrics from recent matches (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: matchData } = await this.supabase
            .from('agent_matches')
            .select('created_at, responded_at, status')
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (!matchData || matchData.length === 0) {
            return {
                avgResponseTimeHours: null,
                medianResponseTimeHours: null,
                matchSuccessRate: null,
                bookingConversionRate: null,
            };
        }

        // Calculate response times
        const responseTimes: number[] = [];
        let acceptedCount = 0;

        for (const match of matchData) {
            if (match.responded_at) {
                const responseTime =
                    (new Date(match.responded_at).getTime() - new Date(match.created_at).getTime()) /
                    (1000 * 60 * 60);
                responseTimes.push(responseTime);
            }
            if (match.status === 'accepted' || match.status === 'proposal_sent') {
                acceptedCount++;
            }
        }

        const avgResponseTimeHours = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : null;

        const sortedTimes = [...responseTimes].sort((a, b) => a - b);
        const medianResponseTimeHours = sortedTimes.length > 0
            ? (sortedTimes[Math.floor(sortedTimes.length / 2)] ?? null)
            : null;

        const matchSuccessRate = matchData.length > 0
            ? acceptedCount / matchData.length
            : null;

        // Booking conversion would need booking data
        const bookingConversionRate = null; // TODO: Calculate from bookings

        return {
            avgResponseTimeHours,
            medianResponseTimeHours,
            matchSuccessRate,
            bookingConversionRate,
        };
    }

    private async getQualityMetrics(_destination?: string): Promise<{
        avgQualityScore: number | null;
        belowThresholdCount: number;
    }> {
        const { data } = await this.supabase
            .from('request_quality_scores')
            .select('total_score');

        if (!data || data.length === 0) {
            return { avgQualityScore: null, belowThresholdCount: 0 };
        }

        const scores = data.map(d => d.total_score as number);
        const avgQualityScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const belowThresholdCount = scores.filter(
            s => s < HEALTH_THRESHOLDS.MIN_QUALITY_SCORE
        ).length;

        return { avgQualityScore, belowThresholdCount };
    }

    private calculateHealthScore(metrics: {
        supplyDemandRatio: number;
        avgResponseTimeHours: number | null;
        matchSuccessRate: number | null;
    }): number {
        let score = 100;

        // Supply/demand component (40 points)
        if (metrics.supplyDemandRatio < HEALTH_THRESHOLDS.CRITICAL_RATIO) {
            score -= 40;
        } else if (metrics.supplyDemandRatio < HEALTH_THRESHOLDS.WARNING_RATIO) {
            score -= 25;
        } else if (metrics.supplyDemandRatio < HEALTH_THRESHOLDS.HEALTHY_RATIO) {
            score -= 10;
        }

        // Response time component (30 points)
        if (metrics.avgResponseTimeHours !== null) {
            if (metrics.avgResponseTimeHours > HEALTH_THRESHOLDS.CRITICAL_RESPONSE_TIME) {
                score -= 30;
            } else if (metrics.avgResponseTimeHours > HEALTH_THRESHOLDS.WARNING_RESPONSE_TIME) {
                score -= 20;
            } else if (metrics.avgResponseTimeHours > HEALTH_THRESHOLDS.TARGET_RESPONSE_TIME) {
                score -= 10;
            }
        }

        // Match success rate component (30 points)
        if (metrics.matchSuccessRate !== null) {
            if (metrics.matchSuccessRate < HEALTH_THRESHOLDS.CRITICAL_MATCH_RATE) {
                score -= 30;
            } else if (metrics.matchSuccessRate < HEALTH_THRESHOLDS.WARNING_MATCH_RATE) {
                score -= 20;
            } else if (metrics.matchSuccessRate < HEALTH_THRESHOLDS.TARGET_MATCH_RATE) {
                score -= 10;
            }
        }

        return Math.max(0, score);
    }

    private getHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
        if (score >= 70) return 'healthy';
        if (score >= 40) return 'warning';
        return 'critical';
    }

    private getHealthStatusFromRatio(ratio: number): 'healthy' | 'warning' | 'critical' {
        if (ratio >= HEALTH_THRESHOLDS.HEALTHY_RATIO) return 'healthy';
        if (ratio >= HEALTH_THRESHOLDS.WARNING_RATIO) return 'warning';
        return 'critical';
    }

    private estimateWaitTime(
        activeRequests: number,
        availableAdvisors: number,
        avgResponseTimeHours: number | null
    ): number | null {
        if (availableAdvisors === 0) return null;
        if (activeRequests === 0) return 0;

        const baseTime = avgResponseTimeHours || 4;
        const queueFactor = activeRequests / availableAdvisors;

        return Math.round(baseTime * queueFactor * 10) / 10;
    }

    private generateRecommendations(metrics: {
        healthScore: number;
        supplyDemandRatio: number;
        avgResponseTimeHours: number;
        lowSupplyDestinations: string[];
        advisorsAtCapacity: number;
        advisorsOnVacation: number;
    }): string[] {
        const recommendations: string[] = [];

        if (metrics.supplyDemandRatio < HEALTH_THRESHOLDS.WARNING_RATIO) {
            recommendations.push('Consider recruiting more travel advisors');
        }

        if (metrics.avgResponseTimeHours > HEALTH_THRESHOLDS.WARNING_RESPONSE_TIME) {
            recommendations.push('Implement response time SLA notifications');
        }

        if (metrics.lowSupplyDestinations.length > 0) {
            recommendations.push(
                `Focus advisor recruitment for: ${metrics.lowSupplyDestinations.slice(0, 3).join(', ')}`
            );
        }

        if (metrics.advisorsAtCapacity > 5) {
            recommendations.push(
                `${metrics.advisorsAtCapacity} advisors at capacity - consider workload rebalancing`
            );
        }

        if (metrics.advisorsOnVacation > metrics.advisorsAtCapacity * 0.2) {
            recommendations.push('High vacation rate - plan for seasonal coverage');
        }

        return recommendations;
    }

    private mapToSnapshot(row: Record<string, unknown>): MarketplaceSnapshot {
        return {
            id: row['id'] as string,
            snapshotDate: new Date(row['snapshot_date'] as string),
            destination: row['destination'] as string | null,
            pendingRequests: row['pending_requests'] as number,
            newRequestsToday: row['new_requests_today'] as number,
            totalActiveRequests: row['total_active_requests'] as number,
            availableAdvisors: row['available_advisors'] as number,
            advisorsOnVacation: row['advisors_on_vacation'] as number,
            advisorsAtCapacity: row['advisors_at_capacity'] as number,
            avgResponseTimeHours: row['avg_response_time_hours'] as number | null,
            medianResponseTimeHours: row['median_response_time_hours'] as number | null,
            matchSuccessRate: row['match_success_rate'] as number | null,
            bookingConversionRate: row['booking_conversion_rate'] as number | null,
            avgRequestQualityScore: row['avg_request_quality_score'] as number | null,
            requestsBelowQualityThreshold: row['requests_below_quality_threshold'] as number,
            supplyDemandRatio: row['supply_demand_ratio'] as number,
            estimatedWaitTimeHours: row['estimated_wait_time_hours'] as number | null,
            healthScore: row['health_score'] as number,
            healthStatus: row['health_status'] as 'healthy' | 'warning' | 'critical',
            createdAt: new Date(row['created_at'] as string),
        };
    }
}

// Factory function
export function createMarketplaceMetricsService(
    supabaseUrl: string,
    supabaseServiceKey: string
): MarketplaceMetricsService {
    return new MarketplaceMetricsService(supabaseUrl, supabaseServiceKey);
}
