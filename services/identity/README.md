# Identity & Access Service

Production-grade identity management service for the HowWePlan travel orchestration platform.

## Responsibilities

- **Authentication**: JWT-based authentication with access and refresh tokens
- **Authorization**: Role-Based Access Control (RBAC) with granular permissions
- **Account Management**: User registration, status management, account lifecycle
- **Agent Verification**: Verification workflow for travel agents
- **Audit Events**: All state changes emit audit events to the event bus

## Architecture

This service follows the platform's modular monolith architecture:

- **No cross-module imports**: Communicates only via shared contracts and event bus
- **Event-driven**: All state changes emit audit events
- **Strong typing**: Full TypeScript with strict mode
- **Input validation**: All inputs validated with Zod schemas

## Roles

| Role | Description |
|------|-------------|
| `USER` | End consumer who books travel |
| `AGENT` | Travel professional who creates itineraries |
| `ADMIN` | Platform operator with elevated privileges |

## Account Status

| Status | Description |
|--------|-------------|
| `PENDING_VERIFICATION` | Awaiting email verification |
| `ACTIVE` | Full access granted |
| `SUSPENDED` | Read-only access (per business rules) |
| `DEACTIVATED` | Account closed |

## Agent Verification Status

| Status | Description |
|--------|-------------|
| `NOT_SUBMITTED` | No verification documents submitted |
| `PENDING_REVIEW` | Documents submitted, awaiting admin review |
| `VERIFIED` | Identity and credentials confirmed |
| `REJECTED` | Verification failed, can resubmit |
| `REVOKED` | Previously verified, now revoked |

## API Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout and revoke tokens |
| POST | `/api/v1/auth/change-password` | Change password |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get current user profile |
| PATCH | `/api/v1/users/me` | Update current user profile |
| GET | `/api/v1/users/:userId` | Get user by ID (self or admin) |

### Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/agents/me/profile` | Get agent profile |
| PATCH | `/api/v1/agents/me/profile` | Update agent profile |
| POST | `/api/v1/agents/me/verification` | Submit verification documents |
| GET | `/api/v1/agents/:agentId/public` | Get public agent identity |
| GET | `/api/v1/agents/:agentId/full` | Get full agent identity |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/users` | List users with filtering |
| GET | `/api/v1/admin/users/:userId` | Get user details |
| PATCH | `/api/v1/admin/users/:userId/status` | Update account status |
| GET | `/api/v1/admin/verifications/pending` | List pending verifications |
| POST | `/api/v1/admin/users/:userId/verification/approve` | Approve verification |
| POST | `/api/v1/admin/users/:userId/verification/reject` | Reject verification |
| POST | `/api/v1/admin/users/:userId/verification/revoke` | Revoke verification |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Basic health check |
| GET | `/api/v1/health/ready` | Readiness check with DB |
| GET | `/api/v1/health/live` | Liveness check |

## Environment Variables

See `.env.example` for all configuration options.

### Variable Reference

| Variable | Category | Description | Required |
|----------|----------|-------------|----------|
| `SERVICE_NAME` | App Metadata | Service identifier | No (default: identity) |
| `NODE_ENV` | App Metadata | Runtime environment | No (default: development) |
| `PORT` | App Metadata | HTTP port | No (default: 3001) |
| `CORS_ALLOWED_ORIGINS` | API Connectivity | Allowed CORS origins | No |
| `JWT_SECRET` | Authentication | JWT signing secret (min 32 chars) | **Yes** |
| `JWT_ACCESS_TOKEN_EXPIRY` | Authentication | Access token TTL | No (default: 15m) |
| `JWT_REFRESH_TOKEN_EXPIRY` | Authentication | Refresh token TTL | No (default: 7d) |
| `JWT_ISSUER` | Authentication | Token issuer claim | No |
| `JWT_AUDIENCE` | Authentication | Token audience claim | No |
| `SUPABASE_URL` | Database | Supabase project URL | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Database | Supabase service role key | **Yes** |
| `ENABLE_REQUEST_LOGGING` | Feature Toggles | Enable request logging | No (default: false) |
| `ENABLE_AGENT_VERIFICATION` | Feature Toggles | Enable verification workflow | No (default: true) |
| `RATE_LIMIT_MAX_REQUESTS` | Operational Limits | Max requests per window | No (default: 100) |
| `RATE_LIMIT_WINDOW_MS` | Operational Limits | Rate limit window in ms | No (default: 60000) |
| `MAX_LOGIN_ATTEMPTS` | Operational Limits | Failed login limit | No (default: 5) |
| `ACCOUNT_LOCKOUT_DURATION_SECONDS` | Operational Limits | Lockout duration | No (default: 900) |
| `EVENT_BUS_URL` | Audit/Observability | Event bus endpoint | **Yes** |
| `EVENT_BUS_API_KEY` | Audit/Observability | Event bus API key | **Yes** |
| `LOG_LEVEL` | Audit/Observability | Logging verbosity | No (default: info) |

## Business Rules Enforcement

### Suspended Accounts (Read-Only)

```typescript
// Middleware automatically blocks write operations for suspended accounts
app.use(blockSuspended);
```

### Admin Action Audit

```typescript
// All admin actions require a reason and emit audit events
const adminContext: AdminActionContext = {
  adminId: req.identity.sub,
  reason: 'User requested account suspension',
  referenceId: 'TICKET-123', // Optional
};
```

### Agent Identity Visibility

- **Pre-confirmation**: First name + photo only (`PublicAgentIdentity`)
- **Post-confirmation, pre-payment**: Full identity revealed (`FullAgentIdentity`)
- **Post-payment**: Full contact details released

## Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start in development mode
npm run dev

# Run type checking
npm run typecheck

# Run tests
npm test
```

## Security Notes

- JWT secrets must be at least 32 characters
- Supabase service role key is backend-only (never expose to frontend)
- Password hashing uses scrypt with secure parameters
- Rate limiting is applied globally and stricter on auth endpoints
- All inputs are validated before processing
