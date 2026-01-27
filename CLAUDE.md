# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**HG PPC** - Multi-workspace Google Ads + Meta Ads platform for managing paid advertising across multiple agency MCCs.

## Monorepo Structure

```
hg-ppc/
├── apps/
│   ├── web/          # Next.js dashboard application
│   └── worker/       # Background job workers
├── packages/         # Shared packages
├── docs/             # Documentation
│   └── google-ads-api.md  # Google Ads API setup & MCC status
└── turbo.json        # Turborepo configuration
```

## Essential Commands

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps
pnpm lint             # Lint all packages

# Database (Drizzle ORM)
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes directly to DB
```

## Google Ads API Status

See `docs/google-ads-api.md` for:
- MCC access status per tenant
- Developer token tracking
- Environment variable setup
- OAuth configuration

## Environment Variables

Copy example files and configure:
```bash
cp .env.example .env.local
cp apps/web/.env.local.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env
```

Required environment variables:
- **Database**: `DATABASE_URL`, `DATABASE_DIRECT_URL`
- **Redis**: `REDIS_URL` (for BullMQ job queue)
- **Auth**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- **Encryption**: `ENCRYPTION_KEY` (32-byte hex for OAuth token encryption)
- **Google Ads**: `GOOGLE_ADS_DEVELOPER_TOKEN`, OAuth credentials
- **Meta Ads**: `META_APP_ID`, `META_APP_SECRET`

See example files for full configuration details.
