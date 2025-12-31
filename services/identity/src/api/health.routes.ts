/**
 * Health check API routes.
 */

import { Router, Request, Response } from 'express';
import { getDbClient } from '../services/database.js';
import { env } from '../env.js';

const router = Router();

/**
 * GET /health
 * Basic health check endpoint.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  res.json({
    status: 'healthy',
    service: env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness check that verifies database connectivity.
 */
router.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDbClient();
    
    // Test database connectivity with a simple query
    const { error } = await db.from('users').select('id').limit(1);
    
    if (error) {
      res.status(503).json({
        status: 'not_ready',
        service: env.SERVICE_NAME,
        checks: {
          database: {
            status: 'unhealthy',
            error: error.message,
          },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: 'ready',
      service: env.SERVICE_NAME,
      checks: {
        database: {
          status: 'healthy',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: env.SERVICE_NAME,
      checks: {
        database: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/live
 * Liveness check - just confirms the service is running.
 */
router.get('/live', (_req: Request, res: Response): void => {
  res.json({
    status: 'alive',
    service: env.SERVICE_NAME,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
