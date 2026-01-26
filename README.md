# HG-PPC: Multi-Workspace Google Ads + Meta Ads Platform

## Overview
HG-PPC is a multi-workspace platform for managing advertising campaigns across Google Ads and Meta Ads platforms. Built as a Turborepo monorepo with Next.js frontend, Python worker services, and PostgreSQL + Redis backend.

## Project Status
See [project_status.md](./project_status.md) for recent development activity and context.

## Prerequisites
- **Node.js**: v20.x (< v22) - specified in `package.json` engines
- **pnpm**: v9.15.1+ (< v10) - specified in `packageManager` field
- **Python**: 3.11+ (for worker services)
- **PostgreSQL**: 16+ (database)
- **Redis**: 7+ (caching and job queues)

## Architecture

### Monorepo Structure
```
hg-ppc/
├── apps/
│   ├── web/          # Next.js 15 dashboard (TypeScript)
│   └── worker/       # Python FastAPI workers for background jobs
├── packages/
│   └── db/           # Shared Drizzle ORM database schema
├── docs/             # Documentation
│   └── google-ads-api.md  # Google Ads API setup & MCC status
└── turbo.json        # Turborepo configuration
```

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend Workers**: Python 3.11, FastAPI, BullMQ
- **Database**: PostgreSQL with Drizzle ORM
- **Cache & Jobs**: Redis, BullMQ
- **Authentication**: Email-code based (custom, not NextAuth)
- **Deployment**: Docker, Docker Compose

## Installation

1. Clone the repository
```bash
git clone https://github.com/your-org/hg-ppc.git
cd hg-ppc
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your credentials
```

See [ENVIRONMENT.md](./ENVIRONMENT.md) for detailed environment variable configuration.

4. Set up the database
```bash
# Generate Drizzle schema
pnpm db:generate

# Push schema to database
pnpm db:push
```

## Development

### Running the Project

#### Using pnpm (recommended for development)
```bash
# Start all development servers (web + worker via Turborepo)
pnpm dev

# Start only the web app
pnpm --filter @hg-ppc/web dev

# Build all apps
pnpm build

# Lint all packages
pnpm lint
```

#### Using Docker Compose
```bash
# Start all services (web, worker, db, redis)
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Database Operations
```bash
# Generate Drizzle schema and types
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Push schema changes to database (development)
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm --filter @hg-ppc/db db:studio
```

### Worker Services

The Python worker app runs background jobs for:
- Campaign data synchronization
- Performance metrics collection
- AI/ML optimization tasks
- Automated reporting

Worker scripts in `apps/web/src/workers/` handle TypeScript-side job queue management.

## Project Structure

### Apps
- **`apps/web/`** - Next.js dashboard application
  - Authentication (email-code based)
  - Campaign management UI
  - Google Ads & Meta integration
  - Reporting dashboards

- **`apps/worker/`** - Python FastAPI worker service
  - Background job processing
  - Google Ads API integration
  - ML/analytics processing

### Packages
- **`packages/db/`** - Shared Drizzle ORM database schema
  - Schema definitions in `src/schema/`
  - Migration files in `src/migrations/`

### Documentation
- **`docs/google-ads-api.md`** - Google Ads API setup and MCC account status

## Authentication

This project uses a **custom email-code authentication system** (not NextAuth).

Key features:
- Email domain restriction (`@garagedoormarketers.com` by default)
- 6-digit verification codes sent via AWS SES
- JWT-based session tokens
- Server-side session validation

Auth code: `apps/web/src/lib/auth/`

## Google Ads Integration

See [docs/google-ads-api.md](./docs/google-ads-api.md) for:
- MCC account access status
- Developer token setup
- OAuth configuration per MCC
- API access level requirements

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## Testing

```bash
# Run all tests
pnpm test

# Note: Test infrastructure is defined but test files may not be fully implemented yet
```

## Deployment

The project includes Docker configurations for containerized deployment:

- **Web**: `apps/web/Dockerfile`
- **Worker**: `apps/worker/Dockerfile`
- **Full stack**: `docker-compose.yml`

Health checks are configured for all services.

## License

[Add license information here]
