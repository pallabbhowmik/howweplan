/**
 * Health Check Router
 * 
 * Exposes health check endpoints for orchestration and monitoring.
 */

import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { getEmailProvider } from '../providers/email';
import { getSmsProvider } from '../providers/sms';
import { getPushProvider } from '../providers/push';

export function createHealthRouter(): Router {
  const router = Router();

  /**
   * Basic liveness check
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: env.SERVICE_NAME,
      version: env.SERVICE_VERSION,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed readiness check
   */
  router.get('/health/ready', async (_req: Request, res: Response) => {
    const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};

    // Check email provider
    if (env.ENABLE_EMAIL) {
      try {
        const emailProvider = getEmailProvider();
        const healthy = await emailProvider.healthCheck();
        checks.email = healthy
          ? { status: 'ok' }
          : { status: 'error', message: 'Provider health check failed' };
      } catch (error) {
        checks.email = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      checks.email = { status: 'ok', message: 'disabled' };
    }

    // Check SMS provider
    if (env.ENABLE_SMS && env.SMS_ENABLED) {
      try {
        const smsProvider = getSmsProvider();
        const healthy = await smsProvider.healthCheck();
        checks.sms = healthy
          ? { status: 'ok' }
          : { status: 'error', message: 'Provider health check failed' };
      } catch (error) {
        checks.sms = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      checks.sms = { status: 'ok', message: 'disabled' };
    }

    // Check Push provider
    if (env.ENABLE_PUSH && env.PUSH_ENABLED) {
      try {
        const pushProvider = getPushProvider();
        const healthy = await pushProvider.healthCheck();
        checks.push = healthy
          ? { status: 'ok' }
          : { status: 'error', message: 'Provider health check failed' };
      } catch (error) {
        checks.push = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else {
      checks.push = { status: 'ok', message: 'disabled' };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
    const status = allHealthy ? 200 : 503;

    res.status(status).json({
      status: allHealthy ? 'ready' : 'degraded',
      service: env.SERVICE_NAME,
      version: env.SERVICE_VERSION,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  return router;
}
