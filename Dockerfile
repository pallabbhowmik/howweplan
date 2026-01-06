# =============================================================================
# HowWePlan - Monolithic Backend Dockerfile
# All microservices in a single container (npm workspaces)
# =============================================================================

FROM node:20-alpine AS base

# Install build tools for native modules
RUN apk add --no-cache python3 make g++ wget dumb-init

WORKDIR /app

# =============================================================================
# Stage 1: Install ALL dependencies using npm workspaces
# =============================================================================
FROM base AS deps

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./

# Copy all service package.json files (required for workspace resolution)
COPY services/api-gateway/package.json ./services/api-gateway/
COPY services/event-bus-service/package.json ./services/event-bus-service/
COPY services/audit/package.json ./services/audit/
COPY services/identity/package.json ./services/identity/
COPY services/requests/package.json ./services/requests/
COPY services/matching/package.json ./services/matching/
COPY services/itineraries/package.json ./services/itineraries/
COPY services/booking-payments/package.json ./services/booking-payments/
COPY services/messaging/package.json ./services/messaging/
COPY services/disputes/package.json ./services/disputes/
COPY services/reviews/package.json ./services/reviews/
COPY services/notifications/package.json ./services/notifications/

# Copy packages (shared libraries)
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/observability/package.json ./packages/observability/
COPY packages/idempotency/package.json ./packages/idempotency/
COPY packages/resilience/package.json ./packages/resilience/
COPY packages/auth-utils/package.json ./packages/auth-utils/

# Install all workspace dependencies
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build ALL services
# =============================================================================
FROM deps AS builder

# Copy all source code
COPY packages/ ./packages/
COPY services/ ./services/

# Build shared packages first
RUN npm run build --workspace=@tripcomposer/contracts || true
RUN npm run build --workspace=@tripcomposer/observability || true
RUN npm run build --workspace=@tripcomposer/idempotency || true
RUN npm run build --workspace=@tripcomposer/resilience || true
RUN npm run build --workspace=@tripcomposer/auth-utils || true

# Build all services
RUN npm run build --workspace=@tripcomposer/api-gateway || cd services/api-gateway && npm run build
RUN npm run build --workspace=@tripcomposer/event-bus-service || cd services/event-bus-service && npm run build
RUN npm run build --workspace=@tripcomposer/audit-service || cd services/audit && npm run build
RUN npm run build --workspace=@tripcomposer/identity-service || cd services/identity && npm run build
RUN npm run build --workspace=@tripcomposer/requests-service || cd services/requests && npm run build
RUN npm run build --workspace=@tripcomposer/matching-service || cd services/matching && npm run build
RUN npm run build --workspace=@tripcomposer/itineraries-service || cd services/itineraries && npm run build
RUN npm run build --workspace=@tripcomposer/booking-payments-service || cd services/booking-payments && npm run build
RUN npm run build --workspace=@tripcomposer/messaging-service || cd services/messaging && npm run build
RUN npm run build --workspace=@tripcomposer/disputes-service || cd services/disputes && npm run build
RUN npm run build --workspace=@tripcomposer/reviews-service || cd services/reviews && npm run build
RUN npm run build --workspace=@tripcomposer/notifications-service || cd services/notifications && npm run build

# =============================================================================
# Stage 3: Production image
# =============================================================================
FROM node:20-alpine AS production

RUN apk add --no-cache wget dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy root package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built packages (shared libraries)
COPY --from=builder /app/packages ./packages

# Copy built services with their dist folders
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist
COPY --from=builder /app/services/api-gateway/package.json ./services/api-gateway/

COPY --from=builder /app/services/event-bus-service/dist ./services/event-bus-service/dist
COPY --from=builder /app/services/event-bus-service/package.json ./services/event-bus-service/

COPY --from=builder /app/services/audit/dist ./services/audit/dist
COPY --from=builder /app/services/audit/package.json ./services/audit/

COPY --from=builder /app/services/identity/dist ./services/identity/dist
COPY --from=builder /app/services/identity/package.json ./services/identity/

COPY --from=builder /app/services/requests/dist ./services/requests/dist
COPY --from=builder /app/services/requests/package.json ./services/requests/

COPY --from=builder /app/services/matching/dist ./services/matching/dist
COPY --from=builder /app/services/matching/package.json ./services/matching/

COPY --from=builder /app/services/itineraries/dist ./services/itineraries/dist
COPY --from=builder /app/services/itineraries/package.json ./services/itineraries/

COPY --from=builder /app/services/booking-payments/dist ./services/booking-payments/dist
COPY --from=builder /app/services/booking-payments/package.json ./services/booking-payments/

COPY --from=builder /app/services/messaging/dist ./services/messaging/dist
COPY --from=builder /app/services/messaging/package.json ./services/messaging/

COPY --from=builder /app/services/disputes/dist ./services/disputes/dist
COPY --from=builder /app/services/disputes/package.json ./services/disputes/

COPY --from=builder /app/services/reviews/dist ./services/reviews/dist
COPY --from=builder /app/services/reviews/package.json ./services/reviews/

COPY --from=builder /app/services/notifications/dist ./services/notifications/dist
COPY --from=builder /app/services/notifications/package.json ./services/notifications/

# Copy launcher script
COPY --from=builder /app/services/api-gateway/dist/launcher.js ./dist/launcher.js

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

USER nodejs

EXPOSE 3000

# Start the launcher which spawns all services
CMD ["dumb-init", "node", "dist/launcher.js"]
