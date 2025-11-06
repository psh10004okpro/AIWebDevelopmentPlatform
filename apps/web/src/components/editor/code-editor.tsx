'use client';

import { useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useEditorStore } from '@/store/editor';
import type { editor } from 'monaco-editor';

export function CodeEditor() {
  const { theme } = useTheme();
  const { files, activeFileId, updateFile } = useEditorStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;

    // 에디터 설정
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      formatOnPaste: true,
      formatOnType: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      tabSize: 2,
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFile(activeFileId, value);
    }
  };

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center h-full bg-secondary/10">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">파일을 선택하세요</p>
          <p className="text-sm text-muted-foreground">
            또는 AI에게 코드 생성을 요청하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={activeFile.language}
        value={activeFile.content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          readOnly: false,
        }}
      />
    </div>
  );
}
