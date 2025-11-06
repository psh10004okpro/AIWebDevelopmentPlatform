import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@nextgen-ai-platform/database';
import { z } from 'zod';

// 프로젝트 생성 스키마
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  template: z.string().default('react'),
});

// GET: 사용자의 프로젝트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        _count: {
          select: { files: true },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('프로젝트 조회 실패:', error);
    return NextResponse.json(
      { error: '프로젝트를 불러오는데 실패했습니다' },
      { status: 500 }
    );
  }
}

// POST: 새 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateProjectSchema.parse(body);

    // 프로젝트 생성
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        template: validatedData.template,
        userId: session.user.id,
        files: {
          create: getTemplateFiles(validatedData.template),
        },
      },
      include: {
        files: true,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('프로젝트 생성 실패:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 형식', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '프로젝트 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}

// 템플릿별 기본 파일 생성
function getTemplateFiles(template: string) {
  const templates: Record<string, any[]> = {
    react: [
      {
        name: 'App.tsx',
        path: '/src/App.tsx',
        language: 'typescript',
        content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to React</h1>
        <p>Start editing to see changes!</p>
      </header>
    </div>
  );
}

export default App;
`,
      },
      {
        name: 'index.tsx',
        path: '/src/index.tsx',
        language: 'typescript',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      },
      {
        name: 'App.css',
        path: '/src/App.css',
        language: 'css',
        content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}
`,
      },
    ],
    nextjs: [
      {
        name: 'page.tsx',
        path: '/app/page.tsx',
        language: 'typescript',
        content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to Next.js</h1>
      <p className="mt-4">Start editing to see changes!</p>
    </main>
  );
}
`,
      },
      {
        name: 'layout.tsx',
        path: '/app/layout.tsx',
        language: 'typescript',
        content: `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
`,
      },
    ],
  };

  return templates[template] || templates.react;
}
