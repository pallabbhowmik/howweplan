/**
 * Webhook Router
 * 
 * Receives events from the HTTP-based event bus.
 */

import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { DomainEvent } from '../events/types';
import { getHandler } from '../events/handlers';
import { NotificationService } from '../services/notification.service';
import { AuditService } from '../services/audit.service';
import { logger } from '../utils/logger';

export function createWebhookRouter(
  notificationService: NotificationService,
  auditService: AuditService
): Router {
  const router = Router();

  /**
   * Authenticate webhook requests
   */
  const authenticate = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    // Use EVENT_BUS_API_KEY for webhook authentication
    const apiKey = env.EVENT_BUS_API_KEY || process.env.WEBHOOK_API_KEY;
    
    if (!apiKey) {
      logger.warn('No API key configured for webhooks, allowing request');
      return next();
    }
    
    if (!token || token !== apiKey) {
      logger.warn('Unauthorized webhook request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
  };

  /**
   * POST /webhook/event
   * Receives a single event from the event bus
   */
  router.post('/event', authenticate, async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const event = req.body as DomainEvent;
      
      if (!event || !event.eventType) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid event format',
        });
        return;
      }

      logger.info('Received webhook event', {
        eventId: event.eventId,
        eventType: event.eventType,
        correlationId: event.correlationId,
      });

      // Get handler for event type
      const handler = getHandler(event.eventType);

      if (!handler) {
        logger.debug('No handler registered for event type', {
          eventType: event.eventType,
        });
        res.json({
          success: true,
          handled: false,
          message: 'No handler registered for this event type',
        });
        return;
      }

      // Process the event
      await handler(event, notificationService, auditService);

      const duration = Date.now() - startTime;
      logger.info('Webhook event processed', {
        eventId: event.eventId,
        eventType: event.eventType,
        durationMs: duration,
      });

      res.json({
        success: true,
        handled: true,
        eventId: event.eventId,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error processing webhook event', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
      });

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /webhook/events
   * Receives a batch of events from the event bus
   */
  router.post('/events', authenticate, async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const { events } = req.body;
      
      if (!events || !Array.isArray(events)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'events array is required',
        });
        return;
      }

      logger.info('Received webhook batch', { eventCount: events.length });

      const results = [];

      for (const event of events) {
        try {
          const handler = getHandler(event.eventType);

          if (handler) {
            await handler(event, notificationService, auditService);
            results.push({
              eventId: event.eventId,
              eventType: event.eventType,
              handled: true,
            });
          } else {
            results.push({
              eventId: event.eventId,
              eventType: event.eventType,
              handled: false,
              reason: 'No handler registered',
            });
          }
        } catch (error) {
          logger.error('Error processing event in batch', {
            eventId: event.eventId,
            eventType: event.eventType,
            error: error instanceof Error ? error.message : String(error),
          });
          results.push({
            eventId: event.eventId,
            eventType: event.eventType,
            handled: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const duration = Date.now() - startTime;
      const handledCount = results.filter(r => r.handled).length;

      logger.info('Webhook batch processed', {
        totalEvents: events.length,
        handledEvents: handledCount,
        durationMs: duration,
      });

      res.json({
        success: true,
        processed: events.length,
        handled: handledCount,
        results,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error processing webhook batch', {
        error: error instanceof Error ? error.message : String(error),
        durationMs: duration,
      });

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
