# NextGen AI Platform

> An AI-powered web development platform that surpasses Lovable AI

## Overview

NextGen AI Platform is a next-generation web development platform powered by artificial intelligence. It enables developers to build, preview, and deploy web applications faster than ever before with AI-assisted code generation, real-time previews, and an intuitive interface.

## Features

### Phase 1 MVP (완료)
- **AI Code Generation**: Claude 및 OpenAI 지원, 자연어로 코드 생성
- **Monaco Editor**: VS Code와 동일한 강력한 코드 에디터
- **Real-time Preview**: iframe 샌드박스를 통한 실시간 프리뷰
- **Project Management**: 프로젝트 및 파일 CRUD 작업
- **Authentication**: GitHub/Google OAuth 로그인
- **Split View UI**: Vercel v0 스타일의 3패널 레이아웃 (파일 탐색기/에디터/프리뷰)
- **Dark Mode Support**: 라이트/다크 테마 지원
- **Type-Safe**: 전체 코드베이스에 TypeScript strict mode 적용
- **Monorepo Structure**: Turborepo로 최적화된 개발 경험

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
- **Monaco Editor** - VS Code 편집기
- **next-themes** - Dark mode support
- **Zustand** - 상태 관리
- **react-resizable-panels** - 리사이저블 패널

### Backend
- **Express** - Web framework for Node.js
- **TypeScript** - Type-safe backend code
- **PostgreSQL** - Primary database (Prisma ORM)
- **NextAuth.js** - 인증 시스템

### AI Integration
- **Anthropic Claude** - Claude 3.5 Sonnet
- **OpenAI** - GPT-4 Turbo
- **Zod** - 스키마 검증

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
```

환경 변수 설정:
- `ANTHROPIC_API_KEY`: Claude API 키 (필수)
- `OPENAI_API_KEY`: OpenAI API 키 (선택)
- `GITHUB_ID` 및 `GITHUB_SECRET`: GitHub OAuth 앱
- `GOOGLE_ID` 및 `GOOGLE_SECRET`: Google OAuth 앱

4. 데이터베이스 설정:
```bash
# Prisma 마이그레이션
cd packages/database
pnpm db:push

# 시드 데이터 (선택)
pnpm db:seed
```

5. Start the development environment with Docker:
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
- `NEXTAUTH_URL` - NextAuth URL (http://localhost:3000)
- `NEXTAUTH_SECRET` - NextAuth secret key
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `DEFAULT_AI_PROVIDER` - claude 또는 openai (기본값: claude)
- `GITHUB_ID` / `GITHUB_SECRET` - GitHub OAuth credentials
- `GOOGLE_ID` / `GOOGLE_SECRET` - Google OAuth credentials

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

- [x] **Phase 0: Project initialization** ✅
  - Turborepo monorepo 설정
  - Next.js 14 + TypeScript 설정
  - Docker 개발 환경
  - CI/CD 파이프라인

- [x] **Phase 1: MVP 핵심 기능** ✅
  - NextAuth.js 인증 (GitHub/Google OAuth)
  - AI 코드 생성 파이프라인 (Claude + OpenAI)
  - Monaco Editor 통합
  - 파일 탐색기 UI
  - 실시간 프리뷰 시스템 (iframe 샌드박스)
  - 프로젝트 관리 (CRUD)
  - Vercel v0 스타일 스플릿 뷰
  - Prisma + PostgreSQL 데이터베이스

- [ ] **Phase 2: 고급 기능**
  - AI 채팅 인터페이스
  - 코드 리팩토링 제안
  - 자동 테스트 생성
  - Git 통합
  - 협업 기능

- [ ] **Phase 3: 배포 및 호스팅**
  - Vercel/Netlify 배포
  - 커스텀 도메인
  - 환경 변수 관리
  - 로그 및 모니터링

- [ ] **Phase 4: 엔터프라이즈 기능**
  - 팀 관리
  - 역할 기반 접근 제어
  - 사용량 분석
  - 프리미엄 플랜

## Acknowledgments

Built with modern web technologies and inspired by the best practices in the industry.
