'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileTree } from '@/components/editor/file-tree';
import { CodeEditor } from '@/components/editor/code-editor';
import { EditorTabs } from '@/components/editor/editor-tabs';
import { PreviewIframe } from '@/components/preview/preview-iframe';
import { AIPromptPanel } from '@/components/ai/ai-prompt-panel';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sparkles, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
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
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NextGen AI</span>
          </div>
          <div className="text-sm text-muted-foreground">/ My Project</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            설정
          </Button>
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
      </header>

      {/* 메인 에디터 영역 */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* 왼쪽 사이드바 - 파일 탐색기 */}
          <Panel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full flex flex-col border-r">
              <div className="px-4 py-3 border-b">
                <h2 className="font-semibold text-sm">파일 탐색기</h2>
              </div>
              <div className="flex-1 overflow-auto">
                <FileTree />
              </div>
              <AIPromptPanel />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 hover:bg-primary/20 transition-colors" />

          {/* 중앙 - 코드 에디터 */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <EditorTabs />
              <div className="flex-1">
                <CodeEditor />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 hover:bg-primary/20 transition-colors" />

          {/* 오른쪽 - 프리뷰 */}
          <Panel defaultSize={30} minSize={20}>
            <PreviewIframe />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
