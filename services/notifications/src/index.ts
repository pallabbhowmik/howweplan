/**
 * Notification Service Entry Point
 * 
 * Event-driven notification delivery service.
 * 
 * Responsibilities:
 * - Email notifications
 * - SMS notifications (placeholder)
 * - Push notifications (placeholder)
 * - Delivery logging and tracking
 * - Audit event emission
 * 
 * Architecture:
 * - Consumes domain events from event bus
 * - Sends notifications via configured providers
 * - Tracks delivery status for idempotency
 * - Emits audit events for all state changes
 */

import express, { Express } from 'express';
import { env, logConfigSummary } from './config/env';
import { createHealthRouter, createWebhookRouter, createNotificationsRouter } from './routes';
import { EventConsumer } from './events';
import { NotificationService, AuditService, RateLimiterService } from './services';
import { DeliveryLogRepository } from './repositories';
import { logger } from './utils/logger';

if (process.env.NODE_ENV === 'production') {
  const noop = () => undefined;
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

class Application {
  private readonly app: Express;
  private readonly deliveryLogRepo: DeliveryLogRepository;
  private readonly rateLimiter: RateLimiterService;
  private readonly auditService: AuditService;
  private readonly notificationService: NotificationService;
  private readonly eventConsumer: EventConsumer;

  constructor() {
    this.app = express();

    // Initialize repositories
    this.deliveryLogRepo = new DeliveryLogRepository();

    // Initialize services
    this.rateLimiter = new RateLimiterService();
    this.auditService = new AuditService();
    this.notificationService = new NotificationService(
      this.deliveryLogRepo,
      this.rateLimiter,
      this.auditService
    );

    // Initialize event consumer
    this.eventConsumer = new EventConsumer(
      this.notificationService,
      this.auditService
    );

    // Configure Express
    this.configureMiddleware();
    this.configureRoutes();
  }

  private configureMiddleware(): void {
    this.app.use(express.json());
    this.app.disable('x-powered-by');
  }

  private configureRoutes(): void {
    this.app.use(createHealthRouter());
    // REST API for notification queries
    this.app.use(createNotificationsRouter());
    // Webhook endpoint for receiving events from HTTP-based event bus
    this.app.use('/webhook', createWebhookRouter(
      this.notificationService,
      this.auditService
    ));
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting notification service...');

      // Log configuration
      logConfigSummary();

      // Initialize database
      await this.deliveryLogRepo.initialize();
      logger.info('Database initialized');

      // Initialize audit service
      await this.auditService.initialize();
      logger.info('Audit service initialized');

      // Start event consumer
      await this.eventConsumer.start();
      logger.info('Event consumer started');

      // Start HTTP server
      const server = this.app.listen(env.PORT, () => {
        logger.info(`HTTP server listening on port ${env.PORT}`);
      });

      // Graceful shutdown
      this.setupShutdown(server);
    } catch (error) {
      logger.error('Failed to start application', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }

  private setupShutdown(server: ReturnType<typeof this.app.listen>): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');
      });

      try {
        // Stop event consumer
        await this.eventConsumer.stop();

        // Stop audit service (flushes remaining events)
        await this.auditService.stop();

        // Close database connections
        await this.deliveryLogRepo.close();

        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start application
const app = new Application();
app.start();
