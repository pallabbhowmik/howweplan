/**
 * Cancel Request Handler
 */

import { Request, Response, NextFunction } from 'express';
import { CancelRequestSchema } from '../../dto/cancel-request.dto';
import { toRequestResponse } from '../../dto/request-response.dto';
import { RequestService } from '../../services/request.service';
import { createCorrelationId } from '../../events/event-emitter';
import { ValidationError } from '../../domain/request.errors';

export function createCancelRequestHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        return;
      }

      const { requestId } = req.params;
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      const parseResult = CancelRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Invalid cancellation data', { errors });
      }

      const correlationId = (req.headers['x-correlation-id'] as string) || createCorrelationId();

      const request = await requestService.cancelRequest(
        userId,
        requestId,
        parseResult.data.reason,
        {
          correlationId,
          userId,
        }
      );

      res.json({
        success: true,
        data: toRequestResponse(request),
      });
    } catch (error) {
      next(error);
    }
  };
}
