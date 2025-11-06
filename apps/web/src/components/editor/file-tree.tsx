'use client';

import { File, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { useEditorStore } from '@/store/editor';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  fileId?: string;
}

export function FileTree() {
  const { files, activeFileId, addTab } = useEditorStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['/src', '/app'])
  );

  // 파일 목록을 트리 구조로 변환
  const buildFileTree = (): FileNode[] => {
    const root: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    files.forEach((file) => {
      const parts = file.path.split('/').filter((p) => p);
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath += '/' + part;
        const isFile = index === parts.length - 1;

        if (!folderMap.has(currentPath)) {
          const node: FileNode = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            fileId: isFile ? file.id : undefined,
          };

          if (index === 0) {
            root.push(node);
          } else {
            const parentPath = '/' + parts.slice(0, index).join('/');
            const parent = folderMap.get(parentPath);
            if (parent && parent.children) {
              parent.children.push(node);
            }
          }

          folderMap.set(currentPath, node);
        }
      });
    });

    return root;
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = (fileId: string) => {
    addTab(fileId);
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = node.fileId === activeFileId;

    return (
      <div key={node.path}>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent text-sm',
            isActive && 'bg-accent text-accent-foreground',
            level > 0 && 'pl-' + (level * 4 + 2)
          )}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else if (node.fileId) {
              handleFileClick(node.fileId);
            }
          }}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {node.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.type === 'folder' && isExpanded && node.children && (
          <div>{node.children.map((child) => renderNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

  const fileTree = buildFileTree();

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        파일이 없습니다
      </div>
    );
  }

  return <div className="py-2">{fileTree.map((node) => renderNode(node))}</div>;
}
