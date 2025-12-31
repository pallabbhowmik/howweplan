import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { initializePool, closePool } from './database/index';
import { eventBusConsumer } from './events/index';
import { authMiddleware, errorHandler } from './api/middleware/index';
import { queryRoutes, ingestRoutes, healthRoutes } from './api/routes/index';
import { logger } from './utils/logger';

/**
 * Build the Fastify application
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // Using custom logger
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  });

  // Register CORS
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Service-Token', 'X-Request-ID'],
    credentials: true,
  });

  // Register rate limiting
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
  });

  // Register error handler
  await app.register(errorHandler);

  // Register authentication middleware
  await app.register(authMiddleware);

  // Register routes
  await app.register(healthRoutes);
  await app.register(queryRoutes, { prefix: '/api/v1/audit' });
  await app.register(ingestRoutes, { prefix: '/api/v1/audit' });

  // Request logging hook
  app.addHook('onRequest', async (request) => {
    logger.debug('Incoming request', {
      method: request.method,
      url: request.url,
      requestId: request.id,
    });
  });

  // Response logging hook
  app.addHook('onResponse', async (request, reply) => {
    logger.info({
      message: 'Request completed',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
      requestId: request.id,
    });
  });

  return app;
}

/**
 * Start the service
 */
async function start(): Promise<void> {
  logger.info(`Starting ${env.SERVICE_NAME} v${env.SERVICE_VERSION}...`);

  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    initializePool();
    logger.info('Database connection initialized');

    // Connect to event bus (optional)
    if (env.EVENT_BUS_URL) {
      logger.info('Connecting to event bus...');
      try {
        await eventBusConsumer.connect();
        await eventBusConsumer.startConsuming();
        logger.info('Event bus consumer started');
      } catch (error) {
        logger.warn('Failed to connect to event bus, continuing without it', { error });
      }
    } else {
      logger.info('Event bus not configured, skipping');
    }

    // Build and start HTTP server
    const app = await buildApp();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });

    logger.info(`${env.SERVICE_NAME} listening on port ${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Health check: http://localhost:${env.PORT}${env.HEALTH_CHECK_PATH}`);
    logger.info(`Ready check: http://localhost:${env.PORT}${env.READY_CHECK_PATH}`);

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // Stop accepting new requests
        await app.close();
        logger.info('HTTP server closed');

        // Disconnect from event bus
        await eventBusConsumer.disconnect();
        logger.info('Event bus disconnected');

        // Close database connections
        await closePool();
        logger.info('Database connections closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start service', error as Error);
    process.exit(1);
  }
}

// Start the service
start();
