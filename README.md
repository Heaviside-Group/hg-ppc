# HG PPC: Multi-Workspace Advertising Management Platform

## Overview

HG PPC is a comprehensive platform for managing paid advertising across multiple agency MCCs (My Client Center) for Google Ads and Meta Ads. It provides a centralized dashboard for tracking, managing, and analyzing advertising performance across different workspaces.

## Features

- Multi-workspace support for Google Ads and Meta Ads
- Web dashboard for centralized management
- Background workers for data synchronization and insights
- OAuth integration for secure API access

## Prerequisites

- Node.js (version 18+)
- pnpm (package manager)
- PostgreSQL database
- OAuth credentials for Google Ads and Meta Ads

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Copy `apps/web/.env.example` to `apps/web/.env.local`
   - Fill in required credentials and configuration

## Development

### Quick Start

```bash
# Start development servers
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

## Configuration

### Environment Variables

Key environment variables are configured in `apps/web/.env.local`. Essential variables include:
- Google Ads Developer Tokens
- OAuth client credentials
- Database connection strings

Refer to `.env.example` for a complete list of required configuration.

## Project Structure

- `apps/web/`: Next.js dashboard application
- `apps/worker/`: Background job processing
- `packages/`: Shared packages and utilities
- `docs/`: Additional documentation

## Documentation

- [Google Ads API Documentation](docs/google-ads-api.md)
- [Project Status](project_status.md)

## Contributing

Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

[License information to be added]

## Contact

For support or inquiries, please contact the project maintainers.