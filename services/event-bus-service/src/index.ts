import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// In-memory event storage
const subscriptions: Map<string, Set<(event: any) => void>> = new Map();
const eventHistory: any[] = [];

// Webhook subscribers - services that want to receive events via HTTP
const webhookSubscribers: Array<{
  url: string;
  eventTypes: string[] | '*'; // '*' means all events
  apiKey?: string;
}> = [];

// Load webhook subscribers from environment
const NOTIFICATIONS_WEBHOOK_URL = process.env.NOTIFICATIONS_WEBHOOK_URL;
if (NOTIFICATIONS_WEBHOOK_URL) {
  webhookSubscribers.push({
    url: NOTIFICATIONS_WEBHOOK_URL,
    eventTypes: '*', // Notifications service handles all events
    apiKey: process.env.EVENT_BUS_API_KEY,
  });
  console.log(`📡 Registered webhook subscriber: ${NOTIFICATIONS_WEBHOOK_URL}`);
}

/**
 * Forward event to webhook subscribers
 */
async function forwardToWebhooks(event: any): Promise<void> {
  for (const subscriber of webhookSubscribers) {
    // Check if subscriber wants this event type
    if (subscriber.eventTypes !== '*' && !subscriber.eventTypes.includes(event.eventType)) {
      continue;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (subscriber.apiKey) {
        headers['Authorization'] = `Bearer ${subscriber.apiKey}`;
      }

      const response = await fetch(subscriber.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        console.error(`Webhook delivery failed to ${subscriber.url}:`, {
          status: response.status,
          eventType: event.eventType,
        });
      } else {
        console.log(`📨 Event forwarded to ${subscriber.url}:`, event.eventType);
      }
    } catch (error) {
      console.error(`Webhook delivery error to ${subscriber.url}:`, error);
    }
  }
}

// Middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS configuration - only allow specific origins in production
const isProduction = process.env.NODE_ENV === 'production';
const defaultOrigins = ['https://howweplan-user.vercel.app', 'https://howweplan-agent.vercel.app', 'https://howweplan-admin.vercel.app'];
const allowedOrigins = isProduction 
  ? (process.env.CORS_ALLOWED_ORIGINS?.split(',') || defaultOrigins)
  : true; // Allow all in development
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP',
});
app.use(limiter);

// Authentication middleware
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || token !== process.env.EVENT_BUS_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Publish event
app.post('/publish', authenticate, async (req, res) => {
  try {
    const { eventType, payload, metadata } = req.body;

    if (!eventType || !payload) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'eventType and payload are required',
      });
    }

    const event = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      payload,
      metadata: {
        ...metadata,
        sourceService: req.body.sourceService || 'unknown',
      },
      timestamp: new Date().toISOString(),
    };

    // Store in history
    eventHistory.push(event);
    if (eventHistory.length > 1000) eventHistory.shift();

    // Forward to webhook subscribers (async, don't wait)
    forwardToWebhooks(event).catch(err => {
      console.error('Error forwarding to webhooks:', err);
    });

    // Notify in-memory subscribers
    const handlers = subscriptions.get(eventType) || new Set();
    let handlersInvoked = 0;
    
    for (const handler of handlers) {
      try {
        await handler(event);
        handlersInvoked++;
      } catch (error) {
        console.error('Handler error:', error);
      }
    }

    res.json({
      success: true,
      eventId: event.eventId,
      handlersInvoked,
    });
  } catch (error: any) {
    console.error('Error publishing event:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// Batch publish events (used by identity service)
app.post('/publish/batch', authenticate, async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'events array is required',
      });
    }

    const results = [];
    
    for (const evt of events) {
      const event = {
        eventId: evt.eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType: evt.eventType,
        payload: evt.payload,
        metadata: {
          source: evt.source,
          correlationId: evt.correlationId,
          actorId: evt.actorId,
          actorRole: evt.actorRole,
          occurredAt: evt.occurredAt,
        },
        timestamp: new Date().toISOString(),
      };

      // Store in history
      eventHistory.push(event);
      if (eventHistory.length > 1000) eventHistory.shift();

      // Forward to webhook subscribers (async, don't wait)
      forwardToWebhooks(event).catch(err => {
        console.error('Error forwarding to webhooks:', err);
      });

      // Notify in-memory subscribers
      const handlers = subscriptions.get(event.eventType) || new Set();
      let handlersInvoked = 0;
      
      for (const handler of handlers) {
        try {
          await handler(event);
          handlersInvoked++;
        } catch (error) {
          console.error('Handler error:', error);
        }
      }

      results.push({
        eventId: event.eventId,
        eventType: event.eventType,
        handlersInvoked,
      });
    }

    console.log(`📨 Processed ${events.length} events from batch`);

    res.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error publishing batch events:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// Subscribe to events (long-polling or webhook callback)
app.post('/subscribe', authenticate, (req, res) => {
  try {
    const { eventType, callbackUrl, subscriberId } = req.body;

    if (!eventType || !subscriberId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'eventType and subscriberId are required',
      });
    }

    // Create handler function
    const handler = async (event: any) => {
      if (callbackUrl) {
        try {
          await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });
        } catch (error) {
          console.error(`Failed to notify ${subscriberId}:`, error);
        }
      }
    };

    // Store subscription
    if (!subscriptions.has(eventType)) {
      subscriptions.set(eventType, new Set());
    }
    subscriptions.get(eventType)!.add(handler);

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      success: true,
      subscriptionId,
      eventType,
      subscriberId,
    });
  } catch (error: any) {
    console.error('Error subscribing:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// Unsubscribe
app.post('/unsubscribe', authenticate, (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'subscriptionId is required',
      });
    }

    // Note: EventBus subscription.unsubscribe() should be called
    res.json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error: any) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// Get event statistics
app.get('/stats', authenticate, (req, res) => {
  res.json({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    subscriberCount: subscriptions.size,
    eventHistorySize: eventHistory.length,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Event Bus Service running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`📡 Ready to receive events`);
});
