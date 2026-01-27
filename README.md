# hg-ppc

Multi-workspace Google Ads + Meta Ads platform for managing paid advertising across multiple agency MCCs.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
cp apps/web/.env.local.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env

# Generate database client and push schema
pnpm db:generate
pnpm db:push

# Start development servers
pnpm dev
```

## Project Structure

This is a Turborepo monorepo containing:

- **apps/web** - Next.js 15 dashboard with TypeScript/React 19
- **apps/worker** - Python FastAPI service for ads data sync and analytics
- **packages/db** - Shared Drizzle ORM database schema and client

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI assistant guidance and project overview
- [docs/google-ads-api.md](./docs/google-ads-api.md) - Google Ads API setup and MCC status
- [project_status.md](./project_status.md) - Recent development activity

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy
- **Database**: PostgreSQL with Drizzle ORM
- **Job Queue**: BullMQ with Redis
- **Ads APIs**: Google Ads API, Meta Ads API

## Development Status

See [project_status.md](./project_status.md) for recent development activity and context.
