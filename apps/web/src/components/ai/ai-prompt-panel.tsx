'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { useEditorStore } from '@/store/editor';
import { toast } from 'sonner';
import { CostEstimator } from './cost-estimator';

export function AIPromptPanel() {
  const [prompt, setPrompt] = useState('');
  const [sessionId] = useState(`session-${Date.now()}`);
  const { isGenerating, setIsGenerating, addFile } = useEditorStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('프롬프트를 입력하세요');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          language: 'react',
          sessionId,
          useRAG: true,
        }),
      });

      if (!response.ok) {
        throw new Error('코드 생성 실패');
      }

      const data = await response.json();

      if (data.success) {
        // 생성된 코드를 새 파일로 추가
        const newFile = {
          id: `generated-${Date.now()}`,
          name: 'Generated.tsx',
          path: '/src/Generated.tsx',
          content: data.data.code,
          language: 'typescript',
        };

        addFile(newFile);
        toast.success('코드가 생성되었습니다!');
        setPrompt('');
      }
    } catch (error) {
      console.error('생성 오류:', error);
      toast.error('코드 생성 중 오류가 발생했습니다');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="border-t p-4 bg-card">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI 코드 생성</h3>
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="어떤 코드를 생성할까요? (예: 버튼 컴포넌트를 만들어줘)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={isGenerating}
          />
          <CostEstimator prompt={prompt} />
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              코드 생성
            </>
          )}
        </Button>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            자연어로 요청하면 AI가 코드를 생성합니다
          </p>
          <p className="text-xs text-muted-foreground">
            ✨ RAG 기반 문서 검색 활성화됨
          </p>
        </div>
      </div>
    </div>
  );
}
