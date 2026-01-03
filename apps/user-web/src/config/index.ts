/**
 * Application Configuration
 * =========================
 * 
 * Centralized configuration derived from validated environment variables.
 * This provides a clean API for accessing configuration throughout the app.
 * 
 * IMPORTANT: All values here are PUBLIC and will be exposed to the browser.
 */

import { env } from './env';

// ============================================================================
// APPLICATION CONFIG
// ============================================================================

export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  version: env.NEXT_PUBLIC_APP_VERSION,
  environment: env.NEXT_PUBLIC_APP_ENV,
  isProduction: env.NEXT_PUBLIC_APP_ENV === 'production',
  isDevelopment: env.NEXT_PUBLIC_APP_ENV === 'development',
  isStaging: env.NEXT_PUBLIC_APP_ENV === 'staging',
} as const;

// ============================================================================
// API CONFIG - GATEWAY ONLY
// ============================================================================
// All backend requests go through the API gateway.
// Frontend NEVER calls microservices directly.
// 
// Gateway routes:
//   /api/identity/*      → Identity Service
//   /api/requests/*      → Requests Service
//   /api/booking-payments/* → Booking-Payments Service
//   /api/messaging/*     → Messaging Service
//   /api/matching/*      → Matching Service
//   /api/itineraries/*   → Itineraries Service
//   /api/notifications/* → Notifications Service
//   /api/reviews/*       → Reviews Service
//   /api/disputes/*      → Disputes Service
//   /api/audit/*         → Audit Service

export const apiConfig = {
  baseUrl: env.NEXT_PUBLIC_API_BASE_URL,
  wsUrl: env.NEXT_PUBLIC_WS_URL,
  timeoutMs: env.NEXT_PUBLIC_API_TIMEOUT_MS,
} as const;

// ============================================================================
// AUTH CONFIG (Supabase)
// ============================================================================

export const authConfig = {
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

// ============================================================================
// PAYMENTS CONFIG (Stripe)
// ============================================================================

export const paymentsConfig = {
  stripePublishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const featureFlags = {
  disputesEnabled: env.NEXT_PUBLIC_FEATURE_DISPUTES_ENABLED,
  chatEnabled: env.NEXT_PUBLIC_FEATURE_CHAT_ENABLED,
  reviewsEnabled: env.NEXT_PUBLIC_FEATURE_REVIEWS_ENABLED,
  multiCurrencyEnabled: env.NEXT_PUBLIC_FEATURE_MULTI_CURRENCY,
} as const;

// ============================================================================
// OPERATIONAL LIMITS
// ============================================================================

export const limits = {
  maxUploadSizeBytes: env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_BYTES,
  maxTravelersPerRequest: env.NEXT_PUBLIC_MAX_TRAVELERS_PER_REQUEST,
  maxOptionsDisplay: env.NEXT_PUBLIC_MAX_OPTIONS_DISPLAY,
  chatMessageMaxLength: env.NEXT_PUBLIC_CHAT_MESSAGE_MAX_LENGTH,
} as const;

// ============================================================================
// OBSERVABILITY CONFIG
// ============================================================================

export const observabilityConfig = {
  sentryDsn: env.NEXT_PUBLIC_SENTRY_DSN || null,
  analyticsEnabled: env.NEXT_PUBLIC_ANALYTICS_ENABLED,
  analyticsId: env.NEXT_PUBLIC_ANALYTICS_ID || null,
} as const;

// ============================================================================
// UI CONFIG
// ============================================================================

export const uiConfig = {
  defaultCurrency: env.NEXT_PUBLIC_DEFAULT_CURRENCY,
  defaultLocale: env.NEXT_PUBLIC_DEFAULT_LOCALE,
  supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
  termsUrl: env.NEXT_PUBLIC_TERMS_URL,
  privacyUrl: env.NEXT_PUBLIC_PRIVACY_URL,
} as const;

// ============================================================================
// UNIFIED CONFIG EXPORT
// ============================================================================

export const config = {
  app: appConfig,
  api: apiConfig,
  auth: authConfig,
  payments: paymentsConfig,
  features: featureFlags,
  limits,
  observability: observabilityConfig,
  ui: uiConfig,
} as const;

export default config;
