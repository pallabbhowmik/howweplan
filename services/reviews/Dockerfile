# ============================================================================
# Reviews Service - Dockerfile
# Multi-stage build for optimized production image
# ============================================================================
# BUILD CONTEXT: Must be repository root
# Render: Set "Root Directory" to "/" and "Dockerfile Path" to "services/reviews/Dockerfile"
# Docker Compose: context: . and dockerfile: services/reviews/Dockerfile
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy and build the contracts package first
COPY packages/contracts/package*.json ./packages/contracts/
COPY packages/contracts/tsconfig.json ./packages/contracts/
COPY packages/contracts/tsup.config.ts ./packages/contracts/
COPY packages/contracts/*.ts ./packages/contracts/
COPY packages/contracts/dtos ./packages/contracts/dtos
COPY packages/contracts/entities ./packages/contracts/entities
COPY packages/contracts/events ./packages/contracts/events
COPY packages/contracts/states ./packages/contracts/states

WORKDIR /app/packages/contracts
RUN npm install --legacy-peer-deps && npm run build

# Now build the reviews service
WORKDIR /app/services/reviews

# Copy package files for dependency caching
COPY services/reviews/package*.json ./

# Link the local contracts package
RUN npm install --legacy-peer-deps

# Copy source code
COPY services/reviews/tsconfig.json ./
COPY services/reviews/src ./src

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

# Copy contracts package (built)
COPY --from=builder /app/packages/contracts/package.json ./node_modules/@tripcomposer/contracts/
COPY --from=builder /app/packages/contracts/dist ./node_modules/@tripcomposer/contracts/dist

# Copy package files
COPY services/reviews/package*.json ./

# Install production dependencies only (skip local package resolution)
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/services/reviews/dist ./dist

# Copy database folder if it exists (optional)
RUN mkdir -p ./database || true

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment defaults (overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3018

# Expose port
EXPOSE 3018

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3018/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]
