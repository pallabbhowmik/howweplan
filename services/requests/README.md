# Travel Request Service

The Travel Request Service manages the lifecycle of travel requests in the HowWePlan platform.

> Note: Internal exchange/channel identifiers may still use `tripcomposer` for compatibility.

## Responsibilities

- Accept travel requests from users
- Enforce daily request caps per user
- Enforce maximum open (non-terminal) requests per user
- Manage request state transitions
- Emit events for downstream services
- Audit log all state changes

## Architecture

This service follows a modular monolith architecture and does NOT contain:
- Agent logic (handled by Agent Service)
- Itinerary logic (handled by Itinerary Service)
- Matching logic (handled by Matching Service)

Communication with other services happens exclusively via:
- Shared contracts (types)
- Event bus (Redis pub/sub)

## Request States

```
draft → submitted → matching → matched → completed
                 ↘          ↘
                   expired    cancelled
```

| State | Description |
|-------|-------------|
| `draft` | Created but not submitted |
| `submitted` | Submitted for agent matching |
| `matching` | System actively finding agents |
| `matched` | Agent matched (set by Matching Service) |
| `expired` | No agent match within time limit |
| `cancelled` | User or admin cancelled |
| `completed` | Booking completed |

## API Endpoints

### User Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/requests` | Create a new travel request |
| `GET` | `/api/v1/requests` | List user's requests |
| `GET` | `/api/v1/requests/caps` | Get user's cap information |
| `GET` | `/api/v1/requests/:id` | Get a specific request |
| `POST` | `/api/v1/requests/:id/submit` | Submit a draft request |
| `POST` | `/api/v1/requests/:id/cancel` | Cancel a request |

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/requests` | List requests (requires userId param) |
| `GET` | `/api/v1/admin/requests/:id` | Get any request |
| `POST` | `/api/v1/admin/requests/:id/cancel` | Admin cancel with reason |
| `POST` | `/api/v1/admin/requests/:id/expire` | Admin expire with reason |
| `POST` | `/api/v1/admin/requests/:id/transition` | Admin state transition |

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `NODE_ENV` | Runtime environment | Yes |
| `SERVICE_NAME` | Service identifier for logs | No |
| `SERVICE_VERSION` | Service version | No |
| `PORT` | HTTP server port | No |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `EVENT_BUS_URL` | Redis connection string | Yes |
| `EVENT_BUS_CHANNEL_PREFIX` | Event channel prefix | No |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_ISSUER` | Expected JWT issuer | No |
| `JWT_AUDIENCE` | Expected JWT audience | No |
| `DAILY_REQUEST_CAP` | Max requests per user per day | No |
| `MAX_OPEN_REQUESTS` | Max non-terminal requests per user | No |
| `REQUEST_EXPIRY_HOURS` | Hours until request expires | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No |
| `LOG_LEVEL` | Logging level | No |
| `LOG_FORMAT` | Log format (json/pretty) | No |
| `AUDIT_ENABLED` | Enable audit logging | No |
| `METRICS_ENABLED` | Enable metrics | No |
| `METRICS_PORT` | Prometheus metrics port | No |

## Events Emitted

| Event | When |
|-------|------|
| `REQUEST_CREATED` | New request created |
| `REQUEST_STATE_CHANGED` | Any state transition |
| `REQUEST_SUBMITTED` | Draft submitted for matching |
| `REQUEST_CANCELLED` | Request cancelled |
| `REQUEST_EXPIRED` | Request expired |

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Database

Run the migration in `migrations/001_create_travel_requests.sql` to create the required tables.

## Security

- All endpoints require JWT authentication
- Admin endpoints require `role: 'admin'` in JWT
- All admin actions require a reason and are audit-logged
- Rate limiting is applied globally
- Input validation on all endpoints
