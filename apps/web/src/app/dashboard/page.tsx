'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Plus, Folder, Calendar, FileText, Sparkles } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  template: string;
  updatedAt: string;
  _count: {
    files: number;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status, router]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('프로젝트 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Project',
          description: 'A new React project',
          template: 'react',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/editor?project=${data.project.id}`);
      }
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NextGen AI Platform</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-2 ml-4">
              <img
                src={session?.user?.image || ''}
                alt={session?.user?.name || ''}
                className="h-8 w-8 rounded-full"
              />
              <span className="text-sm">{session?.user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">내 프로젝트</h1>
            <p className="text-muted-foreground mt-1">
              AI로 웹 애플리케이션을 빠르게 개발하세요
            </p>
          </div>
          <Button onClick={handleCreateProject} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            새 프로젝트
          </Button>
        </div>

        {/* 프로젝트 그리드 */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg">
            <Folder className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">프로젝트가 없습니다</h3>
            <p className="text-muted-foreground mb-6">
              새 프로젝트를 만들어서 시작하세요
            </p>
            <Button onClick={handleCreateProject}>
              <Plus className="mr-2 h-4 w-4" />
              첫 프로젝트 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/editor?project=${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <Folder className="h-8 w-8 text-blue-500" />
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
                    {project.template}
                  </span>
                </div>

                <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {project.description || '설명이 없습니다'}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{project._count.files} 파일</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(project.updatedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
