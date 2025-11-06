# NextGen AI Platform

> An AI-powered web development platform that surpasses Lovable AI

## Overview

NextGen AI Platform is a next-generation web development platform powered by artificial intelligence. It enables developers to build, preview, and deploy web applications faster than ever before with AI-assisted code generation, real-time previews, and an intuitive interface.

## Features

- **AI Code Generation**: Generate production-ready code using advanced AI models
- **Real-time Preview**: See your changes instantly with our live preview engine
- **Microservices Architecture**: Scalable, maintainable, and modular design
- **Modern Tech Stack**: Built with Next.js 14, React 18, TypeScript, and Tailwind CSS
- **Dark Mode Support**: Beautiful UI with light and dark themes
- **Type-Safe**: Strict TypeScript configuration across the entire codebase
- **Monorepo Structure**: Organized with Turborepo for optimal developer experience

## Project Structure

```
nextgen-ai-platform/
├── apps/
│   ├── web/              # Next.js frontend application
│   └── api/              # Express API Gateway
├── services/
│   ├── ai-orchestrator/  # AI service orchestration
│   ├── code-generator/   # Code generation engine
│   └── preview-engine/   # Live preview server
├── packages/
│   ├── types/           # Shared TypeScript types
│   ├── utils/           # Common utilities
│   └── typescript-config/ # Shared TS configs
└── infrastructure/      # Docker & K8s configuration
```

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety (strict mode)
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library
- **next-themes** - Dark mode support

### Backend
- **Express** - Web framework for Node.js
- **TypeScript** - Type-safe backend code
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage

### DevOps
- **Turborepo** - Monorepo build system
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **pnpm** - Fast, disk space efficient package manager

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose (for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nextgen-ai-platform.git
cd nextgen-ai-platform
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

4. Start the development environment with Docker:
```bash
docker-compose up -d
```

Or run services individually:
```bash
# Terminal 1 - Web app
cd apps/web
pnpm dev

# Terminal 2 - API server
cd apps/api
pnpm dev

# Terminal 3 - AI Orchestrator
cd services/ai-orchestrator
pnpm dev
```

5. Open your browser:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- AI Orchestrator: http://localhost:3002

### Development

```bash
# Run all apps in development mode
pnpm dev

# Build all apps
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format

# Clean all build artifacts
pnpm clean
```

## Architecture

### Microservices

1. **Web App** (Port 3000)
   - Next.js frontend application
   - User interface and interactions
   - Server-side rendering

2. **API Gateway** (Port 3001)
   - Express-based REST API
   - Authentication & authorization
   - Request routing

3. **AI Orchestrator** (Port 3002)
   - Coordinates AI model requests
   - Manages AI provider integrations
   - Request queuing and rate limiting

4. **Code Generator** (Port 3003)
   - Generates code from AI prompts
   - Template management
   - Code validation

5. **Preview Engine** (Port 3004)
   - Real-time code preview
   - Sandboxed execution environment
   - Live updates

### Data Flow

```
User → Web App → API Gateway → Services (AI/Code/Preview) → Response
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)
- `JWT_SECRET` - Secret for JWT token generation

## Docker

### Development
```bash
docker-compose up
```

### Production Build
```bash
docker-compose -f docker-compose.prod.yml up
```

## CI/CD

The project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline** (`.github/workflows/ci.yml`)
  - Runs on every push and pull request
  - Executes linting, type checking, and builds

- **Deploy Pipeline** (`.github/workflows/deploy.yml`)
  - Runs on push to main branch
  - Deploys to production environment

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run all tests |
| `pnpm clean` | Remove all build artifacts |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code Style

- We use ESLint and Prettier for code formatting
- TypeScript strict mode is enabled
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features

## License

MIT

## Support

For support, email support@nextgen-ai-platform.com or open an issue on GitHub.

## Roadmap

- [ ] Phase 0: Project initialization ✅
- [ ] Phase 1: Authentication system
- [ ] Phase 2: AI integration
- [ ] Phase 3: Code generation engine
- [ ] Phase 4: Real-time preview
- [ ] Phase 5: Deployment pipeline
- [ ] Phase 6: Advanced features

## Acknowledgments

Built with modern web technologies and inspired by the best practices in the industry.
