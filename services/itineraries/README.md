# Itineraries & Options Service

Production-grade service for managing travel itineraries with secure obfuscation and progressive disclosure.

## Responsibilities

- **Store Agent Submissions**: Accept itineraries via PDF, links, or free text
- **Obfuscate Pre-Payment**: Hide exact hotel names, vendors, and booking references
- **Progressive Disclosure**: Reveal full details only after payment confirmation
- **Version Control**: Maintain complete history of itinerary changes

## Architecture

```
src/
├── api/           # HTTP handlers and routes
├── events/        # Event bus publishers and subscribers
├── models/        # Domain models and schemas
├── obfuscation/   # Obfuscation engine and strategies
├── repository/    # Data access layer
├── services/      # Business logic
└── utils/         # Shared utilities
```

## Security Rules Enforced

| Rule | Implementation |
|------|----------------|
| No hotel names pre-payment | Obfuscation engine replaces with category descriptors |
| No vendor names pre-payment | Vendor identities masked until payment |
| No booking references pre-payment | References replaced with placeholder tokens |
| No payment logic | This service has NO payment code |
| Audit all changes | Every state change emits audit event |

## Environment Variables

### App Metadata

| Variable | Purpose | Default |
|----------|---------|---------|
| `NODE_ENV` | Runtime environment | `development` |
| `SERVICE_NAME` | Service identifier for logging/tracing | `itineraries-service` |
| `SERVICE_VERSION` | Semantic version for deployments | `1.0.0` |
| `PORT` | HTTP server port | `3003` |
| `LOG_LEVEL` | Logging verbosity (debug/info/warn/error) | `info` |

### API Connectivity

| Variable | Purpose | Default |
|----------|---------|---------|
| `API_BASE_URL` | Public URL for this service | `http://localhost:3003` |
| `INTERNAL_API_KEY` | Key for service-to-service auth | Required |

### Authentication

| Variable | Purpose | Default |
|----------|---------|---------|
| `JWT_SECRET` | Secret for JWT verification | Required |
| `JWT_ISSUER` | Expected JWT issuer claim | `tripcomposer-auth` |
| `JWT_AUDIENCE` | Expected JWT audience claim | `tripcomposer-services` |

### Database

| Variable | Purpose | Default |
|----------|---------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for backend access | Required |
| `DATABASE_URL` | Direct PostgreSQL connection string | Required |

### Event Bus

| Variable | Purpose | Default |
|----------|---------|---------|
| `EVENT_BUS_URL` | AMQP broker connection string | Required |
| `EVENT_BUS_EXCHANGE` | Exchange name for events | `tripcomposer.events` |
| `EVENT_BUS_QUEUE_PREFIX` | Queue prefix for this service | `itineraries` |

### Feature Toggles

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENABLE_VERSION_HISTORY` | Track all itinerary versions | `true` |
| `ENABLE_AUDIT_LOGGING` | Emit audit events | `true` |
| `ENABLE_METRICS` | Expose Prometheus metrics | `true` |

### Operational Limits

| Variable | Purpose | Default |
|----------|---------|---------|
| `MAX_ITINERARY_ITEMS` | Max items per itinerary | `50` |
| `MAX_SUBMISSION_SIZE_MB` | Max upload size in MB | `10` |
| `MAX_VERSIONS_PER_ITINERARY` | Max versions to retain | `100` |
| `OBFUSCATION_CACHE_TTL_SECONDS` | Cache duration for obfuscated views | `300` |

### Audit / Observability

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUDIT_LOG_ENABLED` | Enable audit event emission | `true` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector endpoint | Optional |
| `OTEL_SERVICE_NAME` | Service name in traces | `itineraries-service` |
| `METRICS_PORT` | Prometheus metrics port | `9093` |

## API Endpoints

### Submissions

- `POST /api/v1/submissions` - Create new itinerary submission
- `GET /api/v1/submissions/:id` - Get submission details

### Itineraries

- `GET /api/v1/itineraries/:id` - Get itinerary (obfuscated or revealed based on state)
- `GET /api/v1/itineraries/:id/versions` - Get version history
- `PUT /api/v1/itineraries/:id` - Update itinerary (agent only)

### Disclosure

- `GET /api/v1/itineraries/:id/obfuscated` - Force obfuscated view
- `GET /api/v1/itineraries/:id/revealed` - Get revealed view (requires payment)

## Events

### Published

- `itinerary.submitted` - New itinerary created
- `itinerary.updated` - Itinerary modified
- `itinerary.version.created` - New version saved
- `itinerary.disclosed` - Full details revealed

### Subscribed

- `booking.paid` - Trigger disclosure
- `booking.cancelled` - Revert to obfuscated state

## Running Locally

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test
```

## Security Notes

- This service does NOT handle payments
- No Stripe keys should ever be added here
- All secrets are validated at startup
- Obfuscation is enforced at the data layer, not API layer
