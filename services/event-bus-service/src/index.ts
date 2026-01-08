/**
 * Event Bus Service - Main Entry Point
 * 
 * Industry-standard event bus implementation following:
 * - Append-only, immutable events (facts that happened)
 * - Schema-first with validation and versioning
 * - At-least-once delivery with idempotent consumers
 * - Pull-based consumption with consumer acknowledgements
 * - Dead Letter Queue for poison messages
 * - Service-level authorization
 * - Comprehensive metrics and observability
 * 
 * API Endpoints:
 * - POST /publish - Publish an event
 * - POST /publish/batch - Publish multiple events
 * - POST /consumers - Register a consumer
 * - POST /subscribe - Subscribe to event types
 * - POST /consume - Pull events (pull model)
 * - POST /ack - Acknowledge event processing
 * - POST /nack - Negative acknowledgement
 * - GET /events - Query events by criteria
 * - GET /events/:eventId - Get specific event
 * - GET /events/trace/:correlationId - Get event trace
 * - GET /dlq - List DLQ entries
 * - POST /dlq/:dlqId/retry - Retry DLQ entry
 * - POST /dlq/:dlqId/discard - Discard DLQ entry
 * - GET /metrics - Prometheus metrics
 * - GET /health - Health check
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Internal imports
import { EventEnvelope, EventDomain, EventState, EventTypes } from './types/event.types';
import { EventStore, InMemoryEventStore, createEventStore, getEventStore } from './store/event-store';
import { SchemaRegistry, getSchemaRegistry } from './schema/schema-registry';
import { DeadLetterQueue, InMemoryDLQStorage, createDeadLetterQueue, getDeadLetterQueue } from './dlq/dead-letter-queue';
import { ConsumerManager, InMemoryConsumerStorage, createConsumerManager, getConsumerManager } from './consumers/consumer-manager';
import { 
  authenticateService, 
  authorizePublish, 
  authorizeSubscribe, 
  extractServiceIdentity,
  ServiceIdentity,
  getAuthorizationRules,
  getServiceRules,
} from './auth/authorization';
import { getMetrics, startTimer } from './metrics/metrics';
import { logger } from './utils/logger';

dotenv.config();

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 4000;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Trust proxy for services behind reverse proxies
app.set('trust proxy', 1);

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS configuration
const defaultOrigins = [
  'https://howweplan-user.vercel.app',
  'https://howweplan-agent.vercel.app',
  'https://howweplan-admin.vercel.app',
];
const allowedOrigins = isDevelopment
  ? true
  : (process.env.CORS_ALLOWED_ORIGINS?.split(',') || defaultOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 10000 : 1000,
  message: { error: 'Too many requests', message: 'Rate limit exceeded' },
});
app.use(limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health' && req.path !== '/metrics') {
      logger.debug('Request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
      });
    }
  });
  next();
});

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================

// Event Store
const eventStorage = new InMemoryEventStore();
const eventStore = createEventStore(eventStorage);

// Schema Registry
const schemaRegistry = getSchemaRegistry();

// Dead Letter Queue
const dlqStorage = new InMemoryDLQStorage();
const dlq = createDeadLetterQueue(dlqStorage);

// Consumer Manager
const consumerStorage = new InMemoryConsumerStorage();
const consumerManager = createConsumerManager(consumerStorage, eventStore, dlq);

// Metrics
const metrics = getMetrics();

logger.info('Event Bus Service initialized', {
  port: PORT,
  environment: process.env.NODE_ENV || 'development',
});

// ============================================================================
// HEALTH CHECK (Unauthenticated)
// ============================================================================

// Root endpoint - redirect to health for Render health checks
app.get('/', (req: Request, res: Response) => {
  res.redirect('/health');
});

app.get('/health', async (req: Request, res: Response) => {
  const summary = metrics.getSummary();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime_seconds: summary.uptime_seconds,
    metrics: {
      events_published: summary.events_published,
      events_delivered: summary.events_delivered,
      events_in_dlq: summary.events_in_dlq,
      consumers_active: summary.consumers_active,
    },
  });
});

// ============================================================================
// METRICS ENDPOINT (Unauthenticated for Prometheus)
// ============================================================================

app.get('/metrics', (req: Request, res: Response) => {
  const accept = req.headers.accept || '';
  
  if (accept.includes('application/json')) {
    res.json(metrics.getJsonMetrics());
  } else {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics.getPrometheusMetrics());
  }
});

// ============================================================================
// PUBLISH EVENTS
// ============================================================================

/**
 * POST /publish - Publish a single event
 * 
 * Body:
 * - event_type: string (required) - e.g., "requests.REQUEST_CREATED"
 * - event_version: number (optional, default 1)
 * - correlation_id: string (optional, generated if missing)
 * - aggregate_id: string (optional) - for ordering
 * - payload: object (required) - event-specific data
 */
