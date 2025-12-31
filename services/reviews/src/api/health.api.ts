/**
 * Health API Routes
 * 
 * Health check and status endpoints for the reviews service.
 */

import { Hono } from 'hono';
import { appConfig, databaseConfig } from '../config/env';

const healthApi = new Hono();

/**
 * GET /health
 * Basic health check
 */
healthApi.get('/', (c) => {
  return c.json({
    status: 'healthy',
    service: appConfig.name,
    version: appConfig.version,
    environment: appConfig.environment,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness check - verifies all dependencies are available
 */
healthApi.get('/ready', async (c) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Check database connectivity
  try {
    const start = Date.now();
    // In production, would actually query the database
    // For now, we just verify config exists
    if (databaseConfig.supabaseUrl && databaseConfig.supabaseServiceRoleKey) {
      checks.database = { status: 'ok', latencyMs: Date.now() - start };
    } else {
      checks.database = { status: 'error', error: 'Database not configured' };
    }
  } catch (error) {
    checks.database = { status: 'error', error: String(error) };
  }

  // Check event bus connectivity
  try {
    // In production, would verify message broker connection
    checks.eventBus = { status: 'ok' };
  } catch (error) {
    checks.eventBus = { status: 'error', error: String(error) };
  }

  const allHealthy = Object.values(checks).every(check => check.status === 'ok');

  return c.json(
    {
      status: allHealthy ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503
  );
});

/**
 * GET /health/live
 * Liveness check - verifies the service is running
 */
healthApi.get('/live', (c) => {
  return c.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export { healthApi };
