/**
 * Matching Service Client
 * 
 * Communicates with the matching service to trigger agent matching for requests.
 * Uses HTTP internal API for synchronous matching triggers.
 */

import { config } from '../env';
import { Logger } from './logger.service';

export interface MatchingServiceClient {
  triggerMatching(request: TriggerMatchingRequest): Promise<MatchingResult>;
}

export interface TriggerMatchingRequest {
  requestId: string;
  request: {
    requestId: string;
    userId: string;
    title: string;
    description?: string | null;
    destination: unknown;
    departureDate: string;
    returnDate: string;
    budgetMin?: number | null;
    budgetMax?: number | null;
    budgetCurrency?: string | null;
    travelers: unknown;
    travelStyle?: string | null;
    preferences?: unknown;
  };
  correlationId: string;
}

export interface MatchingResult {
  success: boolean;
  matchCount: number;
  message?: string;
  error?: string;
}

export function createMatchingServiceClient(logger: Logger): MatchingServiceClient {
  const baseUrl = config.matching.serviceUrl;
  const internalSecret = config.matching.internalSecret;

  return {
    async triggerMatching(data: TriggerMatchingRequest): Promise<MatchingResult> {
      const url = `${baseUrl}/internal/match`;
      
      logger.info('Triggering matching service', {
        requestId: data.requestId,
        url,
      });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Secret': internalSecret,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('Matching service returned error', {
            requestId: data.requestId,
            status: response.status,
            error: errorText,
          });
          
          return {
            success: false,
            matchCount: 0,
            error: `Matching service error: ${response.status}`,
          };
        }

        const result = await response.json() as MatchingResult;
        
        logger.info('Matching service responded', {
          requestId: data.requestId,
          success: result.success,
          matchCount: result.matchCount,
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Don't fail the request submission if matching fails
        // The request is still valid, agents will eventually be matched
        logger.warn('Failed to trigger matching service (non-fatal)', {
          requestId: data.requestId,
          error: errorMessage,
        });

        return {
          success: false,
          matchCount: 0,
          error: errorMessage,
        };
      }
    },
  };
}
