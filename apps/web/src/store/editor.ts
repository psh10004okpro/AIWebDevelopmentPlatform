import { create } from 'zustand';

export interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  template: string;
  files: File[];
}

interface EditorStore {
  // 현재 프로젝트
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;

  // 파일 관리
  files: File[];
  setFiles: (files: File[]) => void;
  addFile: (file: File) => void;
  updateFile: (id: string, content: string) => void;
  deleteFile: (id: string) => void;

  // 현재 열린 파일
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;

  // 탭 관리
  openTabs: string[];
  addTab: (fileId: string) => void;
  removeTab: (fileId: string) => void;

  // AI 생성
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  files: [],
  setFiles: (files) => set({ files }),
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  updateFile: (id, content) =>
    set((state) => ({
      files: state.files.map((file) => (file.id === id ? { ...file, content } : file)),
    })),
  deleteFile: (id) =>
    set((state) => ({
      files: state.files.filter((file) => file.id !== id),
      openTabs: state.openTabs.filter((tabId) => tabId !== id),
      activeFileId: state.activeFileId === id ? null : state.activeFileId,
    })),

  activeFileId: null,
  setActiveFileId: (id) => set({ activeFileId: id }),

  openTabs: [],
  addTab: (fileId) =>
    set((state) => {
      if (!state.openTabs.includes(fileId)) {
        return { openTabs: [...state.openTabs, fileId], activeFileId: fileId };
      }
      return { activeFileId: fileId };
    }),
  removeTab: (fileId) =>
    set((state) => {
      const newTabs = state.openTabs.filter((id) => id !== fileId);
      const newActiveFileId =
        state.activeFileId === fileId
          ? newTabs[newTabs.length - 1] || null
          : state.activeFileId;
      return { openTabs: newTabs, activeFileId: newActiveFileId };
    }),

  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),
}));