app.post('/publish', authenticateService, authorizePublish, async (req: Request, res: Response) => {
  const timer = startTimer();
  const identity: ServiceIdentity = (req as any).serviceIdentity;
  
  try {
    const {
      event_type,
      event_version = 1,
      correlation_id,
      aggregate_id,
      payload,
    } = req.body;

    // Validate required fields
    if (!event_type || !payload) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'event_type and payload are required',
      });
    }

    // Schema validation
    const validationResult = schemaRegistry.validate({
      event_type,
      event_version,
      payload,
    });
    metrics.recordSchemaValidation(event_type, validationResult.valid);
    
    if (!validationResult.valid) {
      logger.warn('Schema validation failed', {
        event_type,
        errors: validationResult.errors,
      });
      
      return res.status(400).json({
        error: 'Schema Validation Failed',
        message: 'Event payload does not match schema',
        errors: validationResult.errors,
      });
    }

    // Append to event store
    const envelope = await eventStore.append({
      event_type,
      event_version,
      correlation_id,
      aggregate_id,
      producer: identity.service_name,
      payload,
    });

    // Record metrics
    metrics.recordEventPublished(event_type, identity.service_name);
    metrics.recordPublishDuration(event_type, timer());

    // Deliver to webhook subscribers (async)
    consumerManager.deliverToWebhooks(envelope).catch(err => {
      logger.error('Webhook delivery error', { error: err.message });
    });

    logger.info('Event published', {
      event_id: envelope.event_id,
      event_type,
      producer: identity.service_name,
      correlation_id: envelope.correlation_id,
    });

    res.status(201).json({
      success: true,
      event_id: envelope.event_id,
      correlation_id: envelope.correlation_id,
      occurred_at: envelope.occurred_at,
    });
  } catch (error: any) {
    logger.error('Error publishing event', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'Failed to publish event',
    });
  }
});

/**
 * POST /publish/batch - Publish multiple events
 */
app.post('/publish/batch', authenticateService, async (req: Request, res: Response) => {
  const identity: ServiceIdentity = (req as any).serviceIdentity;
  
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'events array is required',
      });
    }

    if (events.length > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum 100 events per batch',
      });
    }

    const results: Array<{
      event_id?: string;
      event_type: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const evt of events) {
      const timer = startTimer();
      
      try {
        const {
          event_type,
          event_version = 1,
          correlation_id,
          aggregate_id,
          payload,
        } = evt;

        // Schema validation
        const validationResult = schemaRegistry.validate({
          event_type,
          event_version,
          payload,
        });
        metrics.recordSchemaValidation(event_type, validationResult.valid);
        
        if (!validationResult.valid) {
          results.push({
            event_type,
            success: false,
            error: 'Schema validation failed',
          });
          continue;
        }

        // Append to event store
        const envelope = await eventStore.append({
          event_type,
          event_version,
          correlation_id,
          aggregate_id,
          producer: identity.service_name,
          payload,
        });

        // Record metrics
        metrics.recordEventPublished(event_type, identity.service_name);
        metrics.recordPublishDuration(event_type, timer());

        // Deliver to webhooks (async)
        consumerManager.deliverToWebhooks(envelope).catch(() => {});

        results.push({
          event_id: envelope.event_id,
          event_type,
          success: true,
        });
      } catch (error: any) {
        results.push({
          event_type: evt.event_type || 'unknown',
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    
    logger.info('Batch published', {
      producer: identity.service_name,
      total: events.length,
      successful,
      failed: events.length - successful,
    });

    res.status(201).json({
      success: true,
      processed: events.length,
      successful,
      failed: events.length - successful,
      results,
    });
  } catch (error: any) {
    logger.error('Error publishing batch', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'Failed to publish batch',
    });
  }
});

// ============================================================================
// CONSUMER MANAGEMENT
// ============================================================================

/**
 * POST /consumers - Register a new consumer
 */
