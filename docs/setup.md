# Development Setup Guide

## Prerequisites

- **Node.js**: v20 or v21 (see `engines` in package.json)
- **pnpm**: v9.x (`npm install -g pnpm@9`)
- **Python**: 3.11 or higher
- **PostgreSQL**: 14+
- **Redis**: 6+ (for BullMQ job queue)

## Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd hg-ppc

# Install Node.js dependencies
pnpm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb hg_ppc

# Set DATABASE_URL in .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
```

#### Option B: Docker Compose (Recommended)

The project includes a `docker-compose.yml` for PostgreSQL + Redis:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Redis Setup

#### Option A: Local Redis

```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Verify
redis-cli ping  # Should return PONG
```

#### Option B: Docker (included in docker-compose.yml)

```bash
docker-compose up -d redis
```

### 4. Environment Variables

Copy example files:

```bash
# Root .env
cp .env.example .env.local

# Web app
cp apps/web/.env.local.example apps/web/.env.local

# Worker
cp apps/worker/.env.example apps/worker/.env
```

Edit the files with your actual values:

**Root `.env.local`**:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
REDIS_URL=redis://localhost:6379
```

**`apps/web/.env.local`**:
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc
DATABASE_DIRECT_URL=postgresql://postgres:postgres@localhost:5432/hg_ppc

# Redis
REDIS_URL=redis://localhost:6379

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here

# Encryption (generate: openssl rand -hex 32)
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

**Generate a secure encryption key**:
```bash
openssl rand -hex 32
```

### 5. Database Schema

Push the schema to your database:

```bash
# Generate Drizzle client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Or run migrations (production)
pnpm db:migrate
```

Verify tables were created:
```bash
psql hg_ppc -c "\dt"
```

You should see tables like: `workspaces`, `users`, `integrations`, `ad_accounts`, etc.

### 6. Python Worker Setup

```bash
cd apps/worker

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print(fastapi.__version__)"
```

## Running the Application

### Option 1: All-in-One (Development)

```bash
# From project root
pnpm dev
```

This starts the Next.js app on http://localhost:3000

### Option 2: Individual Services

Terminal 1 - Web App:
```bash
cd apps/web
pnpm dev
```

Terminal 2 - TypeScript Workers:
```bash
cd apps/web
pnpm workers:dev
```

Terminal 3 - Python Workers:
```bash
cd apps/worker
source venv/bin/activate
python -m app.main
```

## Verification

### Check Web App
Open http://localhost:3000 - you should see the dashboard (auth screen if not logged in)

### Check Database Connection
```bash
pnpm db:studio
```

This opens Drizzle Studio to browse your database.

### Check Redis Connection
```bash
redis-cli
> PING
# Should return: PONG
```

### Check Python Worker
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

## Google Ads API Setup (Optional)

To enable Google Ads integration:

1. **Apply for API Access** - See [docs/google-ads-api.md](./google-ads-api.md)

2. **Create OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a project
   - Enable Google Ads API
   - Create OAuth 2.0 credentials (Web application)
   - Add redirect URI: `http://localhost:3000/api/auth/callback/google`

3. **Add to `.env.local`**:
   ```bash
   GOOGLE_ADS_DEVELOPER_TOKEN=your-token-here
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

4. **OAuth Flow**: Connect an MCC through the dashboard UI

## Meta Ads API Setup (Optional)

Similar process for Meta:

1. Create Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Enable Marketing API
3. Get App ID and Secret
4. Add to `.env.local`

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
psql "$DATABASE_URL" -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Check URL format
# Should be: redis://localhost:6379 or redis://host:port
```

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Python Dependencies

If you have issues with `google-ads` package:

```bash
pip install --upgrade google-ads
```

### Database Migrations

If schema is out of sync:

```bash
# Reset database (WARNING: destroys data)
pnpm db:push --force

# Or drop and recreate
dropdb hg_ppc
createdb hg_ppc
pnpm db:push
```

## Next Steps

1. **Create Test Data**: Use Drizzle Studio or seed scripts
2. **Connect an Integration**: Follow OAuth flow for Google or Meta
3. **Run a Sync Job**: Trigger data fetch from the dashboard
4. **View Metrics**: Check the dashboard for campaign data

## Development Tips

- Use `pnpm` for all package management (not npm or yarn)
- Changes to database schema require `pnpm db:generate` + `pnpm db:push`
- TypeScript errors? Run `pnpm build` to check for issues
- Python errors? Check virtual environment is activated
- Use Drizzle Studio (`pnpm db:studio`) to inspect database

## Production Deployment

See deployment docs (TBD) for:
- Docker deployment
- Environment variable management
- Database migrations
- Secrets management (OAuth tokens)
