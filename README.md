# HG PPC: Multi-Workspace Google Ads + Meta Ads Platform

## Project Overview

HG PPC is a comprehensive platform for managing paid advertising across multiple agency Multi-Client Centers (MCCs) with a focus on Google Ads and Meta Ads integrations.

## Features

- Multi-tenant MCC management
- Dashboard for advertising insights
- Background workers for data synchronization
- Supports Google Ads API integration
- Monorepo architecture with Turborepo

## Prerequisites

- Node.js 20.x
- pnpm 9.x
- PostgreSQL database

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
- Copy `apps/web/.env.example` to `apps/web/.env.local`
- Fill in required credentials (Google Ads Developer Tokens, OAuth details)

## Development

```bash
# Start development servers
pnpm dev

# Build the project
pnpm build

# Run linters
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

Key configuration details are available in:
- `CLAUDE.md`: Project guidelines and essential commands
- `docs/google-ads-api.md`: Google Ads API setup and MCC status
- `.env.example`: Environment variable templates

## Contributing

Please read `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

## License

[Insert License Information]

## Acknowledgments

- [List key dependencies or inspirations]