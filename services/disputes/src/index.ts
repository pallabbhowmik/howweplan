/**
 * Dispute Service Entry Point
 * 
 * This is the main entry point for the dispute service.
 * It initializes the server, registers routes, and starts listening.
 */

import express from 'express';
import { config, env } from './env.js';
import { createRouter } from './api/routes.js';
import {
  correlationMiddleware,
  requestLoggingMiddleware,
  authMiddleware,
  errorMiddleware,
  notFoundHandler,
} from './api/middleware.js';
import { idempotencyMiddleware } from './api/idempotency.middleware.js';
import { logger } from './audit/logger.js';
import { eventSubscriber, registerDefaultHandlers } from './events/subscriber.js';

if (process.env.NODE_ENV === 'production') {
  const noop = () => undefined;
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

/**
 * Create and configure the Express application.
 */
function createApp(): express.Application {
  const app = express();

  // CORS middleware - allow cross-origin requests
  app.use((req, res, next) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Correlation ID and logging
  app.use(correlationMiddleware);
  app.use(requestLoggingMiddleware);

  // Idempotency middleware for safe retries
  app.use(idempotencyMiddleware());

  // Root endpoint - redirect to health for Render health checks
  app.get('/', (_req, res) => {
    res.redirect('/health');
  });

  // Health check (no auth required)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: config.service.name,
      version: config.service.version,
      timestamp: new Date().toISOString(),
    });
  });

  // Ready check (no auth required)
  app.get('/ready', (_req, res) => {
    // In production, check database connectivity, etc.
    res.json({
      status: 'ready',
      service: config.service.name,
    });
  });

  // API routes with authentication
  const apiRouter = createRouter();
  app.use(config.api.prefix, authMiddleware, apiRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorMiddleware);

  return app;
}

/**
 * Start the server.
 */
async function start(): Promise<void> {
  logger.info({
    msg: 'Starting dispute service',
    service: config.service.name,
    version: config.service.version,
    environment: env.NODE_ENV,
  });

  // Register event handlers
  registerDefaultHandlers();

  // Create and start the app
  const app = createApp();

  const server = app.listen(config.service.port, () => {
    logger.info({
      msg: 'Dispute service started',
      port: config.service.port,
      apiPrefix: config.api.prefix,
    });
  });

  // Start event subscriber in background
  // eventSubscriber.start().catch((err) => {
  //   logger.error({ msg: 'Event subscriber error', error: err.message });
  // });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ msg: `Received ${signal}, shutting down gracefully` });

    eventSubscriber.stop();

    server.close(() => {
      logger.info({ msg: 'Server closed' });
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      logger.error({ msg: 'Forced shutdown after timeout' });
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the service
start().catch((err) => {
  logger.error({ msg: 'Failed to start service', error: err.message });
  process.exit(1);
});
