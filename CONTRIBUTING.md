# Contributing to HG PPC

## Welcome

We welcome contributions to the HG PPC project! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new feature branch from `main`
4. Make your changes
5. Run tests and linting
6. Submit a pull request

## Development Setup

### Prerequisites

Ensure you have the following installed:
- Node.js 20 or 21 (not 18 or 22+)
- pnpm 9.x
- PostgreSQL 16+
- Redis 7+
- Python 3.11+ (if working on the Python worker)

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment files:**

   Copy environment examples:
   ```bash
   cp .env.example .env.local
   cp apps/web/.env.local.example apps/web/.env.local
   ```

   Fill in the required environment variables (see README.md)

3. **Set up the database:**
   ```bash
   # Generate Drizzle types
   pnpm db:generate

   # Push schema to database
   pnpm db:push
   ```

4. **Start services:**

   For a quick start with all dependencies:
   ```bash
   docker-compose up -d db redis  # Start database and Redis
   pnpm dev                        # Start Next.js app
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-campaign-filter`
- `fix/oauth-callback-error`
- `docs/update-api-guide`
- `refactor/simplify-worker-queue`

### Commit Messages

Write clear, descriptive commit messages:

✅ Good:
```
fix: resolve OAuth token refresh race condition
feat: add campaign performance filters
docs: update Google Ads API setup guide
```

❌ Bad:
```
fixed bug
updates
wip
```

### Code Style

- Run `pnpm lint` before committing
- Run `pnpm format` to auto-format code with Prettier
- Follow existing code conventions in the project
- Use TypeScript types (avoid `any` when possible)

### Testing

Before submitting a PR:
```bash
# Lint all packages
pnpm lint

# Build to verify no type errors
pnpm build

# Run tests (when available)
pnpm test
```

## Pull Request Process

1. **Update your branch:**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Ensure quality checks pass:**
   - Code lints without errors
   - Builds successfully
   - All tests pass

3. **Update documentation:**
   - If you add features, update README.md
   - If you change APIs, update relevant documentation
   - Add code comments for complex logic

4. **Create the PR:**
   - Provide a clear description of changes
   - Reference any related issues
   - List any breaking changes
   - Include screenshots for UI changes

5. **Review process:**
   - Address reviewer feedback
   - Keep the PR focused (avoid scope creep)
   - Squash commits if requested

## Project Structure Guidelines

### Adding a New Database Table

1. Create or update schema in `packages/db/src/schema/`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:push` to apply changes
4. Update types are automatically available

### Adding a New API Route

1. Create route in `apps/web/src/app/api/`
2. Use the App Router convention (`route.ts`)
3. Implement proper error handling
4. Add authentication checks where needed

### Adding a New Worker Job

**TypeScript Workers:**
1. Define job in `apps/web/src/lib/queues/`
2. Implement processor in `apps/web/src/workers/`
3. Use BullMQ patterns

**Python Workers:**
1. Add worker in `apps/worker/app/workers/`
2. Register in `apps/worker/app/main.py`
3. Follow FastAPI conventions

## Database Conventions

- **Use Drizzle ORM**, not Prisma
- Database commands:
  - `pnpm db:generate` - Generate types from schema
  - `pnpm db:push` - Push schema to database
  - `pnpm db:migrate` - Run migrations
- Always use transactions for multi-step operations
- Use RLS (Row-Level Security) for workspace isolation

## Authentication

- This project uses **custom OAuth**, not NextAuth.js
- OAuth implementations are in `apps/web/src/lib/oauth/`
- Do not add NextAuth.js dependencies

## Environment Variables

- Never commit `.env.local` files
- Update `.env.example` when adding new required variables
- Document new variables in README.md
- Use the `NEXTAUTH_*` prefix for auth-related vars (legacy convention)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy toward other contributors

### Unacceptable Behavior

- Harassment, discrimination, or trolling
- Personal attacks or insults
- Publishing others' private information
- Other unprofessional conduct

### Reporting

If you experience or witness unacceptable behavior, please contact the project maintainers.

## Getting Help

- **Questions?** Open a GitHub Discussion
- **Found a bug?** Open an Issue with reproduction steps
- **Need clarification?** Comment on the relevant PR or Issue

## Additional Resources

- [README.md](README.md) - Setup and installation guide
- [docs/google-ads-api.md](docs/google-ads-api.md) - Google Ads API setup
- [CLAUDE.md](CLAUDE.md) - AI assistant guidance

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to HG PPC! 🎉
