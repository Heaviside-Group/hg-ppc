# HG PPC: Multi-Workspace Advertising Management Platform

## Overview

HG PPC is a comprehensive platform for managing paid advertising across multiple agency MCCs (My Client Center) for Google Ads and Meta Ads. It provides a centralized dashboard for tracking, managing, and analyzing advertising performance across different workspaces.

## Features

- Multi-workspace support for Google Ads and Meta Ads
- Web dashboard for centralized management
- Background workers for data synchronization and insights (TypeScript + Python)
- OAuth integration for secure API access
- Row-Level Security (RLS) for multi-tenant data isolation

## Prerequisites

- Node.js (version 20 or 21)
- pnpm (version 9.x)
- PostgreSQL database (version 16 recommended)
- Redis (for job queues)
- Python 3.11+ (for worker service)
- OAuth credentials for Google Ads and Meta Ads

## Installation

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hg-ppc
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy the root-level environment example:
   ```bash
   cp .env.example .env.local
   ```

   Copy the web app environment example:
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   ```

   Fill in required credentials in both files. At minimum, you'll need:
   - Database connection strings (`DATABASE_URL`, `DATABASE_DIRECT_URL`)
   - Redis URL (`REDIS_URL`)
   - NextAuth secret (`NEXTAUTH_SECRET`)
   - Encryption key (`ENCRYPTION_KEY`)
   - OAuth credentials (see Configuration section below)

4. **Set up the database**
   ```bash
   # Generate Drizzle client types
   pnpm db:generate

   # Push schema to database
   pnpm db:push
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

   This will start:
   - Web dashboard at `http://localhost:3000`
   - Workers will need to be started separately (see Workers section)

### Option 2: Docker Compose

For a complete environment with PostgreSQL and Redis:

```bash
docker-compose up -d
```

This starts all services:
- Web app on port 3000
- Python worker on port 8000
- PostgreSQL on port 5432
- Redis on port 6379

## Development

### Available Scripts

```bash
# Start all development servers
pnpm dev

# Build all applications
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format

# Database operations (uses Drizzle, not Prisma)
pnpm db:generate   # Generate Drizzle client types
pnpm db:migrate    # Run database migrations
pnpm db:push       # Push schema changes to database

# Worker operations (from apps/web)
cd apps/web
pnpm workers:start  # Start TypeScript workers
pnpm workers:dev    # Start TypeScript workers in watch mode
```

### Worker Services

This project has two types of workers:

1. **TypeScript Workers** (in `apps/web/src/workers/`)
   - Sync worker for data synchronization
   - Uses BullMQ for job queues
   - Start with: `pnpm workers:dev` (from apps/web)

2. **Python Worker** (in `apps/worker/`)
   - FastAPI-based service
   - Handles analytics and ML tasks
   - Start with: `uvicorn app.main:app --reload` (from apps/worker)

## Configuration

### Environment Variables

#### Root `.env.local`
```bash
DATABASE_URL=postgresql://hg_ppc:password@localhost:5432/hg_ppc
DATABASE_DIRECT_URL=postgresql://hg_ppc:password@localhost:5432/hg_ppc
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
ENCRYPTION_KEY=your-64-char-hex-string-here

# Google Ads OAuth
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Meta (Facebook) Ads OAuth
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
```

#### Web App `.env.local` (apps/web/.env.local)
For local development with simplified credentials:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-here
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

### OAuth Setup

**Important**: This application does **not** use NextAuth.js. OAuth is implemented with custom handlers for Google Ads and Meta Ads integrations.

For detailed OAuth setup instructions, see:
- [Google Ads API Documentation](docs/google-ads-api.md) - Includes MCC setup, developer tokens, and OAuth configuration

## Project Structure

```
hg-ppc/
├── apps/
│   ├── web/                    # Next.js dashboard application
│   │   ├── src/
│   │   │   ├── app/           # App router pages
│   │   │   ├── lib/           # Utilities and helpers
│   │   │   │   ├── oauth/     # OAuth implementations
│   │   │   │   ├── auth/      # Authentication utilities
│   │   │   │   └── queues/    # Job queue definitions
│   │   │   └── workers/       # TypeScript background workers
│   │   └── package.json
│   └── worker/                # Python FastAPI worker service
│       ├── app/
│       │   ├── workers/       # Background job workers
│       │   ├── integrations/  # API integrations
│       │   └── analytics/     # Analytics and ML
│       ├── pyproject.toml
│       └── requirements.txt
├── packages/
│   └── db/                    # Database package (Drizzle ORM)
│       ├── src/
│       │   ├── schema/        # Database schema definitions
│       │   │   ├── core.ts    # Core tables (workspaces, users)
│       │   │   ├── auth.ts    # Authentication tables
│       │   │   ├── integrations.ts
│       │   │   ├── entities.ts
│       │   │   ├── metrics.ts
│       │   │   └── jobs.ts
│       │   └── migrations/    # Database migrations
│       ├── drizzle.config.ts
│       └── package.json
├── docs/                      # Additional documentation
│   └── google-ads-api.md     # Google Ads API setup guide
├── docker-compose.yml         # Docker compose configuration
├── turbo.json                # Turborepo configuration
└── package.json              # Root package.json
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Caching/Queues**: Redis, BullMQ
- **Workers**: TypeScript (Node.js) + Python (FastAPI)
- **Build Tool**: Turborepo
- **Package Manager**: pnpm 9.x

## Documentation

- [Google Ads API Documentation](docs/google-ads-api.md) - MCC access status, OAuth setup, troubleshooting
- [Project Status](project_status.md) - Recent development activity and context
- [CLAUDE.md](CLAUDE.md) - AI assistant guidance

## Contributing

Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

[License information to be added]

## Support

For support or inquiries, please contact the project maintainers.

## Troubleshooting

### Common Issues

**"Database cannot be accessed during build phase"**
- This is normal during Next.js build. The database client is only initialized at runtime.

**Database connection errors**
- Ensure PostgreSQL is running
- Verify DATABASE_URL in your `.env.local` files
- Check that the database `hg_ppc` exists

**Redis connection errors**
- Ensure Redis is running on the configured port
- Default: `redis://localhost:6379`

**Worker not starting**
- For TypeScript workers: Check that Redis is accessible
- For Python workers: Ensure Python 3.11+ is installed and dependencies are installed

For Google Ads API issues, see the troubleshooting section in [docs/google-ads-api.md](docs/google-ads-api.md).
