# Audit Service

Immutable event storage service for the HowWePlan travel orchestration platform. This service is responsible for legal traceability, admin visibility, and compliance auditing.

## Responsibilities

- **Immutable Event Storage**: All domain events are stored in an append-only manner
- **Legal Traceability**: Every state change includes actor, reason, and before/after state
- **Admin Visibility**: Query APIs for investigating user/agent/booking activity
- **Compliance**: GDPR-aware event tagging and retention management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Event Bus (RabbitMQ)                      │
│                    (tripcomposer.events exchange)                │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Audit Service                            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Event Bus  │  │   REST API   │  │   Query Engine         │  │
│  │  Consumer   │  │  (Ingest)    │  │   (Admin Dashboard)    │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 Audit Repository (Append-Only)              ││
│  │                      - No Updates                           ││
│  │                      - No Deletes                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               PostgreSQL (Append-Only Audit Store)               │
│                   - Trigger-enforced immutability                │
│                   - Checksum verification                        │
│                   - Partitioned by month                         │
└─────────────────────────────────────────────────────────────────┘
```

## Constitution Compliance

| Rule | Implementation |
|------|----------------|
| Every state change emits audit event | Event bus consumer captures all domain events |
| No deletes | Database triggers prevent DELETE operations |
| No edits | Database triggers prevent UPDATE operations |
| Actor required | Schema validation enforces actor presence |
| Reason required | Schema validation enforces reason field |
| Before/after state required | StateChange schema captures mutations |
| Admin actions audit-logged | All admin API calls are logged with admin context |

## Environment Variables

| Variable | Purpose | Category | Required |
|----------|---------|----------|----------|
| `NODE_ENV` | Runtime environment (development/staging/production) | App Metadata | No (default: development) |
| `SERVICE_NAME` | Service identifier for logging | App Metadata | No (default: audit-service) |
| `SERVICE_VERSION` | Service version for tracing | App Metadata | No (default: 1.0.0) |
| `PORT` | HTTP server port | App Metadata | No (default: 3010) |
| `DATABASE_URL` | PostgreSQL connection string for audit store | Database | **Yes** |
| `DATABASE_POOL_MIN` | Minimum connection pool size | Database | No (default: 2) |
| `DATABASE_POOL_MAX` | Maximum connection pool size | Database | No (default: 10) |
| `DATABASE_SSL_ENABLED` | Enable SSL for database connections | Database | No (default: false) |
| `EVENT_BUS_URL` | RabbitMQ AMQP connection string | Event Bus | **Yes** |
| `EVENT_BUS_EXCHANGE` | Exchange name for domain events | Event Bus | No (default: tripcomposer.events) |
| `EVENT_BUS_QUEUE` | Queue name for audit service | Event Bus | No (default: audit.events) |
| `EVENT_BUS_PREFETCH_COUNT` | Message prefetch count | Event Bus | No (default: 10) |
| `SUPABASE_URL` | Supabase project URL | Authentication | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for admin verification | Authentication | **Yes** |
| `INTERNAL_SERVICE_SECRET` | Shared secret for service-to-service auth | Authentication | **Yes** (min 32 chars) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | API Connectivity | No (default: http://localhost:3000) |
| `MAX_PAGE_SIZE` | Maximum records per query page | Operational Limits | No (default: 100) |
| `DEFAULT_PAGE_SIZE` | Default records per query page | Operational Limits | No (default: 50) |
| `RETENTION_PERIOD_DAYS` | Event retention period (0 = infinite) | Operational Limits | No (default: 0) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | Operational Limits | No (default: 60000) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per rate limit window | Operational Limits | No (default: 100) |
| `LOG_LEVEL` | Logging verbosity (debug/info/warn/error) | Observability | No (default: info) |
| `LOG_FORMAT` | Log output format (json/pretty) | Observability | No (default: json) |
| `OTEL_ENABLED` | Enable OpenTelemetry tracing | Observability | No (default: false) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry exporter endpoint | Observability | Required if OTEL_ENABLED |
| `OTEL_SERVICE_NAME` | Service name for traces | Observability | No (default: audit-service) |

## API Endpoints

### Health Checks

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Liveness probe |
| `/ready` | GET | None | Readiness probe (checks DB) |
| `/metrics` | GET | Admin/Service | Service metrics |

### Query APIs (Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/audit/events` | GET | Query events with filters |
| `/api/v1/audit/events/:id` | GET | Get single event by ID |
| `/api/v1/audit/events/correlation/:correlationId` | GET | Get events by correlation |
| `/api/v1/audit/resources/:type/:id/history` | GET | Get resource audit history |
| `/api/v1/audit/actors/:id/activity` | GET | Get actor activity log |
| `/api/v1/audit/statistics` | GET | Get audit statistics |

