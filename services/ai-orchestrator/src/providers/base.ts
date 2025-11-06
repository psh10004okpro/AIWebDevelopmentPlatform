// AI Provider 기본 인터페이스

export interface CodeGenerationRequest {
  prompt: string;
  language: 'typescript' | 'javascript' | 'react' | 'css' | 'html';
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CodeGenerationResponse {
  code: string;
  explanation?: string;
  model: string;
  tokens?: number;
  duration: number;
}

export abstract class AIProvider {
  abstract generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse>;
  abstract validateApiKey(): boolean;
  abstract get name(): string;
}
