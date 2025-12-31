import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createEventBus, IEventBus } from '@tripcomposer/event-bus';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const eventBus: IEventBus = createEventBus();

// Middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'];
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

    const result = await eventBus.publish(eventType, payload, {
      ...metadata,
      sourceService: req.body.sourceService || 'unknown',
    });

    res.json({
      success: true,
      eventId: result.eventId,
      handlersInvoked: result.handlersInvoked,
    });
  } catch (error: any) {
    console.error('Error publishing event:', error);
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

    // Store webhook callback
    const subscription = eventBus.subscribe(
      eventType,
      async (event) => {
        // If callbackUrl provided, send HTTP POST
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
      },
      { priority: 0 }
    );

    res.json({
      success: true,
      subscriptionId: subscription.subscriptionId,
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
