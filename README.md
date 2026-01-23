# hg-ppc

A multi-workspace Google Ads and Meta Ads platform for managing digital advertising campaigns.

## Project Overview

hg-ppc is a comprehensive platform designed to streamline digital advertising management across Google Ads and Meta Ads platforms. It provides a unified interface for managing multiple ad campaigns and workspaces.

## Project Status

Current development status is tracked in [project_status.md](./project_status.md).

## Prerequisites

- Node.js v20.x
- pnpm v9.x

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

## Development

### Running the Project

Start development server:
```bash
pnpm dev
```

### Available Scripts

- `pnpm dev`: Start development servers
- `pnpm build`: Build the project
- `pnpm lint`: Run linting
- `pnpm test`: Run tests
- `pnpm clean`: Remove build artifacts and node_modules

### Database Operations

- `pnpm db:generate`: Generate database types
- `pnpm db:migrate`: Run database migrations
- `pnpm db:push`: Push database schema changes

## Project Structure

- `apps/`: Application workspaces
  - `web/`: Web application
  - `worker/`: Background worker services
- `packages/`: Shared packages and utilities

## Environment

The project uses Turbo for monorepo management and supports the following environments:
- Node.js v20.x
- pnpm v9.x

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

[LICENSE file to be added]