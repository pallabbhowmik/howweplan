/**
 * Messaging Service - Application Entry Point
 *
 * Production-grade Express application setup.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env, config } from './env';
import { createAuthMiddleware } from './middleware/auth';
import { idempotencyMiddleware } from './middleware/idempotency';
import {
  createConversationRoutes,
  createMessageRoutes,
  createAttachmentRoutes,
  createEvidenceRoutes,
  createWebhookRoutes,
  createHealthRoutes,
} from './api/routes';
import { errorHandler } from './api/errors';
import { conversationService } from './services/conversation.service';
import { messageService } from './services/message.service';
import { attachmentService } from './services/attachment.service';
import { evidenceService } from './services/evidence.service';
import { subscribeToConsumedEvents } from './events';

// =============================================================================
// APPLICATION SETUP
// =============================================================================

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration - restrict origins in production
  const corsOrigins = config.isDevelopment 
    ? true // Allow all in development
    : (process.env['ALLOWED_ORIGINS']?.split(',') || [
        'https://howweplan-user.vercel.app',
        'https://howweplan-agent.vercel.app', 
        'https://howweplan-admin.vercel.app'
      ]);
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // Idempotency middleware for safe retries
  app.use(idempotencyMiddleware());

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (config.isDevelopment) {
      console.log(`${req.method} ${req.path}`);
    }
    next();
  });

  // Create middleware
  const authMiddleware = createAuthMiddleware();

  // Mount routes
  app.use('/health', createHealthRoutes());

  app.use(
    '/api/v1/conversations',
    createConversationRoutes(conversationService, authMiddleware)
  );

  app.use(
    '/api/v1/messages',
    createMessageRoutes(messageService, authMiddleware)
  );

  app.use(
    '/api/v1/attachments',
    createAttachmentRoutes(attachmentService, authMiddleware)
  );

  app.use(
    '/api/v1/evidence',
    createEvidenceRoutes(evidenceService, authMiddleware)
  );

  app.use(
    '/internal/webhooks',
    createWebhookRoutes(conversationService, authMiddleware)
  );

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    MESSAGING SERVICE                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Service: ${env.SERVICE_NAME}`);
  console.log('');

  // Create Express app
  const app = createApp();

  // Subscribe to consumed events
  try {
    await subscribeToConsumedEvents({
      onBookingStateChanged: async (event) => {
        console.log('[Event] Booking state changed:', event);
        // Handle booking state change
      },
      onDisputeCreated: async (event) => {
        console.log('[Event] Dispute created:', event);
        // Handle dispute creation
      },
      onDisputeResolved: async (event) => {
        console.log('[Event] Dispute resolved:', event);
        // Handle dispute resolution
      },
    });
    console.log('✓ Event subscriptions established');
  } catch (error) {
    console.warn('⚠ Event bus connection failed (continuing without events):', error);
  }

  // Start HTTP server
  const server = app.listen(config.server.port, () => {
    console.log('');
    console.log(`✓ HTTP server listening on port ${config.server.port}`);
    console.log('');
    console.log('API Endpoints:');
    console.log(`  Health:        http://localhost:${config.server.port}/health`);
    console.log(`  Conversations: http://localhost:${config.server.port}/api/v1/conversations`);
    console.log(`  Messages:      http://localhost:${config.server.port}/api/v1/messages`);
    console.log(`  Attachments:   http://localhost:${config.server.port}/api/v1/attachments`);
    console.log(`  Evidence:      http://localhost:${config.server.port}/api/v1/evidence`);
    console.log('');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Run if this is the main module
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { startServer };
