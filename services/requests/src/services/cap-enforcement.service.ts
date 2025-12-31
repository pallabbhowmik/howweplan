/**
 * Cap Enforcement Service
 * 
 * Enforces operational limits:
 * - Daily request cap per user
 * - Maximum open requests per user
 */

import { config } from '../env';
import { RequestRepository } from '../domain/request.repository';
import { DailyCapExceededError, MaxOpenRequestsExceededError } from '../domain/request.errors';
import { Logger } from './logger.service';

export interface CapEnforcementService {
  checkCanCreateRequest(userId: string): Promise<void>;
  getCapsInfo(userId: string): Promise<CapsInfo>;
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

export function createCapEnforcementService(
  repository: RequestRepository,
  logger: Logger
): CapEnforcementService {
  const dailyLimit = config.limits.dailyRequestCap;
  const openLimit = config.limits.maxOpenRequests;

  return {
    async checkCanCreateRequest(userId: string): Promise<void> {
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
  };
}
