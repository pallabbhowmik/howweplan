# Messaging Service

Platform-only chat service for HowWePlan. Handles conversations between users and agents with contact masking, message retention for disputes, and evidence export.

> Note: Internal channel/exchange identifiers may still use `tripcomposer` for compatibility.

## Responsibilities

- Platform-only chat between users and agents
- Mask contact details pre-payment (emails, phones, URLs, social handles)
- Release full contact details post-payment
- Message retention for dispute resolution
- Evidence export for admin arbitration
- Real-time WebSocket support (optional)

## Business Rules Enforced

| Rule | Implementation |
|------|----------------|
| No direct contact pre-payment | `ContentMaskingService` detects and masks emails, phones, URLs, social handles |
| Platform chat mandatory before payment | Conversations are the only communication channel |
| Full contact released ONLY after payment | `contactsRevealed` flag controlled by booking state |
| Agents semi-blind pre-confirmation | Participant visibility rules in `getParticipants` |
| All messages auditable | Every operation emits audit events |
| Admin actions require reason | `adminUpdateConversation`, `adminDeleteMessage` validate reason |
| Message retention for disputes | 730-day retention period, encrypted evidence export |

## Architecture

```
src/
├── api/
│   ├── routes/          # Express route handlers
│   ├── schemas.ts       # Zod validation schemas
│   └── errors.ts        # Standardized error responses
├── events/
│   ├── contracts.ts     # Event type definitions
│   └── bus.ts           # Event bus client
├── middleware/
│   └── auth.ts          # JWT authentication
├── services/
│   ├── audit.service.ts       # Audit logging
│   ├── attachment.service.ts  # File attachments
│   ├── conversation.service.ts # Conversation management
│   ├── evidence.service.ts    # Dispute evidence export
│   ├── masking.service.ts     # Contact info masking
│   ├── message.service.ts     # Message operations
│   └── ratelimit.service.ts   # Rate limiting
├── types/
│   └── index.ts         # TypeScript type definitions
├── env.ts               # Environment validation
└── index.ts             # Application entry point
```

## Environment Variables

### App Metadata

| Variable | Purpose | Default |
|----------|---------|---------|
| `SERVICE_NAME` | Service identifier for logging and tracing | `messaging-service` |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP server port | `3006` |
| `LOG_LEVEL` | Logging verbosity | `info` |

### Database

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |

### Event Bus

| Variable | Purpose | Default |
|----------|---------|---------|
| `EVENT_BUS_TYPE` | Message broker type (redis/rabbitmq/kafka) | `redis` |
| `EVENT_BUS_URL` | Event bus connection URL | Required |
| `EVENT_BUS_PREFIX` | Channel prefix for events | `tripcomposer:messaging` |

### Authentication

| Variable | Purpose | Default |
|----------|---------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_ISSUER` | Expected JWT issuer | `tripcomposer` |

### Internal Services

| Variable | Purpose | Default |
|----------|---------|---------|
| `BOOKING_SERVICE_URL` | Booking service URL | Required |
| `IDENTITY_SERVICE_URL` | Identity service URL | Required |
| `INTERNAL_API_KEY` | Service-to-service auth key | Required |

### Message Retention

| Variable | Purpose | Default |
|----------|---------|---------|
| `MESSAGE_RETENTION_DAYS` | Days to retain messages | `730` (2 years) |
| `EVIDENCE_ENCRYPTION_KEY` | AES-256 key for evidence encryption | Required (32 chars) |

### Contact Masking

| Variable | Purpose | Default |
|----------|---------|---------|
| `MASK_EMAIL_PATTERN` | Mask email addresses | `true` |
| `MASK_PHONE_PATTERN` | Mask phone numbers | `true` |
| `MASK_URL_PATTERN` | Mask URLs/links | `true` |
| `MASK_SOCIAL_HANDLES` | Mask @handles | `true` |

### Rate Limiting

| Variable | Purpose | Default |
|----------|---------|---------|
| `RATE_LIMIT_MESSAGES_PER_MINUTE` | Max messages per minute per user | `30` |
| `RATE_LIMIT_CONVERSATIONS_PER_HOUR` | Max new conversations per hour | `10` |
| `RATE_LIMIT_COOLDOWN_SECONDS` | Cooldown after rate limit hit | `60` |

### Operational Limits

| Variable | Purpose | Default |
|----------|---------|---------|
| `MAX_MESSAGE_LENGTH` | Max message characters | `5000` |
| `MAX_ATTACHMENTS_PER_MESSAGE` | Max attachments per message | `5` |
| `MAX_ATTACHMENT_SIZE_BYTES` | Max attachment size | `5242880` (5MB) |
| `ALLOWED_ATTACHMENT_TYPES` | Allowed MIME types | `image/jpeg,image/png,image/webp,application/pdf` |

### Storage

| Variable | Purpose | Default |
|----------|---------|---------|
| `STORAGE_ENDPOINT` | S3-compatible endpoint | Required |
| `STORAGE_BUCKET` | Bucket for attachments | Required |
| `STORAGE_ACCESS_KEY` | Storage access key | Required |
| `STORAGE_SECRET_KEY` | Storage secret key | Required |
| `STORAGE_REGION` | Storage region | `us-east-1` |

### Audit & Observability

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUDIT_LOG_ENABLED` | Enable audit logging | `true` |
| `OTEL_ENABLED` | Enable OpenTelemetry | `false` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint | Optional |
| `LOG_FORMAT` | Log format (json/pretty) | `json` in prod |

