/**
 * API Routes
 * 
 * Route definitions for the Request Service.
 * Separates user routes from admin routes with different authentication.
 */

import { Router } from 'express';
import multer from 'multer';
import { RequestService } from '../services/request.service';
import { CapEnforcementService } from '../services/cap-enforcement.service';
import { DestinationRepository } from '../domain/destination.repository';
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
import {
  createListDestinationsHandler,
  createGetDestinationHandler,
  createCreateDestinationHandler,
  createUpdateDestinationHandler,
  createDeleteDestinationHandler,
  createDestinationStatsHandler,
  createImportDestinationsHandler,
  createBulkUpdateDestinationsHandler,
  createUploadDestinationImageHandler,
} from './handlers/destinations.handlers';

export interface RoutesDependencies {
  requestService: RequestService;
  capEnforcementService: CapEnforcementService;
  destinationRepository: DestinationRepository;
  authMiddleware: AuthMiddleware;
  adminAuthMiddleware: AdminAuthMiddleware;
}

export function createRoutes(deps: RoutesDependencies): Router {
  const router = Router();

  const destinationImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

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

  // =========================================================================
  // DESTINATIONS ROUTES (public read, admin write)
  // =========================================================================
  
  const destinationsRouter = Router();

  // Public: GET /destinations - List all active destinations (for explore page)
  destinationsRouter.get('/', createListDestinationsHandler(deps.destinationRepository));

  // Public: GET /destinations/stats - Get statistics
  destinationsRouter.get('/stats', createDestinationStatsHandler(deps.destinationRepository));

  // Public: GET /destinations/:id - Get single destination
  destinationsRouter.get('/:id', createGetDestinationHandler(deps.destinationRepository));

  // Admin only: POST /destinations - Create destination
  destinationsRouter.post('/', deps.adminAuthMiddleware, createCreateDestinationHandler(deps.destinationRepository));

  // Admin only: POST /destinations/import - Bulk import
  destinationsRouter.post('/import', deps.adminAuthMiddleware, createImportDestinationsHandler(deps.destinationRepository));

  // Admin only: PATCH /destinations/bulk - Bulk update
  destinationsRouter.patch('/bulk', deps.adminAuthMiddleware, createBulkUpdateDestinationsHandler(deps.destinationRepository));

  // Admin only: PATCH /destinations/:id - Update destination
  destinationsRouter.patch('/:id', deps.adminAuthMiddleware, createUpdateDestinationHandler(deps.destinationRepository));

  // Admin only: POST /destinations/:id/image - Upload destination image
  destinationsRouter.post(
    '/:id/image',
    deps.adminAuthMiddleware,
    destinationImageUpload.single('file'),
    createUploadDestinationImageHandler(deps.destinationRepository)
  );

  // Admin only: DELETE /destinations/:id - Delete destination
  destinationsRouter.delete('/:id', deps.adminAuthMiddleware, createDeleteDestinationHandler(deps.destinationRepository));

  router.use('/destinations', destinationsRouter);

  return router;
}
