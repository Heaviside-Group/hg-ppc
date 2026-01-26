# Contributing to HG-PPC

Thank you for your interest in contributing to HG-PPC! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

Before you begin, ensure you have:
- Node.js v20.x (< v22)
- pnpm v9.15.1+ (< v10)
- Python 3.11+ (for worker development)
- PostgreSQL 16+ and Redis 7+ (or use Docker Compose)
- Git

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/hg-ppc.git
   cd hg-ppc
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original-org/hg-ppc.git
   ```

4. **Install dependencies**
   ```bash
   pnpm install
   ```

5. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Set up the database**
   ```bash
   # Start services with Docker Compose
   docker-compose up -d db redis

   # Generate and push schema
   pnpm db:generate
   pnpm db:push
   ```

7. **Start development servers**
   ```bash
   pnpm dev
   ```

## Development Workflow

### Creating a New Feature or Fix

1. **Create a feature branch** from `main`
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b feature/your-feature-name
   ```

   Branch naming conventions:
   - `feature/description` - New features
   - `fix/description` - Bug fixes
   - `docs/description` - Documentation updates
   - `refactor/description` - Code refactoring
   - `test/description` - Test additions/updates

2. **Make your changes** following our code standards (see below)

3. **Test your changes**
   ```bash
   # Run linting
   pnpm lint

   # Run tests (when available)
   pnpm test

   # Test locally
   pnpm dev
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "type: concise description of changes"
   ```

   Commit message format:
   - `feat: add new feature`
   - `fix: resolve bug in component`
   - `docs: update README`
   - `refactor: reorganize code structure`
   - `test: add unit tests for service`
   - `chore: update dependencies`

5. **Keep your branch up to date**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** on GitHub
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure all checks pass

## Code Standards

### TypeScript/JavaScript (apps/web, packages/db)

- **Style**: Follow existing code style, enforced by ESLint
- **Formatting**: Run `pnpm format` before committing
- **Types**: Use TypeScript strictly, avoid `any` types
- **Imports**: Use absolute imports from `@/` or `@hg-ppc/`
- **Components**: Use functional components with hooks
- **Server Components**: Prefer React Server Components in Next.js when possible

Example:
```typescript
// Good
export async function getData(): Promise<Data[]> {
  const db = getDb()
  return db.query.data.findMany()
}

// Avoid
export async function getData(): Promise<any> {
  const db = getDb()
  return db.query.data.findMany()
}
```

### Python (apps/worker)

- **Style**: Follow PEP 8 style guide
- **Type Hints**: Use type hints for function signatures
- **Formatting**: Use `black` for code formatting (if configured)
- **Docstrings**: Add docstrings for public functions/classes

Example:
```python
def process_campaign(campaign_id: str) -> dict[str, Any]:
    """Process campaign data and return metrics.

    Args:
        campaign_id: The Google Ads campaign ID

    Returns:
        Dictionary containing campaign metrics
    """
    # Implementation
    pass
```

### Database Schema (packages/db)

- **Migrations**: Always generate migrations for schema changes
  ```bash
  pnpm db:generate
  ```
- **Naming**: Use snake_case for table and column names
- **Relations**: Define relations in the schema for type safety
- **Indexes**: Add indexes for frequently queried columns

### Git Practices

- **Commits**: Make atomic commits with clear messages
- **Branches**: Keep branches focused on a single feature/fix
- **Rebase**: Prefer rebasing over merging for clean history
- **No secrets**: Never commit API keys, passwords, or tokens

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @hg-ppc/web test

# Run tests in watch mode (if configured)
pnpm test --watch
```

### Writing Tests

**Note**: Test infrastructure is defined but test files may not be fully implemented. When adding tests:

- Place tests next to source files: `component.test.tsx`
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies (API calls, database)

## Database Migrations

When making schema changes:

1. **Edit schema files** in `packages/db/src/schema/`
2. **Generate migration**:
   ```bash
   pnpm db:generate
   ```
3. **Review generated migration** in `packages/db/src/migrations/`
4. **Test migration locally**:
   ```bash
   pnpm db:push
   ```
5. **Commit both schema and migration files**

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests pass locally (`pnpm test` and `pnpm lint`)
- [ ] Database migrations are included if schema changed
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes:
1. Step one
2. Step two

## Screenshots
(If applicable)

## Related Issues
Fixes #123
```

### Review Process

1. **Automated checks** must pass (linting, tests)
2. **Code review** by at least one maintainer
3. **Testing** in development environment
4. **Approval** from maintainer(s)
5. **Merge** via squash and merge

## Reporting Issues

### Bug Reports

When reporting bugs, include:
- **Description**: Clear description of the bug
- **Steps to reproduce**: Numbered steps to reproduce
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node version, browser (if relevant)
- **Screenshots**: If applicable
- **Error logs**: Console output or error messages

### Feature Requests

When requesting features:
- **Use case**: Describe the problem you're trying to solve
- **Proposed solution**: How you envision it working
- **Alternatives**: Other solutions you've considered
- **Additional context**: Any other relevant information

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Keep discussions relevant and professional
- Help create a welcoming environment for all contributors

## Questions?

If you have questions about contributing:
- Check existing issues and discussions
- Review project documentation
- Ask in pull request comments
- Contact maintainers

## License

By contributing to HG-PPC, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to HG-PPC! 🚀
