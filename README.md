# hg-ppc: Multi-Workspace Google & Meta Ads Platform

## Project Overview
hg-ppc is a multi-workspace platform for managing and optimizing Google and Meta (Facebook) Ads campaigns across different workspaces.

## Features
- Integrate with Google Ads API
- Integrate with Meta (Facebook) Ads API
- Multi-workspace campaign management
- Worker-based architecture for background processing

## Prerequisites
- Node.js (v20.x - v21.x)
- pnpm (v9.x)
- PostgreSQL database
- Redis

## Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Configuration
Copy `.env.example` to `.env` and fill in the required credentials:
- Database connection details
- Redis URL
- Google Ads OAuth credentials
- Meta Ads OAuth credentials
- Authentication secrets

## Development
Run development server:
```bash
pnpm dev
```

## Available Scripts
- `pnpm dev`: Start development server
- `pnpm build`: Build the project
- `pnpm test`: Run tests
- `pnpm lint`: Run linter
- `pnpm db:generate`: Generate database schema
- `pnpm db:migrate`: Run database migrations
- `pnpm db:push`: Push database schema changes

## Project Structure
- `apps/`: Application workspaces
- `packages/`: Shared packages
- `docs/`: Project documentation

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License
[License information to be added]

## Development Status
See [project_status.md](./project_status.md) for recent development activity and context.