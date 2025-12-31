export {
  authenticate,
  authenticateInternal,
  requireRole,
  requireAdmin,
  requireAgentOrAdmin,
  requireAuthenticated,
  type AuthenticatedRequest,
  type JwtPayload,
} from './auth.middleware.js';

export {
  validateBody,
  validateQuery,
  validateParams,
  idParamSchema,
  itineraryIdParamSchema,
  itemIdParamSchema,
  versionParamSchema,
  versionCompareParamSchema,
} from './validation.middleware.js';
