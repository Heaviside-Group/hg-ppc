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

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes
```

## Google Ads API Status

See `docs/google-ads-api.md` for:
- MCC access status per tenant
- Developer token tracking
- Environment variable setup
- OAuth configuration

## Environment Variables

Required in `apps/web/.env.local`:
```bash
# Google Ads API (per MCC)
GOOGLE_ADS_DEVELOPER_TOKEN_GARAGE_DOOR=
GOOGLE_ADS_DEVELOPER_TOKEN_PAVING=
GOOGLE_ADS_DEVELOPER_TOKEN_HEAVISIDE=
# + OAuth credentials (client ID, secret, refresh token)
```

See `.env.example` for full list.