app.post('/consumers', authenticateService, async (req: Request, res: Response) => {
  const identity: ServiceIdentity = (req as any).serviceIdentity;
  
  try {
    const { webhook_url } = req.body;
    
    const consumer = await consumerManager.registerConsumer(
      identity.service_name,
      webhook_url
    );
    
    metrics.setActiveConsumers((await consumerManager.listConsumers()).length);
    
    res.status(201).json({
      success: true,
      consumer_id: consumer.consumer_id,
      service_name: consumer.service_name,
    });
  } catch (error: any) {
    logger.error('Error registering consumer', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /subscribe - Subscribe to event types
 */
app.post('/subscribe', authenticateService, authorizeSubscribe, async (req: Request, res: Response) => {
  try {
    const { consumer_id, event_types, from_offset } = req.body;

    if (!consumer_id || !event_types || !Array.isArray(event_types)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'consumer_id and event_types array are required',
      });
    }

    const subscription = await consumerManager.subscribe(
      consumer_id,
      event_types,
      from_offset
    );

    res.status(201).json({
      success: true,
      subscription_id: subscription.subscription_id,
      event_types: subscription.event_types,
    });
  } catch (error: any) {
    logger.error('Error subscribing', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// PULL-BASED CONSUMPTION
// ============================================================================

/**
 * POST /consume - Pull events for processing
 */
app.post('/consume', authenticateService, async (req: Request, res: Response) => {
  try {
    const { consumer_id, event_types, batch_size, from_offset } = req.body;

    if (!consumer_id || !event_types) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'consumer_id and event_types are required',
      });
    }

    const events = await consumerManager.pullEvents(
      consumer_id,
      event_types,
      { batchSize: batch_size, fromOffset: from_offset }
    );

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error: any) {
    logger.error('Error consuming events', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /ack - Acknowledge successful processing
 */
app.post('/ack', authenticateService, async (req: Request, res: Response) => {
  try {
    const { consumer_id, event_id, event_type } = req.body;

    if (!consumer_id || !event_id || !event_type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'consumer_id, event_id, and event_type are required',
      });
    }

    await consumerManager.acknowledge(consumer_id, event_id, event_type);
    
    const identity: ServiceIdentity = (req as any).serviceIdentity;
    metrics.recordEventDelivered(event_type, identity.service_name);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error acknowledging event', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /nack - Negative acknowledgement (processing failed)
 */
app.post('/nack', authenticateService, async (req: Request, res: Response) => {
  try {
    const { consumer_id, event_id, error: errorMessage } = req.body;

    if (!consumer_id || !event_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'consumer_id and event_id are required',
      });
    }

    await consumerManager.negativeAck(consumer_id, event_id, errorMessage || 'Unknown error');
    
    const identity: ServiceIdentity = (req as any).serviceIdentity;
    metrics.recordEventFailed('unknown', identity.service_name, 'nack');

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error processing nack', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// EVENT QUERIES
// ============================================================================

/**
 * GET /events - Query events
 */
app.get('/events', authenticateService, async (req: Request, res: Response) => {
  try {
    const {
      domain,
      event_type,
      correlation_id,
      aggregate_id,
      after,
      limit = '50',
    } = req.query;

    // If querying by correlation_id, use trace
    if (correlation_id) {
      const events = await eventStore.getEventTrace(correlation_id as string);
      return res.json({
        success: true,
        count: events.length,
        events,
      });
    }

    const events = await eventStore.getEvents({
      domain: domain as EventDomain,
      afterEventId: after as string,
      limit: parseInt(limit as string, 10),
    });

    // Filter by event_type if specified
    const filtered = event_type
      ? events.filter(e => e.event_type === event_type)
      : events;

    res.json({
      success: true,
      count: filtered.length,
      events: filtered,
    });
  } catch (error: any) {
    logger.error('Error querying events', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /events/:eventId - Get specific event
 */
app.get('/events/:eventId', authenticateService, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Search across all domains
    for (const domain of Object.values(EventDomain)) {
      const events = await eventStore.getEvents({ domain: domain as EventDomain });
      const event = events.find(e => e.event_id === eventId);
      if (event) {
        return res.json({ success: true, event });
      }
    }

    res.status(404).json({
      error: 'Not Found',
      message: `Event ${eventId} not found`,
    });
  } catch (error: any) {
    logger.error('Error getting event', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /events/trace/:correlationId - Get event trace
 */
app.get('/events/trace/:correlationId', authenticateService, async (req: Request, res: Response) => {
  try {
    const { correlationId } = req.params;
    const events = await eventStore.getEventTrace(correlationId);

    res.json({
      success: true,
      correlation_id: correlationId,
      count: events.length,
      events,
    });
  } catch (error: any) {
    logger.error('Error getting trace', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /events/replay/:aggregateId - Replay aggregate events
 */
app.get('/events/replay/:aggregateId', authenticateService, async (req: Request, res: Response) => {
  try {
    const { aggregateId } = req.params;
    const events = await eventStore.replayAggregate(aggregateId);

    res.json({
      success: true,
      aggregate_id: aggregateId,
      count: events.length,
      events,
    });
  } catch (error: any) {
    logger.error('Error replaying aggregate', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

/**
 * GET /dlq - List DLQ entries
 */
app.get('/dlq', authenticateService, async (req: Request, res: Response) => {
  try {
    const { status, consumer_id, limit, offset } = req.query;

    const entries = await dlq.list({
      status: status as any,
      consumerId: consumer_id as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    const pendingCount = await dlq.getPendingCount();
    metrics.setDlqSize('pending', pendingCount);

    res.json({
      success: true,
      count: entries.length,
      pending_total: pendingCount,
      entries,
    });
  } catch (error: any) {
    logger.error('Error listing DLQ', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /dlq/:dlqId - Get specific DLQ entry
 */
app.get('/dlq/:dlqId', authenticateService, async (req: Request, res: Response) => {
  try {
    const { dlqId } = req.params;
    const entry = await dlq.get(dlqId);

    if (!entry) {
      return res.status(404).json({
        error: 'Not Found',
        message: `DLQ entry ${dlqId} not found`,
      });
    }

    res.json({ success: true, entry });
  } catch (error: any) {
    logger.error('Error getting DLQ entry', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /dlq/:dlqId/retry - Manually retry a DLQ entry
 */
app.post('/dlq/:dlqId/retry', authenticateService, async (req: Request, res: Response) => {
  try {
    const { dlqId } = req.params;

    const success = await dlq.manualRetry(dlqId, async (event, consumerId) => {
      await consumerManager.deliverToWebhooks(event);
    });

    if (success) {
      metrics.recordEventRetried('unknown', 'manual');
    }

    res.json({
      success,
      message: success ? 'Retry successful' : 'Retry failed',
    });
  } catch (error: any) {
    logger.error('Error retrying DLQ entry', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /dlq/:dlqId/discard - Discard a poison message
 */
app.post('/dlq/:dlqId/discard', authenticateService, async (req: Request, res: Response) => {
  try {
    const { dlqId } = req.params;
    const { reason } = req.body;

    await dlq.discard(dlqId, reason || 'Manual discard');

    res.json({
      success: true,
      message: 'Entry discarded',
    });
  } catch (error: any) {
    logger.error('Error discarding DLQ entry', { error: error.message });
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /admin/rules - Get authorization rules
 */
app.get('/admin/rules', authenticateService, (req: Request, res: Response) => {
  res.json(getAuthorizationRules());
});

/**
 * GET /admin/rules/:service - Get rules for specific service
 */
app.get('/admin/rules/:service', authenticateService, (req: Request, res: Response) => {
  const { service } = req.params;
  res.json(getServiceRules(service));
});

/**
 * GET /admin/schemas - List available schemas
 */
app.get('/admin/schemas', authenticateService, (req: Request, res: Response) => {
  res.json({
    event_types: schemaRegistry.listEventTypes(),
    domains: Object.values(EventDomain),
  });
});

/**
 * GET /admin/consumers - List consumers
 */
app.get('/admin/consumers', authenticateService, async (req: Request, res: Response) => {
  try {
    const consumers = await consumerManager.listConsumers();
    res.json({
      success: true,
      count: consumers.length,
      consumers,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// LEGACY COMPATIBILITY (for existing services)
// ============================================================================

/**
 * Legacy /stats endpoint
 */
app.get('/stats', authenticateService, async (req: Request, res: Response) => {
  const summary = metrics.getSummary();
  res.json({
    uptime: summary.uptime_seconds,
    timestamp: new Date().toISOString(),
    subscriberCount: summary.consumers_active,
    eventHistorySize: summary.events_published,
    ...summary,
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'An error occurred',
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function shutdown(): void {
  logger.info('Shutting down Event Bus Service...');
  
  dlq.shutdown();
  consumerManager.shutdown();
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  logger.info(`🚀 Event Bus Service v2.0.0 running on port ${PORT}`);
  logger.info(`✅ Health check: http://localhost:${PORT}/health`);
  logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
  logger.info(`📡 Ready to receive events`);
  
  // Log available event types
  const eventTypes = schemaRegistry.listEventTypes();
  logger.info(`📋 Registered ${eventTypes.length} event types across ${Object.keys(EventDomain).length} domains`);
});

export default app;
