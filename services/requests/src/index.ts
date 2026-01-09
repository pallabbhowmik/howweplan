/**
 * Travel Request Service - Entry Point
 * 
 * Initializes all dependencies and starts the HTTP server.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Environment validation runs on import
import { config } from './env';

// CORS configuration
const corsOptions = {
  origin: config.app.isProduction 
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://howweplan-user.vercel.app', 'https://howweplan-agent.vercel.app', 'https://howweplan-admin.vercel.app'])
    : true, // Allow all in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
};

// Domain
import { createRequestRepository } from './domain/request.repository';
import { createDestinationRepository } from './domain/destination.repository';
import { createSettingsRepository } from './domain/settings.repository';

// Services
import { createLogger } from './services/logger.service';
import { createAuditService } from './services/audit.service';
import { createCapEnforcementService } from './services/cap-enforcement.service';
import { createRequestService } from './services/request.service';
import { createMatchingServiceClient } from './services/matching.service';

// Events
import { createEventEmitter } from './events/event-emitter';

// API
import { createRoutes } from './api/routes';

// Middleware
import {
  createAuthMiddleware,
  createAdminAuthMiddleware,
  createErrorMiddleware,
  createRateLimitMiddleware,
  requestIdMiddleware,
  idempotencyMiddleware,
  correlationMiddleware,
  metricsMiddleware,
  getMetrics,
} from './middleware';

async function main() {
  const logger = createLogger();

  logger.info('Starting request service', {
    version: config.app.version,
    environment: config.app.nodeEnv,
  });

  // Initialize dependencies
  const repository = createRequestRepository();
  const destinationRepository = createDestinationRepository();
  const settingsRepository = createSettingsRepository();
  const eventEmitter = createEventEmitter(logger);
  const auditService = createAuditService(logger);
  const capEnforcementService = createCapEnforcementService(repository, logger);
  const matchingService = createMatchingServiceClient(logger);
  
  // Connect to event bus (optional)
  try {
    await eventEmitter.connect();
  } catch (error) {
    logger.warn('Failed to connect to event bus, continuing without it', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  const requestService = createRequestService(
    repository,
    capEnforcementService,
    eventEmitter,
    auditService,
    logger,
    matchingService
  );

  // Create middleware
  const authMiddleware = createAuthMiddleware(logger);
  const adminAuthMiddleware = createAdminAuthMiddleware(logger);
  const errorMiddleware = createErrorMiddleware(logger);
  const rateLimitMiddleware = createRateLimitMiddleware(logger);

  // Create Express app
  const app = express();

  // Global middleware
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(correlationMiddleware());
  app.use(metricsMiddleware());
  app.use(rateLimitMiddleware);
  app.use(idempotencyMiddleware());

  // Metrics endpoint (before auth)
  app.get('/metrics', (_req, res) => {
    res.json({
      service: 'requests-service',
      timestamp: new Date().toISOString(),
      metrics: getMetrics(),
    });
  });

  // API routes
  const routes = createRoutes({
    requestService,
    capEnforcementService,
    destinationRepository,
    settingsRepository,
    authMiddleware,
    adminAuthMiddleware,
  });

  app.use('/api/v1', routes);
  // Back-compat for gateway/local dev: gateway strips /api/{service} before proxying
  // so the service should also accept unprefixed routes (e.g. /destinations).
  app.use('/', routes);

  // Error handling (must be last)
  app.use(errorMiddleware);

  // Start server
  const server = app.listen(config.app.port, () => {
    logger.info(`Server listening on port ${config.app.port}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    server.close(async () => {
      logger.info('HTTP server closed');
      await eventEmitter.disconnect();
      logger.info('Event emitter disconnected');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start background job for expiry processing
  const startExpiryProcessor = () => {
    const EXPIRY_CHECK_INTERVAL = 60 * 1000; // 1 minute
    
    setInterval(async () => {
      try {
        const count = await requestService.processExpiredRequests();
        if (count > 0) {
          logger.info('Processed expired requests', { count });
        }
      } catch (error) {
        logger.error('Failed to process expired requests', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, EXPIRY_CHECK_INTERVAL);

    logger.info('Expiry processor started', { intervalMs: EXPIRY_CHECK_INTERVAL });
  };

  startExpiryProcessor();
}

main().catch((error) => {
  console.error('Failed to start service:', error);
  process.exit(1);
});
