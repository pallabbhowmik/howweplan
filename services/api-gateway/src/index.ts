import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://howweplan-user.vercel.app',
  'https://howweplan-agent.vercel.app',
  'https://howweplan-admin.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Service URLs from environment variables
const services = {
  identity: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001',
  requests: process.env.REQUESTS_SERVICE_URL || 'http://localhost:3002',
  itineraries: process.env.ITINERARIES_SERVICE_URL || 'http://localhost:3003',
  matching: process.env.MATCHING_SERVICE_URL || 'http://localhost:3004',
  'booking-payments': process.env.BOOKING_PAYMENTS_SERVICE_URL || 'http://localhost:3005',
  messaging: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3006',
  notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3007',
  disputes: process.env.DISPUTES_SERVICE_URL || 'http://localhost:3008',
  audit: process.env.AUDIT_SERVICE_URL || 'http://localhost:3009',
  reviews: process.env.REVIEWS_SERVICE_URL || 'http://localhost:3010',
};

// Proxy configuration for each service
Object.entries(services).forEach(([serviceName, serviceUrl]) => {
  app.use(
    `/api/${serviceName}`,
    createProxyMiddleware({
      target: serviceUrl,
      changeOrigin: true,
      pathRewrite: {
        [`^/api/${serviceName}`]: '', // Remove the service prefix
      },
      onProxyReq: (proxyReq, req) => {
        // Log the request
        console.log(`[${new Date().toISOString()}] ${req.method} /api/${serviceName}${req.url} -> ${serviceUrl}`);
      },
      onError: (err, req, res) => {
        console.error(`[${new Date().toISOString()}] Proxy error for ${serviceName}:`, err.message);
        if (res instanceof express.response.constructor) {
          res.status(502).json({
            error: 'Bad Gateway',
            message: `Service ${serviceName} is unavailable`,
            timestamp: new Date().toISOString(),
          });
        }
      },
    })
  );
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📋 Service routes:`);
  Object.entries(services).forEach(([name, url]) => {
    console.log(`   /api/${name} -> ${url}`);
  });
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});
