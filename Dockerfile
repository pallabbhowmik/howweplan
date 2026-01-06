# =============================================================================
# HowWePlan - API Gateway Dockerfile (Root)
# Single backend entry point for Render deployment
# =============================================================================
#
# This Dockerfile builds the API Gateway service which serves as the
# single entry point for all backend microservices.
#
# For Render: Set the root directory to the repo root, this file will be used.
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from api-gateway
COPY services/api-gateway/package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci --ignore-scripts

# Copy source
COPY services/api-gateway/tsconfig.json ./
COPY services/api-gateway/src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Add security tools and create non-root user
RUN apk add --no-cache wget dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY services/api-gateway/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set proper ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Render uses PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start application with dumb-init for proper signal handling
CMD ["dumb-init", "node", "dist/index.js"]
