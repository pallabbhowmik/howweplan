/**
 * Admin Request Handlers
 * 
 * All admin actions require a reason and are audit-logged.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  AdminCancelRequestSchema,
  AdminExpireRequestSchema,
  AdminTransitionRequestSchema,
} from '../../dto/admin-action.dto';
import { toRequestResponse } from '../../dto/request-response.dto';
import { RequestService } from '../../services/request.service';
import { createCorrelationId } from '../../events/event-emitter';
import { ValidationError } from '../../domain/request.errors';
import { RequestState } from '../../domain/request.state-machine';

export function createAdminGetRequestHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin not authenticated' } });
        return;
      }

      const { requestId } = req.params;
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      const request = await requestService.adminGetRequest(adminId, requestId);

      res.json({
        success: true,
        data: toRequestResponse(request),
      });
    } catch (error) {
      next(error);
    }
  };
}

export function createAdminCancelRequestHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin not authenticated' } });
        return;
      }

      const { requestId } = req.params;
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      const parseResult = AdminCancelRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Invalid admin cancellation data', { errors });
      }

      const correlationId = (req.headers['x-correlation-id'] as string) || createCorrelationId();

      const request = await requestService.adminCancelRequest(
        adminId,
        requestId,
        parseResult.data.reason,
        {
          correlationId,
          userId: adminId,
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

export function createAdminExpireRequestHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin not authenticated' } });
        return;
      }

      const { requestId } = req.params;
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      const parseResult = AdminExpireRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Invalid admin expiration data', { errors });
      }

      const correlationId = (req.headers['x-correlation-id'] as string) || createCorrelationId();

      const request = await requestService.adminExpireRequest(
        adminId,
        requestId,
        parseResult.data.reason,
        {
          correlationId,
          userId: adminId,
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

export function createAdminTransitionRequestHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin not authenticated' } });
        return;
      }

      const { requestId } = req.params;
      if (!requestId) {
        throw new ValidationError('Request ID is required');
      }

      const parseResult = AdminTransitionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Invalid admin transition data', { errors });
      }

      const correlationId = (req.headers['x-correlation-id'] as string) || createCorrelationId();

      const request = await requestService.adminTransition(
        adminId,
        requestId,
        parseResult.data.toState as RequestState,
        parseResult.data.reason,
        {
          correlationId,
          userId: adminId,
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

// Query schema for admin list
const AdminListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  states: z
    .string()
    .optional()
    .transform((val: string | undefined) => (val ? val.split(',') as RequestState[] : undefined)),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function createAdminListRequestsHandler(requestService: RequestService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin not authenticated' } });
        return;
      }

      const query = AdminListQuerySchema.parse(req.query);

      // Note: In a full implementation, this would have a separate admin list method
      // that doesn't require userId. For now, we require it.
      if (!query.userId) {
        throw new ValidationError('userId query parameter is required for admin listing');
      }

      const { requests, total } = await requestService.listUserRequests(query.userId, {
        states: query.states,
        limit: query.limit,
        offset: query.offset,
      });

      res.json({
        success: true,
        data: {
          requests: requests.map(toRequestResponse),
          pagination: {
            total,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + requests.length < total,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
