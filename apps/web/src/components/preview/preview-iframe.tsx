'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/store/editor';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PreviewIframe() {
  const { files } = useEditorStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);

  useEffect(() => {
    updatePreview();
  }, [files]);

  const updatePreview = () => {
    if (!iframeRef.current) return;

    // 파일에서 HTML, CSS, JS 추출
    const htmlFile = files.find(
      (f) => f.name.endsWith('.html') || f.path.includes('index.html')
    );
    const cssFiles = files.filter((f) => f.language === 'css');
    const jsFiles = files.filter(
      (f) => f.language === 'javascript' || f.language === 'typescript'
    );

    // React 파일인 경우
    const appFile = files.find((f) => f.name === 'App.tsx' || f.name === 'App.jsx');

    let previewHtml = '';

    if (appFile) {
      // React 프리뷰
      previewHtml = generateReactPreview(appFile, cssFiles);
    } else if (htmlFile) {
      // 일반 HTML 프리뷰
      previewHtml = generateHtmlPreview(htmlFile, cssFiles, jsFiles);
    } else {
      previewHtml = `
        <html>
          <body style="display: flex; align-items: center; justify-center; min-height: 100vh; font-family: system-ui;">
            <div style="text-align: center; color: #666;">
              <h2>프리뷰를 사용할 수 없습니다</h2>
              <p>HTML 또는 React 파일을 생성하세요</p>
            </div>
          </body>
        </html>
      `;
    }

    // iframe에 콘텐츠 주입
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(previewHtml);
      iframeDoc.close();

      // 콘솔 로그 캡처
      if (iframe.contentWindow) {
        const originalConsoleLog = iframe.contentWindow.console.log;
        const originalConsoleError = iframe.contentWindow.console.error;

        iframe.contentWindow.console.log = (...args: any[]) => {
          setLogs((prev) => [...prev, `[LOG] ${args.join(' ')}`]);
          originalConsoleLog.apply(iframe.contentWindow?.console, args);
        };

        iframe.contentWindow.console.error = (...args: any[]) => {
          setLogs((prev) => [...prev, `[ERROR] ${args.join(' ')}`]);
          originalConsoleError.apply(iframe.contentWindow?.console, args);
        };
      }
    }
  };

  const generateReactPreview = (appFile: any, cssFiles: any[]) => {
    const cssContent = cssFiles.map((f) => f.content).join('\n');

    return `
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview</title>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>${cssContent}</style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            ${appFile.content}

            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<App />);
          </script>
        </body>
      </html>
    `;
  };

  const generateHtmlPreview = (htmlFile: any, cssFiles: any[], jsFiles: any[]) => {
    const cssContent = cssFiles.map((f) => f.content).join('\n');
    const jsContent = jsFiles.map((f) => f.content).join('\n');

    let html = htmlFile.content;

    // CSS 삽입
    if (cssContent) {
      html = html.replace('</head>', `<style>${cssContent}</style></head>`);
    }

    // JS 삽입
    if (jsContent) {
      html = html.replace('</body>', `<script>${jsContent}</script></body>`);
    }

    return html;
  };

  const handleRefresh = () => {
    setLogs([]);
    updatePreview();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 프리뷰 툴바 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">프리뷰</span>
          <span className="text-xs text-muted-foreground">localhost:3000</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowConsole(!showConsole)}>
            콘솔 {logs.length > 0 && `(${logs.length})`}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* iframe 프리뷰 */}
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="preview"
        />
      </div>

      {/* 콘솔 */}
      {showConsole && (
        <div className="h-48 border-t bg-black text-green-400 font-mono text-xs p-2 overflow-auto">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          {logs.length === 0 && <div className="text-gray-500">콘솔이 비어있습니다</div>}
        </div>
      )}
    </div>
  );
}
