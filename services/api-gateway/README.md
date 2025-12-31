# API Gateway

Centralized routing service for TripComposer microservices.

## Purpose

Routes frontend requests to appropriate backend microservices with:
- CORS handling
- Rate limiting
- Request logging
- Error handling
- Health checks

## Routes

- `GET /health` - Health check endpoint
- `/api/identity/*` - Identity service (auth, users)
- `/api/requests/*` - Travel requests service
- `/api/itineraries/*` - Itineraries service
- `/api/matching/*` - Agent matching service
- `/api/booking-payments/*` - Booking and payments service
- `/api/messaging/*` - Messaging service
- `/api/notifications/*` - Notifications service
- `/api/disputes/*` - Disputes service
- `/api/audit/*` - Audit service
- `/api/reviews/*` - Reviews service

## Environment Variables

See `.env.example` for required configuration.

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Deployment to Render

1. Create new Web Service on Render
2. Connect to GitHub repo
3. Set root directory: `services/api-gateway`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add all environment variables from `.env.example`
