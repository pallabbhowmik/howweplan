# Agent Web App

Travel agent portal for managing trip requests, confirming availability, uploading itineraries, and tracking booking status.

## Security Model

This is a **frontend application** with strict security constraints:

- ✅ Only `NEXT_PUBLIC_*` variables permitted
- ✅ Public API URLs and auth keys only
- ❌ No database credentials
- ❌ No service role keys
- ❌ No payment processing keys (agents do not handle payments)
- ❌ No user contact information access (released only after payment)

## Features

| Feature | Description |
|---------|-------------|
| Request Inbox | View and manage incoming trip requests |
| Availability Confirmation | Confirm or decline requests within SLA |
| Plan Upload | Submit itineraries via PDF, links, or free text |
| Booking Status | Track booking lifecycle and status changes |
| Platform Chat | Communicate with users (mandatory before payment) |

## Environment Variables

### App Metadata

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | No | `HowWePlan Agent Portal` | Application display name |
| `NEXT_PUBLIC_APP_VERSION` | No | `1.0.0` | Application version (semver) |
| `NEXT_PUBLIC_APP_ENV` | No | `development` | Environment: `development`, `staging`, `production` |

### API Connectivity

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | - | Backend API gateway URL |
| `NEXT_PUBLIC_WS_URL` | **Yes** | - | WebSocket URL for real-time updates |

### Authentication (Supabase Public)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | - | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | - | Supabase anonymous/public key (NOT service role) |

### File Uploads

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_STORAGE_URL` | **Yes** | - | File storage URL for itinerary uploads |
| `NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES` | No | `10485760` | Max upload size (10MB default) |
| `NEXT_PUBLIC_ALLOWED_UPLOAD_TYPES` | No | `application/pdf,text/plain,text/markdown` | Allowed MIME types |

### Feature Toggles

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_FEATURE_REALTIME_NOTIFICATIONS` | No | `true` | Enable real-time request notifications |
| `NEXT_PUBLIC_FEATURE_PLATFORM_CHAT` | No | `true` | Enable platform chat (**must be true per constitution**) |
| `NEXT_PUBLIC_FEATURE_LINK_ITINERARIES` | No | `true` | Enable itinerary submission via links |
| `NEXT_PUBLIC_FEATURE_TEXT_ITINERARIES` | No | `true` | Enable itinerary submission via free text |

### Operational Limits

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_MAX_ACTIVE_REQUESTS` | No | `10` | Max concurrent active requests per agent |
| `NEXT_PUBLIC_REQUEST_RESPONSE_TIMEOUT_HOURS` | No | `24` | Request response SLA (hours) |
| `NEXT_PUBLIC_MAX_ITINERARY_REVISIONS` | No | `3` | Max itinerary revisions per booking |

### UI Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_REQUESTS_PER_PAGE` | No | `20` | Pagination size for request inbox |
| `NEXT_PUBLIC_INBOX_REFRESH_INTERVAL_MS` | No | `30000` | Auto-refresh interval (30s default) |

### Observability

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_ERROR_TRACKING` | No | `true` | Enable frontend error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | No | - | Sentry DSN for error reporting |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | No | `false` | Enable frontend analytics |
| `NEXT_PUBLIC_ANALYTICS_KEY` | No | - | Analytics service public key |

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Configure required variables:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
   NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_STORAGE_URL=http://localhost:54321/storage/v1
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Environment Validation

Environment variables are validated at **build time** using Zod. The application will fail to build if:

- Required variables are missing
- Variables have invalid formats
- Security violations are detected (e.g., service role key in frontend)
- Constitution violations occur (e.g., platform chat disabled)

Validation is performed in `src/config/env.ts`.

## Constitution Compliance

This application enforces the following constitution rules in code:

| Rule | Enforcement |
|------|-------------|
| Platform chat is mandatory before payment | `NEXT_PUBLIC_FEATURE_PLATFORM_CHAT` must be `true` |
| Agents are semi-blind pre-confirmation | App only displays first name + photo until confirmation |
| No user contact pre-payment | No env vars for contact access; API enforces this |
| No direct payment handling | No Stripe keys permitted; validation rejects them |
| Itineraries must be obfuscated pre-payment | Backend handles obfuscation; frontend displays as-is |
| No AI-generated itineraries | No AI generation features; agents submit manually |

## Architecture

This module:
- ✅ Is an independent module
- ✅ Does not import from other modules
- ✅ Communicates only via shared contracts and event bus (through API)
- ✅ Uses strong typing throughout
- ✅ Validates all inputs
