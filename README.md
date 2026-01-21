# HG PPC: Multi-Workspace Advertising Management Platform

## Overview

HG PPC is a comprehensive platform for managing paid advertising across multiple agency MCCs, specifically supporting Google Ads and Meta Ads integrations.

## Project Structure

```
hg-ppc/
├── apps/
│   ├── web/          # Next.js dashboard application
│   └── worker/       # Background job workers
├── packages/         # Shared packages
├── docs/             # Project documentation
└── turbo.json        # Turborepo configuration
```

## Prerequisites

- Node.js (recommended version: latest LTS)
- pnpm (package manager)
- PostgreSQL database
- Redis

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in required configuration (see Environment Variables section)

## Configuration

### Required Environment Variables

Key environment variables to configure:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection URL
- `NEXTAUTH_SECRET`: Authentication secret
- `GOOGLE_ADS_DEVELOPER_TOKEN`: Google Ads developer token
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `META_APP_ID` & `META_APP_SECRET`: Meta Ads OAuth credentials

Refer to `.env.example` for a complete list of required variables.

## Development

### Essential Commands

```bash
# Start development servers
pnpm dev

# Build the project
pnpm build

# Run linters
pnpm lint

# Database operations
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run migrations
pnpm db:push       # Push schema changes
```

## Documentation

- Detailed Google Ads API configuration: `docs/google-ads-api.md`
- Project status and recent activity: `project_status.md`

## Contributing

Please read `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

## License

[License information to be added]

## Contact

For questions or support, please [add contact information]