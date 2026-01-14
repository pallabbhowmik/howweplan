/**
 * Advisor Workload Management Service
 * 
 * Manages advisor capacity, vacation mode, and workload limits to prevent
 * burnout and ensure quality service delivery.
 * 
 * BUSINESS RULES:
 * - Advisors can set maximum active requests and daily match limits
 * - Vacation mode automatically pauses matching
 * - Auto-pause triggers when capacity threshold reached
 * - Working hours are respected for matching priority
 * - All workload changes are audit-logged
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { matchingConfig } from '../config/index.js';
import { logger } from '../lib/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkloadLimits {
    agentId: string;
    // Capacity limits
    maxActiveRequests: number;
    maxDailyMatches: number;
    maxWeeklyMatches: number;
    // Current load
    currentActiveRequests: number;
    matchesToday: number;
    matchesThisWeek: number;
    lastMatchResetDate: Date;
    lastWeeklyResetDate: Date;
    // Auto-management
    autoPauseEnabled: boolean;
    autoPauseThreshold: number;
    isAutoPaused: boolean;
    // Vacation
    vacationMode: boolean;
    vacationStart: Date | null;
    vacationUntil: Date | null;
    vacationMessage: string | null;
    // Working hours
    preferredTimezone: string;
    workingHoursStart: string;
    workingHoursEnd: string;
    acceptsWeekendRequests: boolean;
    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkloadUpdate {
    maxActiveRequests?: number;
    maxDailyMatches?: number;
    maxWeeklyMatches?: number;
    autoPauseEnabled?: boolean;
    autoPauseThreshold?: number;
    preferredTimezone?: string;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    acceptsWeekendRequests?: boolean;
}

export interface VacationSettings {
    enabled: boolean;
    startDate?: Date;
    endDate?: Date;
    message?: string;
}

export interface AdvisorAvailability {
    agentId: string;
    isAvailable: boolean;
    unavailableReasons: string[];
    capacityUtilization: number; // 0-100%
    estimatedNextSlot: Date | null;
}

export interface WorkloadStats {
    totalAdvisors: number;
    availableNow: number;
    onVacation: number;
    atCapacity: number;
    autoPaused: number;
    avgCapacityUtilization: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKLOAD_CONFIG = {
    DEFAULT_MAX_ACTIVE_REQUESTS: 10,
    DEFAULT_MAX_DAILY_MATCHES: 15,
    DEFAULT_MAX_WEEKLY_MATCHES: 75,
    DEFAULT_AUTO_PAUSE_THRESHOLD: 0.90,
    MIN_CAPACITY: 1,
    MAX_CAPACITY: 50,
};

// =============================================================================
// WORKLOAD SERVICE
// =============================================================================

export class WorkloadService {
    private readonly supabase: SupabaseClient;

    constructor(supabaseUrl: string, supabaseServiceKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    /**
     * Check if an advisor is available for matching.
     * This is the primary method called by matching engine.
     */
    async isAdvisorAvailable(agentId: string): Promise<AdvisorAvailability> {
        const limits = await this.getWorkloadLimits(agentId);
        const unavailableReasons: string[] = [];

        // No limits record means default availability
        if (!limits) {
            return {
                agentId,
                isAvailable: true,
                unavailableReasons: [],
                capacityUtilization: 0,
                estimatedNextSlot: null,
            };
        }

        // Check vacation mode
        if (limits.vacationMode) {
            if (!limits.vacationUntil || limits.vacationUntil > new Date()) {
                unavailableReasons.push('On vacation');
            }
        }

        // Check if auto-paused
        if (limits.isAutoPaused) {
            unavailableReasons.push('Auto-paused due to high workload');
        }

        // Check capacity
        if (limits.currentActiveRequests >= limits.maxActiveRequests) {
            unavailableReasons.push(
                `At capacity (${limits.currentActiveRequests}/${limits.maxActiveRequests} active)`
            );
        }

        // Check daily limit
        if (limits.matchesToday >= limits.maxDailyMatches) {
            unavailableReasons.push(
                `Daily limit reached (${limits.matchesToday}/${limits.maxDailyMatches})`
            );
        }

        // Check weekly limit
        if (limits.matchesThisWeek >= limits.maxWeeklyMatches) {
            unavailableReasons.push(
                `Weekly limit reached (${limits.matchesThisWeek}/${limits.maxWeeklyMatches})`
            );
        }

        // Check working hours (if outside working hours, lower priority but still available)
        // Working hours don't make advisor unavailable, just deprioritized

        const capacityUtilization = Math.min(
            100,
            Math.round((limits.currentActiveRequests / limits.maxActiveRequests) * 100)
        );

        const isAvailable = unavailableReasons.length === 0;

        return {
            agentId,
            isAvailable,
            unavailableReasons,
            capacityUtilization,
            estimatedNextSlot: isAvailable ? null : this.estimateNextSlot(limits),
        };
    }

    /**
     * Filter available agents from a list.
     * Used by matching engine to pre-filter candidates.
     */
    async filterAvailableAgents(agentIds: string[]): Promise<string[]> {
        if (agentIds.length === 0) return [];

        const availabilities = await Promise.all(
            agentIds.map((id) => this.isAdvisorAvailable(id))
        );

        return availabilities
            .filter((a) => a.isAvailable)
            .map((a) => a.agentId);
    }

    /**
     * Get workload limits for an advisor.
     */
    async getWorkloadLimits(agentId: string): Promise<WorkloadLimits | null> {
        const { data, error } = await this.supabase
            .from('advisor_workload_limits')
            .select('*')
            .eq('agent_id', agentId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found - advisor hasn't set limits
                return null;
            }
            throw new Error(`Failed to get workload limits: ${error.message}`);
        }

        return this.mapToWorkloadLimits(data);
    }

    /**
     * Initialize workload limits for a new advisor.
     */
    async initializeWorkloadLimits(agentId: string): Promise<WorkloadLimits> {
        const { data, error } = await this.supabase
            .from('advisor_workload_limits')
            .insert({
                agent_id: agentId,
                max_active_requests: WORKLOAD_CONFIG.DEFAULT_MAX_ACTIVE_REQUESTS,
                max_daily_matches: WORKLOAD_CONFIG.DEFAULT_MAX_DAILY_MATCHES,
                max_weekly_matches: WORKLOAD_CONFIG.DEFAULT_MAX_WEEKLY_MATCHES,
                auto_pause_threshold: WORKLOAD_CONFIG.DEFAULT_AUTO_PAUSE_THRESHOLD,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to initialize workload limits: ${error.message}`);
        }

        logger.info({ agentId }, 'Initialized workload limits for advisor');
        return this.mapToWorkloadLimits(data);
    }

    /**
     * Update workload limits.
     */
    async updateWorkloadLimits(
        agentId: string,
        updates: WorkloadUpdate
    ): Promise<WorkloadLimits> {
        // Validate limits
        if (updates.maxActiveRequests !== undefined) {
            if (
                updates.maxActiveRequests < WORKLOAD_CONFIG.MIN_CAPACITY ||
                updates.maxActiveRequests > WORKLOAD_CONFIG.MAX_CAPACITY
            ) {
                throw new Error(
                    `maxActiveRequests must be between ${WORKLOAD_CONFIG.MIN_CAPACITY} and ${WORKLOAD_CONFIG.MAX_CAPACITY}`
                );
            }
        }

        const dbUpdates: Record<string, unknown> = {};
        if (updates.maxActiveRequests !== undefined) {
            dbUpdates['max_active_requests'] = updates.maxActiveRequests;
        }
        if (updates.maxDailyMatches !== undefined) {
            dbUpdates['max_daily_matches'] = updates.maxDailyMatches;
        }
        if (updates.maxWeeklyMatches !== undefined) {
            dbUpdates['max_weekly_matches'] = updates.maxWeeklyMatches;
        }
        if (updates.autoPauseEnabled !== undefined) {
            dbUpdates['auto_pause_enabled'] = updates.autoPauseEnabled;
        }
        if (updates.autoPauseThreshold !== undefined) {
            dbUpdates['auto_pause_threshold'] = updates.autoPauseThreshold;
        }
        if (updates.preferredTimezone !== undefined) {
            dbUpdates['preferred_timezone'] = updates.preferredTimezone;
        }
        if (updates.workingHoursStart !== undefined) {
            dbUpdates['working_hours_start'] = updates.workingHoursStart;
        }
        if (updates.workingHoursEnd !== undefined) {
            dbUpdates['working_hours_end'] = updates.workingHoursEnd;
        }
        if (updates.acceptsWeekendRequests !== undefined) {
            dbUpdates['accepts_weekend_requests'] = updates.acceptsWeekendRequests;
        }

        const { data, error } = await this.supabase
            .from('advisor_workload_limits')
            .update(dbUpdates)
            .eq('agent_id', agentId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update workload limits: ${error.message}`);
        }

        logger.info({ agentId, updates }, 'Updated workload limits');
        return this.mapToWorkloadLimits(data);
    }

    /**
     * Set vacation mode.
     */
    async setVacationMode(
        agentId: string,
        settings: VacationSettings
    ): Promise<WorkloadLimits> {
        const dbUpdates: Record<string, unknown> = {
            vacation_mode: settings.enabled,
        };

        if (settings.enabled) {
            dbUpdates['vacation_start'] = settings.startDate?.toISOString() || new Date().toISOString();
            dbUpdates['vacation_until'] = settings.endDate?.toISOString();
            dbUpdates['vacation_message'] = settings.message || null;
        } else {
            dbUpdates['vacation_start'] = null;
            dbUpdates['vacation_until'] = null;
            dbUpdates['vacation_message'] = null;
        }

        const { data, error } = await this.supabase
            .from('advisor_workload_limits')
            .update(dbUpdates)
            .eq('agent_id', agentId)
            .select()
            .single();

        if (error) {
            // If no record exists, create one first
            if (error.code === 'PGRST116') {
                await this.initializeWorkloadLimits(agentId);
                return this.setVacationMode(agentId, settings);
            }
            throw new Error(`Failed to set vacation mode: ${error.message}`);
        }

        logger.info({ agentId, vacationMode: settings.enabled }, 'Updated vacation mode');
        return this.mapToWorkloadLimits(data);
    }

    /**
     * Increment active requests count after a match.
     */
    async incrementActiveRequests(agentId: string): Promise<void> {
        const limits = await this.getWorkloadLimits(agentId);

        if (!limits) {
            // Initialize with +1
            await this.initializeWorkloadLimits(agentId);
        }

        const { error } = await this.supabase.rpc('increment_advisor_workload', {
            p_agent_id: agentId,
        });

        // If RPC doesn't exist, do it manually
        if (error) {
            await this.supabase
                .from('advisor_workload_limits')
                .update({
                    current_active_requests: (limits?.currentActiveRequests || 0) + 1,
                    matches_today: (limits?.matchesToday || 0) + 1,
                    matches_this_week: (limits?.matchesThisWeek || 0) + 1,
                })
                .eq('agent_id', agentId);
        }

        // Check for auto-pause
        await this.checkAndApplyAutoPause(agentId);
    }

    /**
     * Decrement active requests count when a request completes.
     */
    async decrementActiveRequests(agentId: string): Promise<void> {
        const limits = await this.getWorkloadLimits(agentId);
        if (!limits) return;

        const newCount = Math.max(0, limits.currentActiveRequests - 1);

        await this.supabase
            .from('advisor_workload_limits')
            .update({
                current_active_requests: newCount,
                is_auto_paused: false, // Remove auto-pause when load decreases
            })
            .eq('agent_id', agentId);

        logger.debug({ agentId, newActiveRequests: newCount }, 'Decremented active requests');
    }

    /**
     * Check and apply auto-pause if threshold reached.
     */
    private async checkAndApplyAutoPause(agentId: string): Promise<void> {
        const limits = await this.getWorkloadLimits(agentId);
        if (!limits || !limits.autoPauseEnabled) return;

        const utilization = limits.currentActiveRequests / limits.maxActiveRequests;

        if (utilization >= limits.autoPauseThreshold && !limits.isAutoPaused) {
            await this.supabase
                .from('advisor_workload_limits')
                .update({ is_auto_paused: true })
                .eq('agent_id', agentId);

            logger.info(
                { agentId, utilization: Math.round(utilization * 100) },
                'Auto-paused advisor due to high workload'
            );
        }
    }

    /**
     * Reset daily/weekly counters (called by cron job).
     */
    async resetDailyCounters(): Promise<number> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await this.supabase
            .from('advisor_workload_limits')
            .update({
                matches_today: 0,
                last_match_reset_date: today,
                is_auto_paused: false,
            })
            .lt('last_match_reset_date', today)
            .select('agent_id');

        if (error) {
            logger.error({ error }, 'Failed to reset daily counters');
            return 0;
        }

        const resetCount = data?.length || 0;
        if (resetCount > 0) {
            logger.info({ resetCount }, 'Reset daily match counters');
        }
        return resetCount;
    }

    /**
     * Reset weekly counters (called by cron job on Mondays).
     */
    async resetWeeklyCounters(): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const { data, error } = await this.supabase
            .from('advisor_workload_limits')
            .update({
                matches_this_week: 0,
                last_weekly_reset_date: today,
            })
            .lt('last_weekly_reset_date', sevenDaysAgo)
            .select('agent_id');

        if (error) {
            logger.error({ error }, 'Failed to reset weekly counters');
            return 0;
        }

        const resetCount = data?.length || 0;
        if (resetCount > 0) {
            logger.info({ resetCount }, 'Reset weekly match counters');
        }
        return resetCount;
    }

    /**
     * Auto-end expired vacations.
     */
    async endExpiredVacations(): Promise<number> {
        const now = new Date().toISOString();

        const { data, error } = await this.supabase
            .from('advisor_workload_limits')
            .update({
                vacation_mode: false,
                vacation_start: null,
                vacation_until: null,
                vacation_message: null,
            })
            .eq('vacation_mode', true)
            .lt('vacation_until', now)
            .not('vacation_until', 'is', null)
            .select('agent_id');

        if (error) {
            logger.error({ error }, 'Failed to end expired vacations');
            return 0;
        }

        const endedCount = data?.length || 0;
        if (endedCount > 0) {
            logger.info({ endedCount }, 'Ended expired vacations');
        }
        return endedCount;
    }

    /**
     * Get platform-wide workload statistics.
     */
    async getWorkloadStats(): Promise<WorkloadStats> {
        // Get all advisors count
        const { count: totalAdvisors } = await this.supabase
            .from('agents')
            .select('id', { count: 'exact', head: true })
            .eq('is_verified', true);

        // Get workload limits data
        const { data: limits } = await this.supabase
            .from('advisor_workload_limits')
            .select('*');

        if (!limits) {
            return {
                totalAdvisors: totalAdvisors || 0,
                availableNow: totalAdvisors || 0,
                onVacation: 0,
                atCapacity: 0,
                autoPaused: 0,
                avgCapacityUtilization: 0,
            };
        }

        const onVacation = limits.filter((l) => l.vacation_mode).length;
        const atCapacity = limits.filter(
            (l) => l.current_active_requests >= l.max_active_requests
        ).length;
        const autoPaused = limits.filter((l) => l.is_auto_paused).length;

        const totalUtilization = limits.reduce((sum, l) => {
            return sum + (l.current_active_requests / l.max_active_requests);
        }, 0);
        const avgUtilization = limits.length > 0 ? totalUtilization / limits.length : 0;

        // Available = total - vacation - atCapacity - autoPaused
        const availableNow = Math.max(
            0,
            (totalAdvisors || 0) - onVacation - atCapacity - autoPaused
        );

        return {
            totalAdvisors: totalAdvisors || 0,
            availableNow,
            onVacation,
            atCapacity,
            autoPaused,
            avgCapacityUtilization: Math.round(avgUtilization * 100),
        };
    }

    /**
     * Estimate when next slot will be available.
     */
    private estimateNextSlot(limits: WorkloadLimits): Date | null {
        // If on vacation, return vacation end
        if (limits.vacationMode && limits.vacationUntil) {
            return limits.vacationUntil;
        }

        // If daily limit reached, return tomorrow
        if (limits.matchesToday >= limits.maxDailyMatches) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            return tomorrow;
        }

        // For capacity limits, we can't estimate without request completion data
        return null;
    }

    private mapToWorkloadLimits(row: Record<string, unknown>): WorkloadLimits {
        return {
            agentId: row['agent_id'] as string,
            maxActiveRequests: row['max_active_requests'] as number,
            maxDailyMatches: row['max_daily_matches'] as number,
            maxWeeklyMatches: row['max_weekly_matches'] as number,
            currentActiveRequests: row['current_active_requests'] as number,
            matchesToday: row['matches_today'] as number,
            matchesThisWeek: row['matches_this_week'] as number,
            lastMatchResetDate: new Date(row['last_match_reset_date'] as string),
            lastWeeklyResetDate: new Date(row['last_weekly_reset_date'] as string),
            autoPauseEnabled: row['auto_pause_enabled'] as boolean,
            autoPauseThreshold: row['auto_pause_threshold'] as number,
            isAutoPaused: row['is_auto_paused'] as boolean,
            vacationMode: row['vacation_mode'] as boolean,
            vacationStart: row['vacation_start']
                ? new Date(row['vacation_start'] as string)
                : null,
            vacationUntil: row['vacation_until']
                ? new Date(row['vacation_until'] as string)
                : null,
            vacationMessage: row['vacation_message'] as string | null,
            preferredTimezone: row['preferred_timezone'] as string,
            workingHoursStart: row['working_hours_start'] as string,
            workingHoursEnd: row['working_hours_end'] as string,
            acceptsWeekendRequests: row['accepts_weekend_requests'] as boolean,
            createdAt: new Date(row['created_at'] as string),
            updatedAt: new Date(row['updated_at'] as string),
        };
    }
}

// Factory function (initialized lazily with config)
let workloadServiceInstance: WorkloadService | null = null;

export function getWorkloadService(
    supabaseUrl: string,
    supabaseServiceKey: string
): WorkloadService {
    if (!workloadServiceInstance) {
        workloadServiceInstance = new WorkloadService(supabaseUrl, supabaseServiceKey);
    }
    return workloadServiceInstance;
}

export function createWorkloadService(
    supabaseUrl: string,
    supabaseServiceKey: string
): WorkloadService {
    return new WorkloadService(supabaseUrl, supabaseServiceKey);
}
