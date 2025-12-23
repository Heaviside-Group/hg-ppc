FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy workspace configuration first
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy all package.json files
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

# Copy source code first
COPY . .

# Copy node_modules from deps and reinstall to fix pnpm symlinks
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm install --frozen-lockfile

# Build arguments for database URL (needed for Drizzle schema generation)
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV DISABLE_REDIS=true

# Build the app
RUN pnpm --filter @hg-ppc/web build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Install curl for health checks
RUN apk add --no-cache curl

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
