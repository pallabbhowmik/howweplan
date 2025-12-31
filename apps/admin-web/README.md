# HowWePlan Admin Web Application

Production-grade administrative dashboard for the HowWePlan travel orchestration platform.

## Overview

This application provides administrative tools for managing:
- **Agent Management**: Approve, suspend, and manage travel agents
- **Dispute Resolution**: Handle and resolve user disputes with audit trails
- **Refund Processing**: Process refunds following strict lifecycle state machines
- **Matching Overrides**: Manually assign agents to trip requests
- **Audit Viewer**: Complete audit trail of all platform actions

## Security Architecture

### Environment Variables

This is a **frontend application**. For security:

- ✅ Only `NEXT_PUBLIC_*` variables are permitted
- ✅ Public API URLs only
- ✅ Supabase anon key only (NOT service role)
- ❌ No database credentials
- ❌ No Stripe secret keys
- ❌ No private API keys

All sensitive operations are handled by backend services.

### Variable Reference

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| **App Metadata** ||||
| `NEXT_PUBLIC_APP_NAME` | Application display name | HowWePlan Admin | No |
| `NEXT_PUBLIC_APP_VERSION` | Semver version | 1.0.0 | No |
| `NEXT_PUBLIC_ENVIRONMENT` | Runtime environment | development | No |
| **API Connectivity** ||||
| `NEXT_PUBLIC_API_BASE_URL` | Backend API endpoint | - | Yes |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | Request timeout | 30000 | No |
| `NEXT_PUBLIC_WS_URL` | WebSocket endpoint | - | Yes |
| **Authentication** ||||
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | - | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | - | Yes |
| **Feature Toggles** ||||
| `NEXT_PUBLIC_FEATURE_BULK_ACTIONS` | Enable bulk operations | true | No |
| `NEXT_PUBLIC_FEATURE_ADVANCED_FILTERS` | Enable advanced filtering | true | No |
| `NEXT_PUBLIC_FEATURE_EXPORT_CSV` | Enable CSV exports | true | No |
| `NEXT_PUBLIC_FEATURE_REAL_TIME_AUDIT` | Enable real-time audit feed | true | No |
| **Operational Limits** ||||
| `NEXT_PUBLIC_DEFAULT_PAGE_SIZE` | Default pagination size | 25 | No |
| `NEXT_PUBLIC_MAX_PAGE_SIZE` | Maximum pagination size | 100 | No |
| `NEXT_PUBLIC_AUDIT_LOG_RETENTION_DAYS` | Audit log display retention | 90 | No |
| `NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES` | Admin session timeout | 30 | No |
| **Observability** ||||
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking | - | No |
| `NEXT_PUBLIC_ANALYTICS_ID` | Analytics identifier | - | No |

### Microservice Status (Real-time)

The Admin Dashboard includes a **Services** page (`/dashboard/services`) that polls microservice health checks in real time.

Configure the service base URLs in `.env.local` (health paths are derived automatically):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SERVICE_HEALTH_TIMEOUT_MS` | `2000` |
| `NEXT_PUBLIC_SERVICE_SUPABASE_REST_URL` | `http://localhost:54321` |
| `NEXT_PUBLIC_SERVICE_AUDIT_URL` | `http://localhost:3010` |
| `NEXT_PUBLIC_SERVICE_IDENTITY_URL` | `http://localhost:3011` |
| `NEXT_PUBLIC_SERVICE_REQUESTS_URL` | `http://localhost:3012` |
| `NEXT_PUBLIC_SERVICE_MATCHING_URL` | *(optional; matching is event-driven)* |
| `NEXT_PUBLIC_SERVICE_ITINERARIES_URL` | `http://localhost:3014` |
| `NEXT_PUBLIC_SERVICE_BOOKING_PAYMENTS_URL` | `http://localhost:3015` |
| `NEXT_PUBLIC_SERVICE_MESSAGING_URL` | `http://localhost:3016` |
| `NEXT_PUBLIC_SERVICE_DISPUTES_URL` | `http://localhost:3017` |
| `NEXT_PUBLIC_SERVICE_REVIEWS_URL` | `http://localhost:3018` |
| `NEXT_PUBLIC_SERVICE_NOTIFICATIONS_URL` | `http://localhost:3019` |