### Ingest APIs (Internal Services Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/audit/ingest` | POST | Ingest single audit event |
| `/api/v1/audit/ingest/batch` | POST | Ingest batch of events |

## Query Parameters

### GET /api/v1/audit/events

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 50, max: 100) |
| `sortField` | string | Sort field (timestamp, sequenceNumber, eventType, severity) |
| `sortDirection` | string | Sort direction (asc, desc) |
| `eventTypes` | string | Comma-separated event types |
| `categories` | string | Comma-separated categories |
| `severities` | string | Comma-separated severities |
| `actorIds` | string | Comma-separated actor UUIDs |
| `resourceTypes` | string | Comma-separated resource types |
| `resourceIds` | string | Comma-separated resource IDs |
| `correlationId` | string | Correlation UUID |
| `dateFrom` | string | ISO 8601 datetime |
| `dateTo` | string | ISO 8601 datetime |
| `searchText` | string | Text search in reason/metadata |

## Audit Event Schema

```typescript
interface AuditEvent {
  id: string;                    // UUID
  correlationId: string;         // Links related events
  causationId?: string;          // Event that caused this
  eventType: string;             // e.g., "booking.created"
  eventVersion: string;          // Schema version
  category: EventCategory;       // booking, payment, user, etc.
  severity: Severity;            // debug, info, warning, error, critical
  timestamp: string;             // ISO 8601
  actor: {
    type: ActorType;             // user, agent, admin, system, service
    id: string;                  // UUID
    email?: string;
    displayName?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  resource: {
    type: string;                // e.g., "booking", "itinerary"
    id: string;
    parentType?: string;
    parentId?: string;
  };
  action: string;                // e.g., "create", "update", "view"
  reason: string;                // Why this action was taken (REQUIRED)
  stateChange?: {
    before: object | null;
    after: object | null;
    changedFields?: string[];
  };
  metadata?: object;
  source: {
    service: string;
    version?: string;
    environment?: string;
  };
  gdprRelevant: boolean;
  piiContained: boolean;
  retentionCategory: 'standard' | 'legal' | 'financial' | 'extended';
}
```

## Security

1. **Immutability**: Database triggers prevent UPDATE and DELETE operations
2. **Integrity**: SHA-256 checksums verify data integrity
3. **Authentication**: 
   - Admin queries require Supabase JWT with admin role
   - Service ingestion requires HMAC-signed service tokens
4. **Rate Limiting**: Configurable rate limits on all endpoints
5. **CORS**: Restricted to allowed origins only

## Database Schema

The audit events table enforces immutability at the database level:

```sql
-- Prevents all UPDATE operations
CREATE TRIGGER prevent_audit_update
    BEFORE UPDATE ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- Prevents all DELETE operations  
CREATE TRIGGER prevent_audit_delete
    BEFORE DELETE ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- Validates checksum on INSERT
CREATE TRIGGER validate_checksum_on_insert
    BEFORE INSERT ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION validate_audit_checksum();
```

## Development

```bash
# Install dependencies
npm install

# Set up database (requires psql)
npm run db:setup

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

## Production Checklist

- [ ] `DATABASE_SSL_ENABLED=true`
- [ ] `INTERNAL_SERVICE_SECRET` is cryptographically random (32+ chars)
- [ ] `LOG_FORMAT=json` for structured logging
- [ ] `NODE_ENV=production`
- [ ] Database user has only INSERT and SELECT permissions
- [ ] Rate limits are appropriate for expected load
- [ ] OpenTelemetry configured for distributed tracing
- [ ] Monitoring alerts set up for critical events
