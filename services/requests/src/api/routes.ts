/**
 * API Routes
 * 
 * Route definitions for the Request Service.
 * Separates user routes from admin routes with different authentication.
 */

import { Router } from 'express';
import { RequestService } from '../services/request.service';
import { CapEnforcementService } from '../services/cap-enforcement.service';
import { AuthMiddleware, AdminAuthMiddleware } from '../middleware/auth.middleware';
import {
  createCreateRequestHandler,
  createGetRequestHandler,
  createListRequestsHandler,
  createSubmitRequestHandler,
  createCancelRequestHandler,
  createCapsInfoHandler,
  createAdminGetRequestHandler,
  createAdminCancelRequestHandler,
  createAdminExpireRequestHandler,
  createAdminTransitionRequestHandler,
  createAdminListRequestsHandler,
} from './handlers';

export interface RoutesDependencies {
  requestService: RequestService;
  capEnforcementService: CapEnforcementService;
  authMiddleware: AuthMiddleware;
  adminAuthMiddleware: AdminAuthMiddleware;
}

export function createRoutes(deps: RoutesDependencies): Router {
  const router = Router();

  // Health check (no auth required)
  router.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'requests-service',
      timestamp: new Date().toISOString(),
    });
  });

  // User routes (require user authentication)
  const userRouter = Router();
  userRouter.use(deps.authMiddleware);

  // POST /requests - Create a new travel request
  userRouter.post('/', createCreateRequestHandler(deps.requestService));

  // GET /requests - List user's requests
  userRouter.get('/', createListRequestsHandler(deps.requestService));

  // GET /requests/caps - Get user's cap information
  userRouter.get('/caps', createCapsInfoHandler(deps.capEnforcementService));

  // GET /requests/:requestId - Get a specific request
  userRouter.get('/:requestId', createGetRequestHandler(deps.requestService));

  // POST /requests/:requestId/submit - Submit a draft request
  userRouter.post('/:requestId/submit', createSubmitRequestHandler(deps.requestService));

  // POST /requests/:requestId/cancel - Cancel a request
  userRouter.post('/:requestId/cancel', createCancelRequestHandler(deps.requestService));

  router.use('/requests', userRouter);

  // Admin routes (require admin authentication)
  const adminRouter = Router();
  adminRouter.use(deps.adminAuthMiddleware);

  // GET /admin/requests - List requests (requires userId query param)
  adminRouter.get('/requests', createAdminListRequestsHandler(deps.requestService));

  // GET /admin/requests/:requestId - Get any request
  adminRouter.get('/requests/:requestId', createAdminGetRequestHandler(deps.requestService));

  // POST /admin/requests/:requestId/cancel - Admin cancel
  adminRouter.post(
    '/requests/:requestId/cancel',
    createAdminCancelRequestHandler(deps.requestService)
  );

  // POST /admin/requests/:requestId/expire - Admin expire
  adminRouter.post(
    '/requests/:requestId/expire',
    createAdminExpireRequestHandler(deps.requestService)
  );

  // POST /admin/requests/:requestId/transition - Admin state transition
  adminRouter.post(
    '/requests/:requestId/transition',
    createAdminTransitionRequestHandler(deps.requestService)
  );

  router.use('/admin', adminRouter);

  return router;
}
