/**
 * HTTP Server
 * 
 * Simple HTTP server for the matching service.
 * Handles health checks and webhook events.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { logger } from '../lib/logger.js';
import { env } from '../config/index.js';
import { handleWebhook } from './webhook.router.js';
import { getEventBus } from '../events/index.js';

/**
 * Health check response
 */
function handleHealthCheck(res: ServerResponse): void {
  const eventBus = getEventBus();
  
  const health = {
    status: 'healthy',
    service: env.SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    eventBus: {
      connected: eventBus.connected,
    },
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(health));
}

/**
 * Request handler
 */
async function requestHandler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  // CORS headers for preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route requests
  if (url === '/health' && method === 'GET') {
    handleHealthCheck(res);
    return;
  }

  if (url === '/webhook/event' && method === 'POST') {
    await handleWebhook(req, res);
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Start the HTTP server
 */
export function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      requestHandler(req, res).catch((error) => {
        logger.error({ error }, 'Request handler error');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      });
    });

    server.on('error', (error) => {
      logger.error({ error }, 'Server error');
      reject(error);
    });

    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'HTTP server listening');
      resolve();
    });
  });
}
