/**
 * API module barrel export and router composition.
 */

import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { userRouter } from './user.routes.js';
import { agentRouter } from './agent.routes.js';
import { adminRouter } from './admin.routes.js';
import { healthRouter } from './health.routes.js';

/**
 * Creates the composed API router.
 */
export function createApiRouter(): Router {
  const router = Router();

  // Health checks (no prefix, no auth)
  router.use('/health', healthRouter);

  // API routes
  router.use('/auth', authRouter);
  router.use('/users', userRouter);
  router.use('/agents', agentRouter);
  router.use('/admin', adminRouter);

  return router;
}

export { authRouter, userRouter, agentRouter, adminRouter, healthRouter };
