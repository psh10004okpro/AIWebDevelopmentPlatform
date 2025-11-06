'use client';

import { X } from 'lucide-react';
import { useEditorStore } from '@/store/editor';
import { cn } from '@/lib/utils';

export function EditorTabs() {
  const { files, openTabs, activeFileId, setActiveFileId, removeTab } = useEditorStore();

  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-px border-b bg-muted/30 overflow-x-auto">
      {openTabs.map((fileId) => {
        const file = files.find((f) => f.id === fileId);
        if (!file) return null;

        const isActive = fileId === activeFileId;

        return (
          <div
            key={fileId}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r min-w-[120px] max-w-[200px]',
              isActive
                ? 'bg-background border-b-2 border-b-primary'
                : 'bg-muted/50 hover:bg-muted'
            )}
            onClick={() => setActiveFileId(fileId)}
          >
            <span className="truncate flex-1">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(fileId);
              }}
              className="hover:bg-accent rounded p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
