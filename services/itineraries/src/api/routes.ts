import { Router } from 'express';
import type { SubmissionHandler } from './handlers/submission.handler.js';
import type { ItineraryHandler } from './handlers/itinerary.handler.js';
import type { DisclosureHandler } from './handlers/disclosure.handler.js';
import {
  authenticate,
  authenticateInternal,
  requireAgentOrAdmin,
  requireAdmin,
  requireAuthenticated,
  validateBody,
  validateParams,
  validateQuery,
  idParamSchema,
  itineraryIdParamSchema,
  itemIdParamSchema,
  versionParamSchema,
  versionCompareParamSchema,
} from './middleware/index.js';
import {
  createSubmissionRequestSchema,
  listSubmissionsQuerySchema,
  createItineraryRequestSchema,
  updateItineraryRequestSchema,
  addItemRequestSchema,
  updateItemRequestSchema,
  changeStatusRequestSchema,
  listItinerariesQuerySchema,
  revealItineraryRequestSchema,
  obfuscateItineraryRequestSchema,
  restoreVersionRequestSchema,
} from './dto/index.js';

/**
 * Create API routes.
 */
export function createRoutes(
  submissionHandler: SubmissionHandler,
  itineraryHandler: ItineraryHandler,
  disclosureHandler: DisclosureHandler
): Router {
  const router = Router();

  // ============================================================
  // HEALTH CHECK
  // ============================================================
  router.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'itineraries-service' });
  });

  // ============================================================
  // METRICS ENDPOINT
  // ============================================================
  router.get('/metrics', (_req, res) => {
    res.json({
      service: 'itineraries-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      metrics: {
        // Placeholder for actual metrics
        requestCount: 0,
        errorCount: 0,
        avgLatencyMs: 0,
      },
    });
  });

  // ============================================================
  // SUBMISSION ROUTES
  // ============================================================
  const submissionsRouter = Router();

  // Create submission (agents only)
  submissionsRouter.post(
    '/',
    authenticate,
    requireAgentOrAdmin,
    validateBody(createSubmissionRequestSchema),
    submissionHandler.create
  );

  // List submissions
  submissionsRouter.get(
    '/',
    authenticate,
    requireAuthenticated,
    validateQuery(listSubmissionsQuerySchema),
    submissionHandler.list
  );

  // Get submission by ID
  submissionsRouter.get(
    '/:id',
    authenticate,
    requireAuthenticated,
    validateParams(idParamSchema),
    submissionHandler.getById
  );

  router.use('/api/v1/submissions', submissionsRouter);

  // ============================================================
  // ITINERARY ROUTES
  // ============================================================
  const itinerariesRouter = Router();

  // Create itinerary (agents only)
  itinerariesRouter.post(
    '/',
    authenticate,
    requireAgentOrAdmin,
    validateBody(createItineraryRequestSchema),
    itineraryHandler.create
  );

  // List itineraries
  itinerariesRouter.get(
    '/',
    authenticate,
    requireAuthenticated,
    validateQuery(listItinerariesQuerySchema),
    itineraryHandler.list
  );

  // Get itinerary by ID
  itinerariesRouter.get(
    '/:id',
    authenticate,
    requireAuthenticated,
    validateParams(idParamSchema),
    itineraryHandler.getById
  );

  // Update itinerary (agents only)
  itinerariesRouter.put(
    '/:id',
    authenticate,
    requireAgentOrAdmin,
    validateParams(idParamSchema),
    validateBody(updateItineraryRequestSchema),
    itineraryHandler.update
  );

  // Change status
  itinerariesRouter.patch(
    '/:id/status',
    authenticate,
    requireAgentOrAdmin,
    validateParams(idParamSchema),
    validateBody(changeStatusRequestSchema),
    itineraryHandler.changeStatus
  );

  // ============================================================
  // ITEM ROUTES
  // ============================================================

  // Add item
  itinerariesRouter.post(
    '/:id/items',
    authenticate,
    requireAgentOrAdmin,
    validateParams(idParamSchema),
    validateBody(addItemRequestSchema),
    itineraryHandler.addItem
  );

  // Update item
  itinerariesRouter.put(
    '/:itineraryId/items/:itemId',
    authenticate,
    requireAgentOrAdmin,
    validateParams(itemIdParamSchema),
    validateBody(updateItemRequestSchema),
    itineraryHandler.updateItem
  );

  // Remove item
  itinerariesRouter.delete(
    '/:itineraryId/items/:itemId',
    authenticate,
    requireAgentOrAdmin,
    validateParams(itemIdParamSchema),
    itineraryHandler.removeItem
  );

  // ============================================================
  // DISCLOSURE ROUTES
  // ============================================================

  // Get disclosure state
  itinerariesRouter.get(
    '/:id/disclosure',
    authenticate,
    requireAuthenticated,
    validateParams(idParamSchema),
    disclosureHandler.getDisclosureState
  );

  // Get obfuscated view (always available)
  itinerariesRouter.get(
    '/:id/obfuscated',
    authenticate,
    requireAuthenticated,
    validateParams(idParamSchema),
    disclosureHandler.getObfuscatedView
  );

  // Get revealed view (requires payment or agent/admin)
  itinerariesRouter.get(
    '/:id/revealed',
    authenticate,
    requireAuthenticated,
    validateParams(idParamSchema),
    disclosureHandler.getRevealedView
  );

  // Reveal itinerary (admin only)
  itinerariesRouter.post(
    '/:id/reveal',
    authenticate,
    requireAdmin,
    validateParams(idParamSchema),
    validateBody(revealItineraryRequestSchema),
    disclosureHandler.reveal
  );

  // Obfuscate itinerary (admin only)
  itinerariesRouter.post(
    '/:id/obfuscate',
    authenticate,
    requireAdmin,
    validateParams(idParamSchema),
    validateBody(obfuscateItineraryRequestSchema),
    disclosureHandler.obfuscate
  );

  // ============================================================
  // VERSION ROUTES
  // ============================================================

  // Get version history
  itinerariesRouter.get(
    '/:id/versions',
    authenticate,
    requireAgentOrAdmin,
    validateParams(idParamSchema),
    disclosureHandler.getVersionHistory
  );

  // Get at specific version
  itinerariesRouter.get(
    '/:itineraryId/versions/:version',
    authenticate,
    requireAgentOrAdmin,
    validateParams(versionParamSchema),
    disclosureHandler.getAtVersion
  );

  // Compare versions
  itinerariesRouter.get(
    '/:itineraryId/versions/compare/:fromVersion/:toVersion',
    authenticate,
    requireAgentOrAdmin,
    validateParams(versionCompareParamSchema),
    disclosureHandler.compareVersions
  );

  // Restore version
  itinerariesRouter.post(
    '/:id/versions/restore',
    authenticate,
    requireAgentOrAdmin,
    validateParams(idParamSchema),
    validateBody(restoreVersionRequestSchema),
    disclosureHandler.restoreVersion
  );

  router.use('/api/v1/itineraries', itinerariesRouter);

  // ============================================================
  // INTERNAL ROUTES (service-to-service)
  // ============================================================
  const internalRouter = Router();

  // Internal health check
  internalRouter.get('/health', (_req, res) => {
    res.json({ status: 'healthy', internal: true });
  });

  router.use('/internal', authenticateInternal, internalRouter);

  return router;
}
