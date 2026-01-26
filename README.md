# HG-PPC: Multi-Workspace Google Ads + Meta Ads Platform

## Overview
HG-PPC is a multi-workspace platform designed to manage and synchronize advertising campaigns across Google Ads and Meta Ads platforms.

## Project Status
See [project_status.md](./project_status.md) for recent development activity and context.

## Prerequisites
- Node.js: v20.x (< v22)
- pnpm: v9.x (< v10)

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

## Development

### Running the Project
```bash
# Start development servers
pnpm dev

# Build the project
pnpm build

# Run tests
pnpm test
```

### Database Operations
```bash
# Generate database schema
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Push database schema changes
pnpm db:push
```

## Project Structure
- `apps/`: Application workspaces
- `packages/`: Shared package workspaces
- `docs/`: Documentation files

## Contributing
Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License
[Add license information here]