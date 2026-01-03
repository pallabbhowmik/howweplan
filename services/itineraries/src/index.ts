import express, { type Express, type Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './env.js';
import { logger } from './utils/logger.js';
import { errorToResponse, ServiceError } from './utils/errors.js';
import { idempotencyMiddleware } from './api/middleware/idempotency.middleware.js';

// Repositories
import { SubmissionRepository } from './repository/submission.repository.js';
import { ItineraryRepository } from './repository/itinerary.repository.js';
import { VersionRepository } from './repository/version.repository.js';

// Services
import { SubmissionService } from './services/submission.service.js';
import { ItineraryService } from './services/itinerary.service.js';
import { DisclosureService } from './services/disclosure.service.js';
import { VersionService } from './services/version.service.js';

// Handlers
import { SubmissionHandler } from './api/handlers/submission.handler.js';
import { ItineraryHandler } from './api/handlers/itinerary.handler.js';
import { DisclosureHandler } from './api/handlers/disclosure.handler.js';

// Routes
import { createRoutes } from './api/routes.js';

// Events
import { initializeEventBus, closeEventBus, getEventBusHealth } from './events/publishers.js';
import { initializeSubscribers, closeSubscribers } from './events/subscribers.js';

/**
 * Application factory.
 */
function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // Request parsing
  app.use(express.json({ limit: `${env.MAX_SUBMISSION_SIZE_MB}mb` }));
  app.use(express.urlencoded({ extended: true }));

  // Idempotency middleware for safe retries
  app.use(idempotencyMiddleware());

  // Request logging
  app.use(pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  }));

  // Initialize repositories
  const submissionRepository = new SubmissionRepository();
  const itineraryRepository = new ItineraryRepository();
  const versionRepository = new VersionRepository();

  // Initialize services
  const versionService = new VersionService(versionRepository);
  const submissionService = new SubmissionService(submissionRepository);
  const itineraryService = new ItineraryService(itineraryRepository, versionService);
  const disclosureService = new DisclosureService(itineraryRepository);

  // Initialize handlers
  const submissionHandler = new SubmissionHandler(submissionService);
  const itineraryHandler = new ItineraryHandler(itineraryService);
  const disclosureHandler = new DisclosureHandler(
    disclosureService,
    versionService,
    itineraryService
  );

  // Mount routes
  const routes = createRoutes(submissionHandler, itineraryHandler, disclosureHandler);
  app.use(routes);

  // Error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const { statusCode, body } = errorToResponse(err);

    if (statusCode >= 500) {
      logger.error('Unhandled error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    res.status(statusCode).json(body);
  });

  // Store services for event subscriber initialization
  (app as Express & { services: { disclosureService: DisclosureService } }).services = {
    disclosureService,
  };

  return app;
}

/**
 * Start the server.
 */
async function start(): Promise<void> {
  logger.info('Starting itineraries service...', {
    version: env.SERVICE_VERSION,
    environment: env.NODE_ENV,
  });

  const app = createApp();

  // Initialize event bus
  try {
    await initializeEventBus();
    logger.info('Event bus initialized');
  } catch (error) {
    logger.warn('Event bus initialization failed, continuing without events', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Initialize event subscribers
  try {
    const services = (app as Express & { services: { disclosureService: DisclosureService } }).services;
    await initializeSubscribers({
      disclosureService: services.disclosureService,
    });
    logger.info('Event subscribers initialized');
  } catch (error) {
    logger.warn('Event subscribers initialization failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Start HTTP server
  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`, {
      port: env.PORT,
      baseUrl: env.API_BASE_URL,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await closeSubscribers();
        await closeEventBus();
        logger.info('Event connections closed');
      } catch (error) {
        logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  // Uncaught exception handler
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

// Start the service
start().catch((error) => {
  logger.error('Failed to start service', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
