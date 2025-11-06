import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import { HyperClovaXWrapper } from './providers/hyperclova-wrapper';
import { AIProvider, CodeGenerationRequest, CodeGenerationResponse } from './providers/base';
import { prisma } from '@nextgen-ai-platform/database';

type AIProviderType = 'claude' | 'openai' | 'hyperclova';

export class CodeGenerationPipeline {
  private providers: Map<AIProviderType, AIProvider>;
  private defaultProvider: AIProviderType;

  constructor() {
    this.providers = new Map();
    this.defaultProvider = (process.env.DEFAULT_AI_PROVIDER as AIProviderType) || 'claude';

    // Claude Provider 초기화
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set(
        'claude',
        new ClaudeProvider(process.env.ANTHROPIC_API_KEY, process.env.CLAUDE_MODEL)
      );
    }

    // OpenAI Provider 초기화
    if (process.env.OPENAI_API_KEY) {
      this.providers.set(
        'openai',
        new OpenAIProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL)
      );
    }

    // HyperCLOVA X Provider 초기화 (한국어 특화)
    if (
      process.env.HYPERCLOVA_API_KEY &&
      process.env.HYPERCLOVA_API_KEY_PRIMARY_VAL &&
      process.env.HYPERCLOVA_APIGW_API_KEY
    ) {
      this.providers.set(
        'hyperclova',
        new HyperClovaXWrapper(
          {
            apiKey: process.env.HYPERCLOVA_API_KEY,
            apiKeyPrimaryVal: process.env.HYPERCLOVA_API_KEY_PRIMARY_VAL,
            apigwApiKey: process.env.HYPERCLOVA_APIGW_API_KEY,
            endpoint: process.env.HYPERCLOVA_ENDPOINT,
          },
          process.env.HYPERCLOVA_MODEL || 'HCX-003'
        )
      );
      console.log('✅ HyperCLOVA X Provider 초기화 완료');
    }

    if (this.providers.size === 0) {
      console.warn('⚠️  AI Provider가 설정되지 않았습니다. API 키를 확인하세요.');
    }
  }

  /**
   * 코드 생성 파이프라인
   * 1. 프롬프트 전처리
   * 2. AI 모델 호출
   * 3. 코드 검증
   * 4. 포매팅
   * 5. 로깅 및 반환
   */
  async generate(
    request: CodeGenerationRequest,
    providerType?: AIProviderType
  ): Promise<CodeGenerationResponse> {
    const provider = this.getProvider(providerType);

    if (!provider) {
      throw new Error('사용 가능한 AI Provider가 없습니다.');
    }

    try {
      // 1. 프롬프트 전처리
      const preprocessedRequest = this.preprocessRequest(request);

      // 2. AI 모델 호출
      console.log(`🤖 ${provider.name}을(를) 사용하여 코드 생성 중...`);
      const response = await provider.generateCode(preprocessedRequest);

      // 3. 코드 검증
      const validatedCode = await this.validateCode(response.code, request.language);

      // 4. 포매팅
      const formattedCode = await this.formatCode(validatedCode, request.language);

      // 5. 로깅
      await this.logGeneration({
        prompt: request.prompt,
        code: formattedCode,
        model: response.model,
        tokens: response.tokens,
        duration: response.duration,
        success: true,
      });

      return {
        ...response,
        code: formattedCode,
      };
    } catch (error) {
      // 에러 로깅
      await this.logGeneration({
        prompt: request.prompt,
        code: '',
        model: provider.name,
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Provider 선택
   */
  private getProvider(providerType?: AIProviderType): AIProvider | undefined {
    if (providerType) {
      return this.providers.get(providerType);
    }
    return this.providers.get(this.defaultProvider);
  }

  /**
   * 프롬프트 전처리
   */
  private preprocessRequest(request: CodeGenerationRequest): CodeGenerationRequest {
    return {
      ...request,
      prompt: request.prompt.trim(),
      context: request.context?.trim(),
    };
  }

  /**
   * 코드 검증 (기본적인 문법 체크)
   */
  private async validateCode(code: string, language: string): Promise<string> {
    // TODO: ESLint, TypeScript 컴파일러 등을 사용한 실제 검증
    // 현재는 기본 체크만 수행
    if (!code || code.trim().length === 0) {
      throw new Error('생성된 코드가 비어있습니다.');
    }

    return code;
  }

  /**
   * 코드 포매팅
   */
  private async formatCode(code: string, language: string): Promise<string> {
    // TODO: Prettier를 사용한 실제 포매팅
    // 현재는 기본 정리만 수행
    return code.trim();
  }

  /**
   * 생성 로그 저장
   */
  private async logGeneration(data: {
    prompt: string;
    code: string;
    model: string;
    tokens?: number;
    duration: number;
    success: boolean;
    error?: string;
  }): Promise<void> {
    try {
      await prisma.generationLog.create({
        data: {
          prompt: data.prompt,
          code: data.code,
          model: data.model,
          tokens: data.tokens,
          duration: data.duration,
          success: data.success,
          error: data.error,
        },
      });
    } catch (error) {
      console.error('로그 저장 실패:', error);
    }
  }

  /**
   * 사용 가능한 Provider 목록
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
