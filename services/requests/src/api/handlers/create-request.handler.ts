/**
 * Create Request Handler
 */

import { Request, Response, NextFunction } from 'express';
import { CreateRequestSchema } from '../../dto/create-request.dto';
import { toRequestResponse } from '../../dto/request-response.dto';
import { RequestService } from '../../services/request.service';
import { createCorrelationId } from '../../events/event-emitter';
import { ValidationError } from '../../domain/request.errors';

export function createCreateRequestHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
        return;
      }

      // Validate input
      const parseResult = CreateRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Invalid request data', { errors });
      }

      const correlationId = (req.headers['x-correlation-id'] as string) || createCorrelationId();

      const request = await requestService.createRequest(userId, parseResult.data, {
        correlationId,
        userId,
      });

      res.status(201).json({
        success: true,
        data: toRequestResponse(request),
      });
    } catch (error) {
      next(error);
    }
  };
}
