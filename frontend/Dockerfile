# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install libc6-compat if needed by Alpine
RUN apk add --no-cache libc6-compat

# Copy package files first for caching
COPY frontend/package*.json ./

# Install ALL dependencies (TypeScript, Tailwind, and types are required to build)
RUN npm ci

# Support build-time environment arguments (Next.js inlines NEXT_PUBLIC_* at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy frontend source code
COPY frontend/ .

# Build Next.js standalone application
RUN npm run build

# Stage 2: Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
