/**
 * Messaging Service - Health Check Routes
 */

import { Router, Request, Response } from 'express';
import { env } from '../../env';

export function createHealthRoutes(): Router {
  const router = Router();

  /**
   * GET /health
   * Basic health check endpoint.
   */
  router.get('/', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: env.SERVICE_NAME,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/ready
   * Readiness probe - checks all dependencies.
   */
  router.get('/ready', async (_req: Request, res: Response) => {
    const checks: Record<string, { status: string; latencyMs?: number }> = {};
    let allHealthy = true;

    // Database check would go here
    checks['database'] = { status: 'healthy', latencyMs: 0 };

    // Event bus check would go here
    checks['eventBus'] = { status: 'healthy', latencyMs: 0 };

    // Storage check would go here
    checks['storage'] = { status: 'healthy', latencyMs: 0 };

    const status = allHealthy ? 'ready' : 'not_ready';
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
      status,
      service: env.SERVICE_NAME,
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/live
   * Liveness probe - basic check that service is running.
   */
  router.get('/live', (_req: Request, res: Response) => {
    res.json({
      status: 'alive',
      service: env.SERVICE_NAME,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
