# =============================================================================
# HowWePlan - Monolithic Backend Dockerfile
# All microservices in a single container
# =============================================================================
#
# This builds ALL services into one container for single-instance deployment.
# The API Gateway serves as the entry point and routes to internal services.
#
# =============================================================================

FROM node:20-alpine AS base

# Install build tools for native modules
RUN apk add --no-cache python3 make g++ wget dumb-init

WORKDIR /app

# =============================================================================
# Stage 1: Install dependencies for ALL services
# =============================================================================
FROM base AS deps

# Copy all package.json files
COPY services/api-gateway/package*.json ./services/api-gateway/
COPY services/event-bus-service/package*.json ./services/event-bus-service/
COPY services/audit/package*.json ./services/audit/
COPY services/identity/package*.json ./services/identity/
COPY services/requests/package*.json ./services/requests/
COPY services/matching/package*.json ./services/matching/
COPY services/itineraries/package*.json ./services/itineraries/
COPY services/booking-payments/package*.json ./services/booking-payments/
COPY services/messaging/package*.json ./services/messaging/
COPY services/disputes/package*.json ./services/disputes/
COPY services/reviews/package*.json ./services/reviews/
COPY services/notifications/package*.json ./services/notifications/

# Install dependencies for each service
RUN cd services/api-gateway && npm ci --ignore-scripts
RUN cd services/event-bus-service && npm ci --ignore-scripts
RUN cd services/audit && npm ci --ignore-scripts
RUN cd services/identity && npm ci --ignore-scripts
RUN cd services/requests && npm ci --ignore-scripts
RUN cd services/matching && npm ci --ignore-scripts
RUN cd services/itineraries && npm ci --ignore-scripts
RUN cd services/booking-payments && npm ci --ignore-scripts
RUN cd services/messaging && npm ci --ignore-scripts
RUN cd services/disputes && npm ci --ignore-scripts
RUN cd services/reviews && npm ci --ignore-scripts
RUN cd services/notifications && npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build ALL services
# =============================================================================
FROM deps AS builder

# Copy source code for all services
COPY services/api-gateway/ ./services/api-gateway/
COPY services/event-bus-service/ ./services/event-bus-service/
COPY services/audit/ ./services/audit/
COPY services/identity/ ./services/identity/
COPY services/requests/ ./services/requests/
COPY services/matching/ ./services/matching/
COPY services/itineraries/ ./services/itineraries/
COPY services/booking-payments/ ./services/booking-payments/
COPY services/messaging/ ./services/messaging/
COPY services/disputes/ ./services/disputes/
COPY services/reviews/ ./services/reviews/
COPY services/notifications/ ./services/notifications/

# Build each service
RUN cd services/api-gateway && npm run build
RUN cd services/event-bus-service && npm run build
RUN cd services/audit && npm run build
RUN cd services/identity && npm run build
RUN cd services/requests && npm run build
RUN cd services/matching && npm run build
RUN cd services/itineraries && npm run build
RUN cd services/booking-payments && npm run build
RUN cd services/messaging && npm run build
RUN cd services/disputes && npm run build
RUN cd services/reviews && npm run build
RUN cd services/notifications && npm run build

# =============================================================================
# Stage 3: Production image
# =============================================================================
FROM node:20-alpine AS production

RUN apk add --no-cache wget dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built services and production dependencies
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist
COPY --from=builder /app/services/api-gateway/node_modules ./services/api-gateway/node_modules
COPY --from=builder /app/services/api-gateway/package.json ./services/api-gateway/

COPY --from=builder /app/services/event-bus-service/dist ./services/event-bus-service/dist
COPY --from=builder /app/services/event-bus-service/node_modules ./services/event-bus-service/node_modules
COPY --from=builder /app/services/event-bus-service/package.json ./services/event-bus-service/

COPY --from=builder /app/services/audit/dist ./services/audit/dist
COPY --from=builder /app/services/audit/node_modules ./services/audit/node_modules
COPY --from=builder /app/services/audit/package.json ./services/audit/

COPY --from=builder /app/services/identity/dist ./services/identity/dist
COPY --from=builder /app/services/identity/node_modules ./services/identity/node_modules
COPY --from=builder /app/services/identity/package.json ./services/identity/

COPY --from=builder /app/services/requests/dist ./services/requests/dist
COPY --from=builder /app/services/requests/node_modules ./services/requests/node_modules
COPY --from=builder /app/services/requests/package.json ./services/requests/

COPY --from=builder /app/services/matching/dist ./services/matching/dist
COPY --from=builder /app/services/matching/node_modules ./services/matching/node_modules
COPY --from=builder /app/services/matching/package.json ./services/matching/

COPY --from=builder /app/services/itineraries/dist ./services/itineraries/dist
COPY --from=builder /app/services/itineraries/node_modules ./services/itineraries/node_modules
COPY --from=builder /app/services/itineraries/package.json ./services/itineraries/

COPY --from=builder /app/services/booking-payments/dist ./services/booking-payments/dist
COPY --from=builder /app/services/booking-payments/node_modules ./services/booking-payments/node_modules
COPY --from=builder /app/services/booking-payments/package.json ./services/booking-payments/

COPY --from=builder /app/services/messaging/dist ./services/messaging/dist
COPY --from=builder /app/services/messaging/node_modules ./services/messaging/node_modules
COPY --from=builder /app/services/messaging/package.json ./services/messaging/

COPY --from=builder /app/services/disputes/dist ./services/disputes/dist
COPY --from=builder /app/services/disputes/node_modules ./services/disputes/node_modules
COPY --from=builder /app/services/disputes/package.json ./services/disputes/

COPY --from=builder /app/services/reviews/dist ./services/reviews/dist
COPY --from=builder /app/services/reviews/node_modules ./services/reviews/node_modules
COPY --from=builder /app/services/reviews/package.json ./services/reviews/

COPY --from=builder /app/services/notifications/dist ./services/notifications/dist
COPY --from=builder /app/services/notifications/node_modules ./services/notifications/node_modules
COPY --from=builder /app/services/notifications/package.json ./services/notifications/

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Set working directory to api-gateway (entry point)
WORKDIR /app/services/api-gateway

# Expose main port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the launcher (which starts all services)
CMD ["dumb-init", "node", "dist/launcher.js"]
