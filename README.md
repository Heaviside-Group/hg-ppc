# HG PPC - Multi-workspace Ads Platform

## Project Overview

HG PPC is a multi-workspace platform for managing paid advertising across multiple agency Marketing Customer Centers (MCCs) for Google Ads and Meta Ads.

## Prerequisites

- Node.js: v20.x
- pnpm: v9.x

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Development

### Essential Commands

```bash
# Start all applications in development mode
pnpm dev

# Build all applications
pnpm build

# Run linter
pnpm lint

# Database operations
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run database migrations
pnpm db:push      # Push schema changes
```

## Project Structure

```
hg-ppc/
├── apps/
│   ├── web/          # Next.js dashboard application
│   └── worker/       # Background job workers
├── packages/         # Shared packages
└── docs/             # Additional documentation
```

## Environment Setup

1. Copy `.env.example` to `.env.local` in `apps/web/`
2. Fill in required environment variables, particularly:
   - Google Ads API Developer Tokens
   - OAuth credentials

## Important Notes

- Requires Node.js >=20 and <22
- Uses pnpm >=9 and <10
- Turborepo is used for monorepo management

## Documentation

Additional details about Google Ads API configuration can be found in `docs/google-ads-api.md`.

## License

[To be added]