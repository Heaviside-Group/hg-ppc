# Contributing to HG PPC

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a new branch for your feature or bugfix
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start development servers:
   ```bash
   pnpm dev
   ```

3. Make your changes
   - Follow existing code style
   - Add tests for new functionality
   - Ensure all tests pass with `pnpm test`

4. Lint your code:
   ```bash
   pnpm lint
   ```

## Commit Guidelines

- Use descriptive commit messages
- Follow conventional commits format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `refactor:` for code refactoring
  - `test:` for test-related changes

## Pull Request Process

1. Ensure your code passes all tests and linting
2. Update documentation if necessary
3. Open a pull request with a clear description of changes

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Collaborate professionally

## Reporting Issues

- Use GitHub Issues
- Provide detailed information
- Include reproduction steps for bugs
- Specify your environment details