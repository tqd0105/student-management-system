# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma and build tools for native packages (bcrypt)
RUN apk add --no-cache openssl python3 make g++

# Copy package files and Prisma schema first
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy backend source code
COPY backend/ .

# Build application (prisma generate + tsc)
RUN npm run build

# Stage 2: Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Install runtime OpenSSL for Prisma query engine
RUN apk add --no-cache openssl

# Security: Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy package files and Prisma schema
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install production dependencies and generate Prisma client
RUN npm ci --only=production && npx prisma generate

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Set permissions for non-root user
RUN chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 3001

CMD ["node", "dist/index.js"]
