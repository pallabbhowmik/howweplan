/**
 * Submit Request Handler
 */

import { Request, Response, NextFunction } from 'express';
import { toRequestResponse } from '../../dto/request-response.dto';
import { RequestService } from '../../services/request.service';
import { createCorrelationId } from '../../events/event-emitter';
import { ValidationError } from '../../domain/request.errors';

export function createSubmitRequestHandler(requestService: RequestService) {
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

      const correlationId = (req.headers['x-correlation-id'] as string) || createCorrelationId();

      const request = await requestService.submitRequest(userId, requestId, {
        correlationId,
        userId,
      });

      res.json({
        success: true,
        data: toRequestResponse(request),
      });
    } catch (error) {
      next(error);
    }
  };
}
