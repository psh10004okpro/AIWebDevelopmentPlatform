# Contributing to NextGen AI Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a new branch for your feature/fix
4. Make your changes
5. Submit a pull request

## Development Setup

```bash
# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env

# Start development servers
pnpm dev
```

## Code Style

- Use TypeScript strict mode
- Follow the existing code style
- Run `pnpm lint` before committing
- Run `pnpm format` to format your code
- Write meaningful commit messages

## Commit Messages

We follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:
```
feat: add user authentication
fix: resolve API timeout issue
docs: update README with setup instructions
```

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Make sure your code follows the style guide
4. Update CHANGELOG.md if applicable
5. Request review from maintainers

## Code Review

All submissions require review before merging. We'll review:

- Code quality and style
- Test coverage
- Documentation
- Performance implications
- Security considerations

## Questions?

Feel free to open an issue for any questions or concerns.
