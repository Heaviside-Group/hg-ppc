# HG PPC

Multi-workspace Google Ads + Meta Ads platform for managing paid advertising across multiple agency MCCs.

## Project Overview

HG PPC is a comprehensive dashboard and worker system for managing paid advertising campaigns across multiple Marketing Customer Centers (MCCs) for Google and Meta Ads platforms. The system consists of:

- **Next.js Web Dashboard** - Multi-tenant SaaS interface for campaign management
- **Python Worker Service** - Background job processing for data sync and analytics
- **Shared Database Package** - Drizzle ORM schema with PostgreSQL

## Key Features

- 🏢 Multi-tenant workspace architecture with role-based access control
- 📊 Google Ads API integration (see [docs/google-ads-api.md](docs/google-ads-api.md))
- 🔄 Background job processing with BullMQ and Redis
- 🔐 Passwordless email authentication with JWT sessions
- 🐳 Docker Compose setup for local development
- 📈 Campaign analytics and ML-powered insights

## Prerequisites

- **Node.js** >= 20.x < 22.x (see `engines` in package.json)
- **pnpm** >= 9.x < 10.x (package manager)
- **Python** >= 3.11 (for worker service)
- **PostgreSQL** 16+ (database)
- **Redis** 7+ (job queue)
- **Google Ads API credentials** (developer token, OAuth)
- **Meta Ads API credentials** (optional - app ID, secret)

## Quick Start

### Using Docker Compose (Recommended)

The easiest way to run the full stack locally:

```bash
# Clone the repository
git clone <repository-url>
cd hg-ppc

# Start all services (web, worker, db, redis)
docker-compose up

# The web app will be available at http://localhost:3000
# The worker API will be available at http://localhost:8000
```

### Local Development Setup

For active development without Docker:

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Set Up Environment Variables**

   Copy the example file and configure:
   ```bash
   cp .env.example apps/web/.env.local
   ```

   Required variables in `apps/web/.env.local`:
   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
   DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
   REDIS_URL=redis://localhost:6379
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-here
   ENCRYPTION_KEY=your-64-char-hex-string-here

   # Google Ads API (see docs/google-ads-api.md for setup)
   GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. **Set Up Database**

   Start PostgreSQL and Redis (or use Docker Compose for just these services):
   ```bash
   # Option 1: Use Docker for databases only
   docker-compose up db redis -d

   # Option 2: Use local installations
   # (Ensure PostgreSQL and Redis are running)
   ```

   Run migrations:
   ```bash
   pnpm db:push
   ```

4. **Start Development Servers**
   ```bash
   # Start all apps in development mode (uses Turborepo)
   pnpm dev

   # Or start individually:
   pnpm --filter @hg-ppc/web dev          # Next.js web app on :3000
   pnpm --filter @hg-ppc/web workers:dev  # Node.js workers

   # Python worker (in apps/worker directory)
   cd apps/worker
   pip install -r requirements.txt
   python -m app.main
   ```

## Development Commands

```bash
# Development
pnpm dev              # Start all apps in development mode
pnpm build            # Build all applications
pnpm lint             # Run linting across all packages

# Database (Drizzle ORM)
pnpm db:generate      # Generate migration files from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:push          # Push schema changes directly (dev only)
pnpm db:studio        # Open Drizzle Studio (database GUI)

# Formatting
pnpm format           # Format code with Prettier

# Clean
pnpm clean            # Remove all build artifacts and node_modules
```

## Project Structure

```
hg-ppc/
├── apps/
│   ├── web/                    # Next.js 15 dashboard (App Router)
│   │   ├── src/
│   │   │   ├── app/           # Next.js app router pages & API routes
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # Utilities and helpers
│   │   │   ├── queues/        # BullMQ queue definitions
│   │   │   └── workers/       # Node.js worker implementations
│   │   ├── Dockerfile         # Production web container
│   │   └── Dockerfile.worker  # Node.js worker container
│   │
│   └── worker/                 # Python FastAPI worker service
│       ├── app/
│       │   ├── integrations/  # Google Ads, Meta Ads clients
│       │   ├── workers/       # BullMQ job processors
│       │   ├── analytics/     # ML and analytics
│       │   └── main.py        # FastAPI application
│       └── requirements.txt   # Python dependencies
│
├── packages/
│   └── db/                     # Shared database package
│       ├── src/
│       │   ├── schema/        # Drizzle ORM schema definitions
│       │   │   ├── core.ts    # Workspaces, users, clients
│       │   │   ├── auth.ts    # Auth codes, sessions
│       │   │   ├── integrations.ts  # Ad account connections
│       │   │   ├── entities.ts      # Campaigns, ad groups, ads
│       │   │   ├── metrics.ts       # Performance metrics
│       │   │   └── jobs.ts          # Job tracking
│       │   └── migrations/    # Database migration files
│       └── drizzle.config.ts  # Drizzle Kit configuration
│
├── docs/                       # Documentation
│   └── google-ads-api.md      # Google Ads API setup guide
│
├── docker-compose.yml          # Local development stack
├── turbo.json                  # Turborepo configuration
└── pnpm-workspace.yaml        # pnpm workspace definition
```

## Architecture

### Multi-Tenancy

The application uses a workspace-based multi-tenancy model:

- **Workspaces** - Top-level tenant boundary (e.g., "Paving Marketers", "Garage Door Marketers")
- **Users** - Can belong to multiple workspaces with different roles
- **Clients** - Businesses managed within a workspace
- **Ad Accounts** - Connected Google/Meta ad accounts per client

Row-Level Security (RLS) is enforced at the database level using PostgreSQL policies (see `rls_policies.sql`).

### Authentication

- **Passwordless login** via email verification codes (6-digit codes)
- **JWT sessions** stored in database with token hashing
- Session management via middleware and API routes

### Job Processing

- **BullMQ** with Redis for distributed job queues
- **Node.js workers** for lightweight tasks (emails, webhooks)
- **Python workers** for heavy processing (data sync, ML analytics)

## Configuration Files

- `.env.example` - Example environment variables with all required fields
- `apps/web/.env.local` - Local environment config (not tracked in git)
- `docs/google-ads-api.md` - Detailed Google Ads API setup instructions
- `turbo.json` - Build pipeline and caching configuration
- `rls_policies.sql` - PostgreSQL Row-Level Security policies

## Database Schema

The database uses Drizzle ORM with PostgreSQL. Key schema files:

- `core.ts` - Workspaces, users, workspace memberships, clients
- `auth.ts` - Authentication codes, sessions
- `integrations.ts` - Ad account connections (Google Ads, Meta Ads)
- `entities.ts` - Campaigns, ad groups, ads, keywords
- `metrics.ts` - Performance metrics and analytics
- `jobs.ts` - Background job tracking

## Google Ads API Setup

See [docs/google-ads-api.md](docs/google-ads-api.md) for:
- MCC access status per tenant
- Developer token application process
- OAuth credential setup
- Environment variable configuration

Current status:
- **Garage Door Marketers**: Developer token obtained, Basic Access pending
- **Paving Marketers**: Not yet applied
- **Heaviside**: Not yet applied

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Development workflow
- Commit message conventions
- Pull request process
- Code of conduct

## Development Status

See [project_status.md](./project_status.md) for:
- Recent development activity
- Recent commits
- Files changed recently
- Current branch information

This file is automatically updated daily by the project-status agent.

## License

[License information to be added]

## Support

For questions or issues:
- Open an issue in the repository
- Check existing documentation in `/docs`
- Review the Google Ads API troubleshooting section
