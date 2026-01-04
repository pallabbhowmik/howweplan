/**
 * Cap Enforcement Service
 * 
 * Enforces operational limits:
 * - Daily request cap per user
 * - Maximum open requests per user
 * 
 * Limits can be configured via:
 * 1. Environment variables (defaults)
 * 2. Database system_settings table (admin-configurable, takes precedence)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../env';
import { RequestRepository } from '../domain/request.repository';
import { DailyCapExceededError, MaxOpenRequestsExceededError } from '../domain/request.errors';
import { Logger } from './logger.service';

export interface CapEnforcementService {
  checkCanCreateRequest(userId: string): Promise<void>;
  getCapsInfo(userId: string): Promise<CapsInfo>;
  getLimits(): Promise<{ dailyLimit: number; openLimit: number }>;
  refreshLimits(): Promise<void>;
}

export interface CapsInfo {
  dailyCap: {
    limit: number;
    used: number;
    remaining: number;
  };
  openRequests: {
    limit: number;
    count: number;
    remaining: number;
  };
  canCreateRequest: boolean;
}

// Cache for system settings
interface CachedLimits {
  dailyLimit: number;
  openLimit: number;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export function createCapEnforcementService(
  repository: RequestRepository,
  logger: Logger
): CapEnforcementService {
  // Default limits from environment
  const defaultDailyLimit = config.limits.dailyRequestCap;
  const defaultOpenLimit = config.limits.maxOpenRequests;

  // Supabase client for fetching system settings
  const supabase: SupabaseClient = createClient(
    config.database.supabaseUrl,
    config.database.supabaseServiceRoleKey
  );

  // Cached limits
  let cachedLimits: CachedLimits | null = null;

  async function fetchLimitsFromDb(): Promise<{ dailyLimit: number; openLimit: number }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['max_open_requests_per_user', 'daily_request_cap_per_user']);

      if (error) {
        logger.warn('Failed to fetch system settings, using defaults', { error: error.message });
        return { dailyLimit: defaultDailyLimit, openLimit: defaultOpenLimit };
      }

      let dailyLimit = defaultDailyLimit;
      let openLimit = defaultOpenLimit;

      for (const setting of data || []) {
        const value = typeof setting.value === 'number' 
          ? setting.value 
          : parseInt(String(setting.value), 10);

        if (setting.key === 'max_open_requests_per_user' && !isNaN(value)) {
          openLimit = value;
        } else if (setting.key === 'daily_request_cap_per_user' && !isNaN(value)) {
          dailyLimit = value;
        }
      }

      logger.debug('Fetched limits from database', { dailyLimit, openLimit });
      return { dailyLimit, openLimit };
    } catch (err) {
      logger.warn('Error fetching system settings', { error: err instanceof Error ? err.message : String(err) });
      return { dailyLimit: defaultDailyLimit, openLimit: defaultOpenLimit };
    }
  }

  async function getLimitsWithCache(): Promise<{ dailyLimit: number; openLimit: number }> {
    const now = Date.now();
    
    // Return cached if valid
    if (cachedLimits && (now - cachedLimits.cachedAt) < CACHE_TTL_MS) {
      return { dailyLimit: cachedLimits.dailyLimit, openLimit: cachedLimits.openLimit };
    }

    // Fetch fresh limits
    const limits = await fetchLimitsFromDb();
    cachedLimits = {
      ...limits,
      cachedAt: now,
    };

    return limits;
  }

  return {
    async checkCanCreateRequest(userId: string): Promise<void> {
      const { dailyLimit, openLimit } = await getLimitsWithCache();
      
      const [todayCount, openCount] = await Promise.all([
        repository.countTodayRequestsByUser(userId),
        repository.countOpenRequestsByUser(userId),
      ]);

      logger.debug('Checking caps for user', {
        userId,
        todayCount,
        dailyLimit,
        openCount,
        openLimit,
      });

      if (todayCount >= dailyLimit) {
        logger.info('Daily cap exceeded for user', { userId, todayCount, dailyLimit });
        throw new DailyCapExceededError(userId, dailyLimit);
      }

      if (openCount >= openLimit) {
        logger.info('Max open requests exceeded for user', { userId, openCount, openLimit });
        throw new MaxOpenRequestsExceededError(userId, openLimit);
      }
    },

    async getCapsInfo(userId: string): Promise<CapsInfo> {
      const { dailyLimit, openLimit } = await getLimitsWithCache();
      
      const [todayCount, openCount] = await Promise.all([
        repository.countTodayRequestsByUser(userId),
        repository.countOpenRequestsByUser(userId),
      ]);

      const dailyRemaining = Math.max(0, dailyLimit - todayCount);
      const openRemaining = Math.max(0, openLimit - openCount);

      return {
        dailyCap: {
          limit: dailyLimit,
          used: todayCount,
          remaining: dailyRemaining,
        },
        openRequests: {
          limit: openLimit,
          count: openCount,
          remaining: openRemaining,
        },
        canCreateRequest: dailyRemaining > 0 && openRemaining > 0,
      };
    },

    async getLimits(): Promise<{ dailyLimit: number; openLimit: number }> {
      return getLimitsWithCache();
    },

    async refreshLimits(): Promise<void> {
      cachedLimits = null;
      await getLimitsWithCache();
      logger.info('Limits cache refreshed');
    },
  };
}
