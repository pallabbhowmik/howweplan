/**
 * Reviews Service Entry Point
 * 
 * Initializes and starts the reviews service.
 */

import { serve } from '@hono/node-server';
import { app } from './api';
import { appConfig } from './config/env';
import { initializeEventBus, closeEventBus } from './events/publisher';
import { initializeEventConsumer, closeEventConsumer } from './events/consumer';

if (process.env.NODE_ENV === 'production') {
  const noop = () => undefined;
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

// =============================================================================
// SERVICE STARTUP
// =============================================================================

async function startService(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    REVIEWS SERVICE                             ║
║═══════════════════════════════════════════════════════════════║
║  Version: ${appConfig.version.padEnd(50)}║
║  Environment: ${appConfig.environment.padEnd(46)}║
║  Port: ${String(appConfig.port).padEnd(53)}║
╚═══════════════════════════════════════════════════════════════╝
  `);

  // Initialize event bus connections
  console.log('[Startup] Initializing event bus...');
  try {
    await initializeEventBus();
    console.log('[Startup] Event bus publisher initialized');

    await initializeEventConsumer();
    console.log('[Startup] Event bus consumer initialized');
  } catch (error) {
    console.warn('[Startup] Event bus initialization failed — service will run without event bus:', error instanceof Error ? error.message : error);
    console.warn('[Startup] Events will not be published or consumed. The service will continue to handle HTTP requests.');
  }

  // Start HTTP server
  console.log(`[Startup] Starting HTTP server on port ${appConfig.port}...`);
  
  serve({
    fetch: app.fetch,
    port: appConfig.port,
  });

  console.log(`[Startup] Service ready at http://localhost:${appConfig.port}`);
  console.log(`[Startup] Health check: http://localhost:${appConfig.port}/health`);
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Shutdown] Received ${signal}, shutting down gracefully...`);

  try {
    // Close event bus connections
    console.log('[Shutdown] Closing event bus connections...');
    await closeEventConsumer();
    await closeEventBus();
    console.log('[Shutdown] Event bus connections closed');

    console.log('[Shutdown] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Shutdown] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =============================================================================
// START SERVICE
// =============================================================================

startService().catch((error) => {
  console.error('[Startup] Failed to start service:', error);
  process.exit(1);
});

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from './config/env';
export * from './models';
export * from './schemas';
export * from './services';
export * from './repositories';
export * from './events';
export * from './api';
