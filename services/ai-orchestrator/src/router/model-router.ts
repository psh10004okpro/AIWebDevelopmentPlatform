import { AIProvider } from '../providers/base';
import { ClaudeProvider } from '../providers/claude';
import { OpenAIProvider } from '../providers/openai';

/**
 * 작업 유형별 모델 라우팅 (Vercel v0 패턴)
 */

export enum TaskComplexity {
  SIMPLE = 'simple', // 간단한 컴포넌트, UI 요소
  MEDIUM = 'medium', // 일반적인 기능
  COMPLEX = 'complex', // 복잡한 로직, 알고리즘
  REFACTOR = 'refactor', // 리팩토링
  EXPLAIN = 'explain', // 설명
  DEBUG = 'debug', // 디버깅
}

export interface ModelConfig {
  provider: 'claude' | 'openai';
  model: string;
  temperature: number;
  maxTokens: number;
}

export class ModelRouter {
  private providers: Map<string, AIProvider>;

  // 작업별 최적 모델 매핑
  private taskModelMap: Record<TaskComplexity, ModelConfig> = {
    [TaskComplexity.SIMPLE]: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2048,
    },
    [TaskComplexity.MEDIUM]: {
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096,
    },
    [TaskComplexity.COMPLEX]: {
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.5,
      maxTokens: 8192,
    },
    [TaskComplexity.REFACTOR]: {
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3,
      maxTokens: 4096,
    },
    [TaskComplexity.EXPLAIN]: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.8,
      maxTokens: 2048,
    },
    [TaskComplexity.DEBUG]: {
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.2,
      maxTokens: 4096,
    },
  };

  constructor() {
    this.providers = new Map();

    // Claude Provider
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('claude', new ClaudeProvider(process.env.ANTHROPIC_API_KEY));
    }

    // OpenAI Provider
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
    }
  }

  /**
   * 프롬프트에서 작업 복잡도 추론
   */
  inferComplexity(prompt: string, context?: string): TaskComplexity {
    const lowerPrompt = prompt.toLowerCase();

    // 디버깅 키워드
    if (
      lowerPrompt.includes('fix') ||
      lowerPrompt.includes('bug') ||
      lowerPrompt.includes('error') ||
      lowerPrompt.includes('디버그') ||
      lowerPrompt.includes('수정')
    ) {
      return TaskComplexity.DEBUG;
    }

    // 리팩토링 키워드
    if (
      lowerPrompt.includes('refactor') ||
      lowerPrompt.includes('optimize') ||
      lowerPrompt.includes('improve') ||
      lowerPrompt.includes('리팩토링') ||
      lowerPrompt.includes('최적화')
    ) {
      return TaskComplexity.REFACTOR;
    }

    // 설명 요청
    if (
      lowerPrompt.includes('explain') ||
      lowerPrompt.includes('what is') ||
      lowerPrompt.includes('how does') ||
      lowerPrompt.includes('설명') ||
      lowerPrompt.includes('무엇')
    ) {
      return TaskComplexity.EXPLAIN;
    }

    // 복잡도 키워드
    if (
      lowerPrompt.includes('algorithm') ||
      lowerPrompt.includes('complex') ||
      lowerPrompt.includes('advanced') ||
      lowerPrompt.includes('알고리즘') ||
      lowerPrompt.includes('복잡한')
    ) {
      return TaskComplexity.COMPLEX;
    }

    // 간단한 UI 컴포넌트
    if (
      lowerPrompt.includes('button') ||
      lowerPrompt.includes('card') ||
      lowerPrompt.includes('input') ||
      lowerPrompt.includes('버튼') ||
      lowerPrompt.includes('카드')
    ) {
      return TaskComplexity.SIMPLE;
    }

    // 컨텍스트 길이로 판단
    const totalLength = prompt.length + (context?.length || 0);
    if (totalLength > 2000) {
      return TaskComplexity.COMPLEX;
    } else if (totalLength > 500) {
      return TaskComplexity.MEDIUM;
    }

    return TaskComplexity.SIMPLE;
  }

  /**
   * 작업에 맞는 모델 설정 가져오기
   */
  getModelConfig(complexity: TaskComplexity): ModelConfig {
    return this.taskModelMap[complexity];
  }

  /**
   * 작업에 맞는 Provider 가져오기
   */
  getProvider(complexity: TaskComplexity): AIProvider | undefined {
    const config = this.getModelConfig(complexity);
    return this.providers.get(config.provider);
  }

  /**
   * 사용 가능한 Provider 목록
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 비용 추정 (토큰당 가격)
   */
  estimateCost(
    complexity: TaskComplexity,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): number {
    const config = this.getModelConfig(complexity);

    // 모델별 토큰당 가격 (USD per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
      'gpt-4o': { input: 5.0, output: 15.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
    };

    const modelPricing = pricing[config.model];
    if (!modelPricing) {
      return 0;
    }

    const inputCost = (estimatedInputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (estimatedOutputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }
}
