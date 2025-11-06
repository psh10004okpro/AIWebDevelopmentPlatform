// Common types for the AI Web Development Platform

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface AIRequest {
  prompt: string;
  context?: Record<string, unknown>;
  model?: string;
}

export interface AIResponse {
  content: string;
  code?: string;
  metadata?: Record<string, unknown>;
}

export interface CodeGenerationRequest {
  prompt: string;
  framework?: string;
  language?: string;
  projectId: string;
}

export interface CodeGenerationResponse {
  code: string;
  files: GeneratedFile[];
  preview?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}
