/**
 * List Requests Handler
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { toRequestResponse, RequestListResponse } from '../../dto/request-response.dto';
import { RequestService } from '../../services/request.service';
import { RequestState } from '../../domain/request.state-machine';

const QuerySchema = z.object({
  states: z
    .string()
    .optional()
    .transform((val: string | undefined) => (val ? val.split(',') as RequestState[] : undefined)),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function createListRequestsHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        return;
      }

      const query = QuerySchema.parse(req.query);

      const { requests, total } = await requestService.listUserRequests(userId, {
        states: query.states,
        limit: query.limit,
        offset: query.offset,
      });

      const response: RequestListResponse = {
        requests: requests.map(toRequestResponse),
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + requests.length < total,
        },
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  };
}
