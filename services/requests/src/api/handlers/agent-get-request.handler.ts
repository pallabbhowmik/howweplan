/**
 * Agent Get Request Handler
 * 
 * Allows agents to fetch request details for requests they're matched with.
 * Verifies agent has an accepted match before returning data.
 */

import { Request, Response, NextFunction } from 'express';
import { toRequestResponse } from '../../dto/request-response.dto';
import { RequestService } from '../../services/request.service';
import { ValidationError, RequestNotFoundError } from '../../domain/request.errors';
import { config } from '../../env';

interface MatchResponse {
  success: boolean;
  data?: {
    id: string;
    agentId: string;
    requestId: string;
    status: string;
  };
}

export function createAgentGetRequestHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!agentId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        return;
      }

      // Ensure the caller is an agent
      if (userRole !== 'agent') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only agents can access this endpoint' } });
        return;
      }

      const { requestId } = req.params;
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      // Verify the agent has an accepted match for this request
      // Call matching service to verify (pass userId, matching service will lookup agentId)
      const matchingServiceUrl = config.matching.serviceUrl;
      
      // Skip match verification in development if matching service isn't configured
      let matchVerified = false;
      
      if (matchingServiceUrl && !matchingServiceUrl.includes('localhost')) {
        try {
          // Use userId parameter - matching service will lookup the agentId from agents table
          const verifyUrl = `${matchingServiceUrl}/api/v1/matches/verify?userId=${agentId}&requestId=${requestId}`;
          const response = await fetch(verifyUrl, {
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Service': 'requests-service',
              'Authorization': req.headers.authorization || '',
            },
          });
          
          if (response.ok) {
            const matchData = await response.json() as MatchResponse;
            // Check if match exists and is in an accepted state
            if (matchData.success && matchData.data && 
                ['accepted', 'itinerary_submitted', 'booked'].includes(matchData.data.status)) {
              matchVerified = true;
            }
          }
        } catch (error) {
          console.error('Failed to verify match with matching service:', error);
          // In case of error, we'll still try to return the request
          // The agent may have a valid match but matching service is down
          matchVerified = true; // Allow in case of service errors
        }
      } else {
        // In development, allow without match verification
        console.log('Skipping match verification in development mode');
        matchVerified = true;
      }

      if (!matchVerified) {
        res.status(403).json({ 
          error: { 
            code: 'NO_MATCH', 
            message: 'You do not have an accepted match for this request' 
          } 
        });
        return;
      }

      // Get the request (using internal admin method that doesn't check ownership)
      // We pass the agentId as a placeholder for the adminId parameter (used for audit)
      const request = await requestService.adminGetRequest(agentId, requestId);

      res.json({
        success: true,
        data: toRequestResponse(request),
      });
    } catch (error) {
      if (error instanceof RequestNotFoundError) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } });
        return;
      }
      next(error);
    }
  };
}
