/**
 * Matching Service Entry Point
 * 
 * Initializes and starts the matching service with:
 * - Environment validation
 * - Event bus connection
 * - HTTP server with webhook endpoint
 * - Graceful shutdown handling
 */

import { env, isProduction } from './config/index.js';
import { logger } from './lib/logger.js';
import { getEventBus } from './events/index.js';
import { createEventHandlers } from './handlers/index.js';
import { createMatchingEngine } from './engine/index.js';
import { startServer, initWebhookRouter } from './routes/index.js';

/**
 * Service state
 */
let isShuttingDown = false;

/**
 * Start the matching service
 */
async function start(): Promise<void> {
  logger.info({
    service: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    port: env.PORT,
  }, 'Starting matching service');

  try {
    // Connect to event bus
    const eventBus = getEventBus();
    await eventBus.connect();
    logger.info('Event bus connected');

    // Create matching engine
    const matchingEngine = createMatchingEngine();

    // Create and register event handlers with webhook router
    const eventHandlers = createEventHandlers(matchingEngine);
    initWebhookRouter(eventHandlers);
    logger.info('Event handlers registered');

    // Start HTTP server
    await startServer();
    logger.info({ port: env.PORT }, 'HTTP server started');

    // Set up periodic cleanup
    const cleanupInterval = setInterval(() => {
      if (!isShuttingDown) {
        matchingEngine.cleanupStates();
      }
    }, 60 * 60 * 1000); // Every hour

    // Set up graceful shutdown
    setupShutdownHandlers(cleanupInterval);

    logger.info({
      service: env.SERVICE_NAME,
      environment: env.NODE_ENV,
    }, 'Matching service started successfully');

  } catch (error) {
    logger.fatal({ error }, 'Failed to start matching service');
    process.exit(1);
  }
}

/**
 * Set up graceful shutdown handlers
 */
function setupShutdownHandlers(cleanupInterval: NodeJS.Timeout): void {
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    logger.info({ signal }, 'Shutting down matching service');

    // Clear cleanup interval
    clearInterval(cleanupInterval);

    try {
      // Disconnect from event bus
      const eventBus = getEventBus();
      await eventBus.disconnect();
      logger.info('Event bus disconnected');

      logger.info('Matching service shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
}

// Start the service
start();
