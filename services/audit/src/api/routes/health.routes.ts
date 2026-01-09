import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { checkHealth as checkDbHealth } from '../../database/index';

/**
 * Health check routes
 * Used by load balancers, Kubernetes, and monitoring systems
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /
   * Root endpoint - redirect to health for Render health checks
   */
  fastify.get(
    '/',
    {},
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.redirect('/health');
    }
  );

  /**
   * GET /health
   * Basic liveness check - is the service running?
   */
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * GET /ready
   * Readiness check - is the service ready to handle requests?
   * Checks database connectivity
   */
  fastify.get(
    '/ready',
    {},
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const dbHealth = await checkDbHealth();

      const response = {
        status: dbHealth.healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealth,
        },
      };

      if (!dbHealth.healthy) {
        return reply.status(503).send(response);
      }

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /metrics
   * Basic metrics endpoint (can be extended with Prometheus metrics)
   */
  fastify.get(
    '/metrics',
    {
      preHandler: fastify.authenticate ? [fastify.authenticate] : [],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const dbHealth = await checkDbHealth();

      return reply.status(200).send({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: {
          healthy: dbHealth.healthy,
          latencyMs: dbHealth.latencyMs,
        },
      });
    }
  );
}
