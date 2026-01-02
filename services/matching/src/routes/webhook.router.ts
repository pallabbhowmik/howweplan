/**
 * Webhook Router
 * 
 * Receives events from the Event Bus via HTTP POST.
 * This replaces Redis pub/sub for inbound event processing.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { logger } from '../lib/logger.js';
import { env } from '../config/index.js';
import { EventHandlers } from '../handlers/event-handlers.js';
import type { BaseEvent } from '../types/events.js';
import { EVENT_CHANNELS } from '../types/events.js';

// Event handlers instance
let eventHandlers: EventHandlers | null = null;

/**
 * Initialize the webhook router with event handlers
 */
export function initWebhookRouter(handlers: EventHandlers): void {
  eventHandlers = handlers;
  logger.info('Webhook router initialized');
}

/**
 * Parse JSON body from request
 */
async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Handle webhook event from Event Bus
 */
export async function handleWebhook(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Verify API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== env.EVENT_BUS_API_KEY) {
    logger.warn({ providedKey: apiKey?.slice(0, 8) }, 'Invalid API key for webhook');
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  if (!eventHandlers) {
    logger.error('Event handlers not initialized');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Service not ready' }));
    return;
  }

  try {
    const body = await parseBody(req) as { channel: string; event: BaseEvent };
    const { channel, event } = body;

    logger.debug({
      channel,
      eventId: event.eventId,
      eventType: event.eventType,
    }, 'Webhook received event');

    // Route event to appropriate handler based on channel
    switch (channel) {
      case EVENT_CHANNELS.REQUEST_CREATED:
        await eventHandlers.handleRequestCreated(event as any);
        break;
      case EVENT_CHANNELS.AGENT_AVAILABILITY_CHANGED:
        await eventHandlers.handleAgentAvailabilityChanged(event as any);
        break;
      case EVENT_CHANNELS.AGENT_RESPONDED_TO_MATCH:
        await eventHandlers.handleAgentRespondedToMatch(event as any);
        break;
      case EVENT_CHANNELS.ADMIN_OVERRIDE_REQUESTED:
        await eventHandlers.handleAdminOverrideRequested(event as any);
        break;
      case EVENT_CHANNELS.MATCHING_TIMEOUT_EXPIRED:
        await eventHandlers.handleMatchingTimeoutExpired(event as any);
        break;
      default:
        logger.debug({ channel }, 'Ignoring event for unhandled channel');
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    logger.error({ error }, 'Failed to process webhook event');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
