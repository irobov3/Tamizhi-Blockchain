# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies needed for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package manifests first for layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build NestJS application
RUN npm run build

# Prune devDependencies after build
RUN npm prune --production

# ── Stage 2: Production ────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install system dependencies for native modules at runtime
RUN apk add --no-cache python3 make g++ && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy production node_modules from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built dist directory
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy Prisma schema and generated client
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy package.json for metadata
COPY --chown=nestjs:nodejs package*.json ./

# Set user to non-root
USER nestjs

# Expose application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
CMD ["node", "dist/main"]