## Core Principles

### 1. All Actions Require Reason

Every administrative action **MUST** include a reason:

```typescript
// This is enforced at the type level
interface AdminActionBase {
  readonly adminId: string;
  readonly reason: string; // REQUIRED - minimum 10 characters
  readonly timestamp: string;
  readonly correlationId: string;
}
```

The `ReasonDialog` component enforces this requirement in the UI.

### 2. Everything is Audit-Logged

Every state change emits an audit event:

```typescript
await auditLogger.emit({
  category: 'agent_management',
  severity: 'warning',
  action: 'Suspended agent account',
  targetType: 'agent',
  targetId: agentId,
  reason: 'Received multiple complaints from users',
  correlationId: actionBase.correlationId,
  previousState: { status: 'approved' },
  newState: { status: 'suspended' },
});
```

### 3. Strict Lifecycle State Machines

Refunds follow a strict state machine:

```
pending_review → approved → processing → completed
                    ↓                        ↓
                rejected                   failed
                                             ↓
                                    processing (retry)
```

Invalid transitions are rejected at runtime.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/          # Protected admin routes
│   │   ├── agents/         # Agent management
│   │   ├── disputes/       # Dispute resolution
│   │   ├── refunds/        # Refund processing
│   │   ├── matching/       # Matching overrides
│   │   └── audit/          # Audit log viewer
│   └── login/              # Authentication
├── components/
│   ├── admin/              # Admin-specific components
│   │   ├── reason-dialog   # Enforces reason requirement
│   │   ├── status-badge    # Status display
│   │   └── audit-trail     # Audit history display
│   └── ui/                 # Base UI components
├── config/
│   └── env.ts              # Environment validation
├── lib/
│   ├── api/                # API client layer
│   ├── audit/              # Audit logging utilities
│   ├── auth/               # Authentication context
│   └── supabase/           # Supabase client
└── types/                  # TypeScript definitions
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project (or local instance)
- Backend API running

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your values
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3002
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Environment Validation

Environment variables are validated at **build time** using Zod:

```typescript
// src/config/env.ts
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url('API base URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .refine(
      (val) => !val.includes('service_role'),
      'SECURITY VIOLATION: Service role key detected'
    ),
  // ...
});
```

If validation fails, the build will fail with clear error messages.

## Admin Workflows

### Approving an Agent

1. Navigate to Agents → Pending
2. Review agent application
3. Click "Approve" or "Reject"
4. Enter required reason (min 10 characters)
5. Confirm action

The action is:
- Validated (reason length)
- Executed via API
- Audit-logged with full context
- UI updates automatically

### Resolving a Dispute

1. Navigate to Disputes
2. Select dispute to review
3. Review evidence from both parties
4. Add internal notes as needed
5. Click "Resolve Dispute"
6. Select resolution (user favor, agent favor, partial)
7. Optionally specify refund amount
8. Enter reason and confirm

### Processing a Refund

1. Navigate to Refunds → Pending
2. Review refund request
3. Verify booking and dispute context
4. Click "Approve" (optionally adjust amount) or "Reject"
5. Enter reason and confirm
6. Refund enters processing state automatically

## Technical Details

### State Management

- **Server State**: TanStack Query for API data
- **Auth State**: React Context with Supabase
- **UI State**: React useState for local state

### API Communication

All API calls go through the typed client:

```typescript
const result = await apiClient.post<Agent>(
  `/admin/agents/${agentId}/approve`,
  {
    reason,
    correlationId: actionBase.correlationId,
  }
);
```

### Error Handling

Errors are typed and handled consistently:

```typescript
try {
  await approveAgent(context, agentId, reason);
} catch (error) {
  if (error instanceof ApiClientError) {
    // Handle known API errors
  } else if (error instanceof NetworkError) {
    // Handle network issues
  }
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript checks |
| `npm test` | Run tests |

## License

Proprietary - HowWePlan Platform
