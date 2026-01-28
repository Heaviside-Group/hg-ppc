# HG PPC

Multi-workspace Google Ads + Meta Ads platform for managing paid advertising across multiple agency MCCs.

## Project Overview

HG PPC is a comprehensive dashboard and worker system for managing paid advertising campaigns across multiple Marketing Customer Centers (MCCs) for Google and Meta Ads platforms.

## Features

- Multi-tenant advertising platform
- Google Ads API integration
- Background job processing
- Next.js dashboard application

## Prerequisites

- Node.js (version specified in package.json)
- pnpm package manager
- Google Ads API credentials
- Meta Ads API credentials (optional)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in required credentials in `apps/web/.env.local`

## Development Commands

```bash
# Start all apps in development mode
pnpm dev

# Build all applications
pnpm build

# Run linting
pnpm lint

# Database operations
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run database migrations
pnpm db:push       # Push schema changes
```

## Project Structure

```
hg-ppc/
├── apps/
│   ├── web/          # Next.js dashboard application
│   └── worker/       # Background job workers
├── packages/         # Shared packages
├── docs/             # Documentation
└── turbo.json        # Turborepo configuration
```

## Configuration

Refer to the following files for detailed configuration:
- `.env.example`: Example environment variables
- `docs/google-ads-api.md`: Google Ads API setup and MCC configuration
- `.env.local`: Actual environment configuration (not tracked in git)

## Contributing

Please read the `CONTRIBUTING.md` file for guidelines on contributing to this project.

## License

[License information to be added]

## Status

See `project_status.md` for recent development activity and context.