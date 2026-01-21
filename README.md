# HG PPC: Multi-Workspace Advertising Management Platform

## Overview

HG PPC is a comprehensive platform for managing paid advertising across multiple agency MCCs, specifically supporting Google Ads and Meta Ads integrations.

## Project Structure

```
hg-ppc/
├── apps/
│   ├── web/          # Next.js dashboard application (TypeScript)
│   └── worker/       # Python FastAPI worker service for data sync & ML
├── packages/
│   └── db/           # Shared Drizzle ORM database package
├── docs/             # Project documentation
└── turbo.json        # Turborepo configuration
```

## Prerequisites

- **Node.js**: 20.x or 21.x (required for web app)
- **pnpm**: 9.x (package manager)
- **Python**: 3.11+ (required for worker service)
- **PostgreSQL**: Database
- **Redis**: Cache and job queue

## Installation

1. Clone the repository

2. Install Node.js dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local` in the root
   - Copy `apps/web/.env.local.example` to `apps/web/.env.local`
   - Fill in required configuration (see Environment Variables section)

4. Install Python dependencies (for worker):
   ```bash
   cd apps/worker
   pip install -r requirements.txt
   ```

## Configuration

### Required Environment Variables

Key environment variables to configure in `apps/web/.env.local`:

#### Database & Cache
- `DATABASE_URL`: PostgreSQL connection string
- `DATABASE_DIRECT_URL`: PostgreSQL direct connection (for migrations)
- `REDIS_URL`: Redis connection URL

#### Authentication
- `NEXTAUTH_URL`: Application URL (e.g., `http://localhost:3000`)
- `NEXTAUTH_SECRET`: JWT secret for authentication
- `ENCRYPTION_KEY`: 64-character hex string for AES-256 encryption

**Note:** This project uses custom email-based authentication with JWT tokens, not NextAuth.js. The `NEXTAUTH_*` variables are used for compatibility.

#### Google Ads API (Multi-Tenant)
The platform supports multiple Google Ads MCCs (Manager Accounts). Each tenant requires its own set of credentials:

- `GOOGLE_ADS_DEVELOPER_TOKEN_<TENANT>`: Developer token from Google Ads API Center
- `GOOGLE_CLIENT_ID_<TENANT>`: OAuth 2.0 client ID
- `GOOGLE_CLIENT_SECRET_<TENANT>`: OAuth 2.0 client secret
- `GOOGLE_ADS_REFRESH_TOKEN_<TENANT>`: OAuth refresh token
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID_<TENANT>`: MCC customer ID

See `docs/google-ads-api.md` for detailed setup instructions and current MCC access status.

#### Meta Ads OAuth
- `META_APP_ID`: Facebook/Meta app ID
- `META_APP_SECRET`: Facebook/Meta app secret

Refer to `.env.example` and `apps/web/.env.local.example` for complete lists.

## Development

### Essential Commands

```bash
# Start all development servers (web app + worker)
pnpm dev

# Build all applications
pnpm build

# Run linters
pnpm lint

# Database operations (Drizzle ORM)
pnpm db:generate   # Generate Drizzle client from schema
pnpm db:migrate    # Run Drizzle migrations
pnpm db:push       # Push Drizzle schema changes to database

# Format code
pnpm format
```

### Running Services Individually

```bash
# Web app only
cd apps/web
pnpm dev

# Python worker only
cd apps/worker
python -m uvicorn app.main:app --reload
```

### Using Docker Compose

For a complete development environment with PostgreSQL and Redis:

```bash
docker-compose up
```

## Architecture

- **Web App** (`apps/web`): Next.js 15 application with TypeScript
  - Uses Drizzle ORM for database access
  - Implements BullMQ workers for background jobs (TypeScript)
  - Custom email-based authentication with JWT

- **Worker Service** (`apps/worker`): Python FastAPI service
  - Handles data synchronization from advertising platforms
  - Performs ML-based analytics and optimization
  - Consumes jobs from Redis/BullMQ queues

- **Database Package** (`packages/db`): Shared Drizzle ORM schemas
  - Multi-tenant with Row-Level Security (RLS)
  - Shared between web app and worker

## Documentation

- **Google Ads API configuration**: `docs/google-ads-api.md`
  - MCC access status per tenant
  - Developer token tracking
  - OAuth setup guide

- **Project status**: `project_status.md`
  - Recent development activity
  - Auto-updated daily for AI context

- **Claude guidance**: `CLAUDE.md`
  - Quick reference for AI assistants

## Testing

> **Note:** Test infrastructure is currently being set up. The `pnpm test` command is defined but no tests are implemented yet.

## Contributing

Please read `CONTRIBUTING.md` for details on our development workflow and the process for submitting pull requests.

## License

[License information to be added]

## Contact

For questions or support, please [contact information to be added]