### Feature Toggles

| Variable | Purpose | Default |
|----------|---------|---------|
| `WEBSOCKET_ENABLED` | Enable real-time WebSocket | `true` |
| `WEBSOCKET_PORT` | WebSocket server port | `3016` |
| `TYPING_INDICATORS_ENABLED` | Enable typing indicators | `true` |
| `READ_RECEIPTS_ENABLED` | Enable read receipts | `true` |
| `REACTIONS_ENABLED` | Enable message reactions | `false` |

## API Endpoints

### Conversations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/conversations` | Create a new conversation |
| `GET` | `/api/v1/conversations` | List conversations |
| `GET` | `/api/v1/conversations/:id` | Get conversation details |
| `PATCH` | `/api/v1/conversations/:id/state` | Update conversation state |
| `GET` | `/api/v1/conversations/:id/participants` | Get participants |
| `PATCH` | `/api/v1/conversations/:id/admin` | Admin update (requires reason) |

### Messages

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/messages` | Send a message |
| `GET` | `/api/v1/messages` | Get messages in conversation |
| `GET` | `/api/v1/messages/:id` | Get message details |
| `PATCH` | `/api/v1/messages/:id` | Edit message (sender only) |
| `DELETE` | `/api/v1/messages/:id` | Delete message (soft delete) |
| `POST` | `/api/v1/messages/read` | Mark messages as read |
| `POST` | `/api/v1/messages/:id/reactions` | Add reaction |
| `DELETE` | `/api/v1/messages/:id/reactions/:emoji` | Remove reaction |
| `DELETE` | `/api/v1/messages/:id/admin` | Admin delete (requires reason) |

### Attachments

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/attachments/presigned-url` | Get upload URL |
| `POST` | `/api/v1/attachments/:id/confirm` | Confirm upload |
| `GET` | `/api/v1/attachments/:id` | Get attachment metadata |
| `GET` | `/api/v1/attachments/:id/download` | Get download URL |

### Evidence

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/evidence/export` | Create evidence export |
| `GET` | `/api/v1/evidence/export/:id` | Get export details |
| `GET` | `/api/v1/evidence/export/:id/download` | Download evidence |
| `GET` | `/api/v1/evidence/conversation/:id` | List exports for conversation |
| `POST` | `/api/v1/evidence/admin/export` | Admin export (unmasked content) |

### Internal Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/internal/webhooks/booking-state` | Handle booking state change |
| `POST` | `/internal/webhooks/reveal-contacts` | Reveal contacts in conversation |
| `POST` | `/internal/webhooks/dispute-created` | Handle dispute creation |
| `POST` | `/internal/webhooks/dispute-resolved` | Handle dispute resolution |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Basic health check |
| `GET` | `/health/ready` | Readiness probe |
| `GET` | `/health/live` | Liveness probe |

## Events

### Emitted Events

| Event | Description |
|-------|-------------|
| `messaging.conversation.created` | New conversation created |
| `messaging.conversation.state_changed` | Conversation state updated |
| `messaging.message.sent` | Message sent |
| `messaging.message.edited` | Message edited |
| `messaging.message.deleted` | Message deleted |
| `messaging.contacts.revealed` | Contacts revealed after payment |
| `messaging.content.masked` | Content was masked |
| `messaging.participant.joined` | Participant joined conversation |
| `messaging.participant.left` | Participant left conversation |
| `messaging.conversation.disputed` | Conversation marked disputed |
| `messaging.evidence.exported` | Evidence exported |
| `messaging.conversation.archived` | Conversation archived |
| `messaging.admin.action` | Admin action performed |

### Consumed Events

| Event | Description |
|-------|-------------|
| `booking.state.changed` | Booking state changed (triggers contact reveal) |
| `identity.user.verified` | User identity verified |
| `dispute.created` | Dispute created for booking |
| `dispute.resolved` | Dispute resolved |

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is backend-only, never expose to clients
- `EVIDENCE_ENCRYPTION_KEY` must be exactly 32 characters for AES-256
- `INTERNAL_API_KEY` should be a secure random value in production
- All secrets must be rotated regularly
- Evidence exports are encrypted at rest
- Original (unmasked) content is stored encrypted for dispute resolution only
