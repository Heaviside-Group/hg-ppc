# Architecture Overview

## System Design

HG PPC is a multi-tenant advertising management platform built as a monorepo using Turborepo. The system consists of a Next.js web application, a Python worker service, and a shared PostgreSQL database.

## Tech Stack

### Frontend (apps/web)
- **Framework**: Next.js 15 with App Router
- **UI**: React 19, TypeScript, Tailwind CSS
- **Auth**: NextAuth.js
- **Database Client**: Drizzle ORM

### Backend Worker (apps/worker)
- **Framework**: Python 3.11+ with FastAPI
- **Database**: SQLAlchemy (for Python)
- **Ads SDKs**:
  - Google Ads API (`google-ads>=24.0.0`)
  - Meta Ads API
- **Analytics**: pandas, numpy, scikit-learn

### Shared Infrastructure
- **Database**: PostgreSQL (via Drizzle ORM)
- **Job Queue**: BullMQ with Redis
- **Encryption**: AES-256-GCM for OAuth tokens

## Database Schema

The database uses Drizzle ORM with the following key tables:

### Core Tables (`packages/db/src/schema/core.ts`)
- **workspaces** - Tenant isolation (e.g., "Garage Door Marketers")
- **users** - Application users
- **workspace_memberships** - User-workspace access with roles (owner, admin, analyst, viewer)
- **clients** - Businesses managed within a workspace
- **workspace_insights** - Cached AI-generated analytics

### Integration Tables (`packages/db/src/schema/integrations.ts`)
- **integrations** - OAuth connections per workspace (Google Ads, Meta)
- **integration_credentials** - Encrypted OAuth tokens (AES-256-GCM)
- **ad_accounts** - Connected advertising accounts linked to clients

### Metrics Tables (`packages/db/src/schema/metrics.ts`)
- Campaign performance data
- Daily aggregated metrics
- Historical trends

### Jobs Tables (`packages/db/src/schema/jobs.ts`)
- Background job tracking
- Sync status and error logs

## Data Flow

### 1. OAuth Setup
```
User → Web App → OAuth Flow → Google/Meta → Tokens
                                                ↓
                                          Encrypted Storage
                                                ↓
                                    integration_credentials table
```

### 2. Data Sync (BullMQ Jobs)
```
Scheduler → BullMQ → Python Worker → Decrypt Tokens
                           ↓
                     Fetch Ads Data (Google/Meta API)
                           ↓
                     Transform & Store
                           ↓
                   PostgreSQL (metrics tables)
```

### 3. Dashboard Display
```
User → Next.js App → Drizzle Query → PostgreSQL
                          ↓
                   Format & Display
                          ↓
                    Dashboard UI
```

## Worker Architecture

The Python worker (`apps/worker`) handles:

1. **Data Synchronization** (`app/workers/sync_worker.py`)
   - Fetches campaign data from Google Ads API
   - Fetches ad data from Meta Ads API
   - Stores in metrics tables

2. **Mutations** (`app/workers/mutation_worker.py`)
   - Applies campaign changes (pause/resume, budget updates)
   - Executes through respective APIs

3. **Analytics** (`app/workers/insights_worker.py`)
   - Generates AI insights using ML models
   - Detects anomalies and trends
   - Stores in workspace_insights table

4. **Heartbeat** (`app/workers/heartbeat.py`)
   - Health check for worker status
   - Reports to web app

### Integration Clients

- **Google Ads** (`app/integrations/google_ads/`)
  - `client.py` - API client initialization
  - `sync.py` - Data fetching logic
  - `mutations.py` - Campaign mutations

- **Meta Ads** (`app/integrations/meta_ads/`)
  - Similar structure for Facebook/Instagram ads

## Security

### Token Encryption
OAuth tokens are encrypted using AES-256-GCM:
- Encryption key stored in `ENCRYPTION_KEY` env var (32-byte hex)
- Each token has unique IV (initialization vector)
- Auth tags for verification
- Tokens are decrypted on-demand by workers

### Multi-Tenancy
- Row-Level Security (RLS) via workspace isolation
- All queries filtered by `workspaceId`
- Users access workspaces through memberships
- See `rls_policies.sql` for PostgreSQL RLS policies

### Role-Based Access Control (RBAC)
- **Owner**: Full workspace control
- **Admin**: Manage users and integrations
- **Analyst**: View and modify campaigns
- **Viewer**: Read-only access

## Deployment

### Docker Support
- `apps/web/Dockerfile` - Next.js production build
- `apps/web/Dockerfile.worker` - TypeScript BullMQ workers (web context)
- `apps/worker/Dockerfile` - Python FastAPI service

### Environment Configuration
See `.env.example`, `apps/web/.env.local.example`, and `apps/worker/.env.example` for required variables.

## Job Queue (BullMQ)

Jobs are managed through BullMQ with Redis:

1. **Sync Jobs** - Scheduled data pulls (hourly/daily)
2. **Mutation Jobs** - Campaign changes (immediate)
3. **Insight Jobs** - Analytics generation (daily)
4. **Heartbeat Jobs** - Worker health checks (every minute)

Job definitions in `apps/web/src/queues/` and executed by workers in both contexts.

## API Routes

Next.js API routes (`apps/web/src/app/api/`):
- Auth endpoints (NextAuth)
- Dashboard data endpoints
- Integration management (OAuth, account linking)
- Job triggering and status

## Development Workflow

1. **Start services**:
   ```bash
   pnpm dev  # Starts web app on :3000
   ```

2. **Run workers separately**:
   ```bash
   # TypeScript workers (from web context)
   cd apps/web
   pnpm workers:dev

   # Python workers
   cd apps/worker
   python -m app.main
   ```

3. **Database changes**:
   ```bash
   # Modify schema in packages/db/src/schema/
   pnpm db:generate  # Generate migration
   pnpm db:push      # Apply to database
   ```

## Testing

- **Frontend**: React Testing Library (TBD)
- **Backend**: pytest for Python workers
- **Integration**: End-to-end with actual API sandbox accounts

## Future Enhancements

- Real-time dashboard updates (WebSockets)
- Advanced ML-powered bid optimization
- Automated report generation (PDF/email)
- Multi-channel attribution
- Budget pacing alerts
