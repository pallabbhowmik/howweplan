# Event Bus Service

Centralized event bus HTTP service for TripComposer microservices.

## Purpose

Provides HTTP API for publish/subscribe event messaging between microservices using the `@tripcomposer/event-bus` package.

## Endpoints

- `GET /health` - Health check
- `POST /publish` - Publish an event
- `POST /subscribe` - Subscribe to events (webhook callback)
- `POST /unsubscribe` - Unsubscribe from events
- `GET /stats` - Get statistics

## Authentication

All endpoints (except `/health`) require Bearer token:
```
Authorization: Bearer <EVENT_BUS_API_KEY>
```

## Usage Example

### Publish Event
```bash
curl -X POST https://howweplan-eventbus.onrender.com/publish \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "booking.created",
    "payload": { "bookingId": "123", "userId": "456" },
    "sourceService": "booking-service"
  }'
```

### Subscribe to Events
```bash
curl -X POST https://howweplan-eventbus.onrender.com/subscribe \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "booking.created",
    "subscriberId": "audit-service",
    "callbackUrl": "https://howweplan-audit.onrender.com/events/callback"
  }'
```

## Deployment to Render

1. Create new Web Service
2. Root directory: `services/event-bus-service`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variables from `.env.example`

## Environment Variables

- `EVENT_BUS_API_KEY` - Shared secret for authentication
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed origins
- `PORT` - Port to run on (default: 4000)
