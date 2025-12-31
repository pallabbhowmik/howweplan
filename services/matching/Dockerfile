# ============================================================================
# Matching Service - Dockerfile
# Multi-stage build for optimized production image
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# ============================================================================
# Production Stage
# ============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install wget for healthchecks and create non-root user for security
RUN apk add --no-cache wget && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment defaults (overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3013

# Expose port (not used as this is event-driven, but kept for documentation)
EXPOSE 3013

# Note: This service is event-driven and doesn't expose HTTP endpoints
# No healthcheck is defined as there's no HTTP server to check

# Start the service
CMD ["node", "dist/index.js"]
