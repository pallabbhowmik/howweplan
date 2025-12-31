# User Web App

> Travel booking platform frontend for end-users.

## Overview

This is the customer-facing web application for HowWePlan. It provides:

- **Travel Request Form** - Submit trip requirements to agents
- **Option Comparison** - Compare obfuscated itinerary options
- **Semi-Blind Agents** - View agent profiles (first name + photo only pre-confirmation)
- **Payment Flow** - Secure Stripe checkout integration
- **Booking Status** - Real-time booking state tracking
- **Dispute Creation** - Structured dispute submission for admin arbitration

## Security Model

This application enforces strict security boundaries:

| Rule | Enforcement |
|------|-------------|
| No business logic | All validation/enforcement server-side |
| No secrets | Only `NEXT_PUBLIC_*` variables permitted |
| Obfuscated itineraries | Hotel names, vendors hidden until payment |
| Semi-blind agents | Full identity revealed only after confirmation |
| Platform chat required | External contact blocked pre-payment |

## Environment Variables

### Quick Start

```bash
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

### Variable Reference

#### App Metadata

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_APP_NAME` | Application name in UI/metadata | ✅ | `HowWePlan` |
| `NEXT_PUBLIC_APP_VERSION` | Version for cache busting | ✅ | `1.0.0` |
| `NEXT_PUBLIC_APP_ENV` | Environment identifier | ✅ | `development` |

#### API Connectivity

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API gateway URL | ✅ | `http://localhost:3001/api` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for real-time features | ✅ | `ws://localhost:3001/ws` |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | Request timeout in milliseconds | ❌ | `30000` |

#### Authentication (Supabase)

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key (RLS protected) | ✅ | - |

> ⚠️ **Security**: Only the anon key is permitted here. The service role key must NEVER be in frontend apps.

#### Payments (Stripe)

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key for Elements | ✅ | - |

> ⚠️ **Security**: Only publishable keys (`pk_test_*` or `pk_live_*`) are permitted. Secret keys are in the `booking-payments` service only.

#### Feature Toggles

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_FEATURE_DISPUTES_ENABLED` | Enable dispute creation UI | ❌ | `true` |
| `NEXT_PUBLIC_FEATURE_CHAT_ENABLED` | Enable real-time chat | ❌ | `true` |
| `NEXT_PUBLIC_FEATURE_REVIEWS_ENABLED` | Enable agent reviews | ❌ | `true` |
| `NEXT_PUBLIC_FEATURE_MULTI_CURRENCY` | Enable currency selection | ❌ | `false` |

#### Operational Limits

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES` | Max file upload size | ❌ | `5242880` (5MB) |
| `NEXT_PUBLIC_MAX_TRAVELERS_PER_REQUEST` | Max travelers per booking | ❌ | `20` |
| `NEXT_PUBLIC_MAX_OPTIONS_DISPLAY` | Max options in comparison | ❌ | `10` |
| `NEXT_PUBLIC_CHAT_MESSAGE_MAX_LENGTH` | Chat message char limit | ❌ | `2000` |

#### Observability

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN | ❌ | - |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Enable analytics tracking | ❌ | `false` |
| `NEXT_PUBLIC_ANALYTICS_ID` | Analytics tracking ID | ❌ | - |

#### UI Configuration

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | Default currency (ISO 4217) | ❌ | `USD` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default locale (BCP 47) | ❌ | `en-US` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support email in UI | ✅ | - |
| `NEXT_PUBLIC_TERMS_URL` | Terms of service URL | ✅ | `/legal/terms` |
| `NEXT_PUBLIC_PRIVACY_URL` | Privacy policy URL | ✅ | `/legal/privacy` |

## Environment Validation

Environment variables are validated at **build time** using Zod. The build will fail with clear error messages if:

- Required variables are missing
- Variables have invalid formats
- Stripe key doesn't match `pk_test_*` or `pk_live_*` pattern
- URLs are malformed

### Validation Code

Located at `src/config/env.ts`:

```typescript
import { env } from '@/config/env';

// Access validated config
console.log(env.NEXT_PUBLIC_APP_NAME);
```

### Using Configuration

Located at `src/config/index.ts`:

```typescript
import { config, featureFlags, limits } from '@/config';

// Feature checks
if (featureFlags.chatEnabled) {
  // Show chat UI
}

// Access limits
if (file.size > limits.maxUploadSizeBytes) {
  throw new Error('File too large');
}

// API calls
fetch(`${config.api.baseUrl}/bookings`);
```

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Start development server
pnpm dev
```

### Required Services

For full functionality, you need:

1. **API Gateway** running at `NEXT_PUBLIC_API_BASE_URL`
2. **Supabase** project (local or cloud)
3. **Stripe** test account

### Local Development with Supabase

```bash
# Start local Supabase
npx supabase start

# Get local credentials
npx supabase status
```

Use the `anon key` from status output for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Architecture Compliance

This app follows platform architecture rules:

| Rule | Implementation |
|------|----------------|
| No cross-module imports | Uses shared contracts via API |
| Event-driven workflows | Subscribes to events via WebSocket |
| Strong typing | TypeScript strict mode, Zod validation |
| UI only | Zero business logic, all enforcement server-side |
| Audit trail | All user actions emit events to backend |

## Security Checklist

Before deployment, verify:

- [ ] No `SUPABASE_SERVICE_ROLE_KEY` in environment
- [ ] No `STRIPE_SECRET_KEY` in environment
- [ ] No database connection strings
- [ ] All API keys are public/publishable variants
- [ ] `NEXT_PUBLIC_APP_ENV` is set to `production`
- [ ] Sentry DSN configured for error tracking
- [ ] Analytics configured if required

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build (validates env) |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | TypeScript validation |
