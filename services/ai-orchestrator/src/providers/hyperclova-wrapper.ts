import { AIProvider, CodeGenerationRequest, CodeGenerationResponse } from './base';
import { HyperClovaXProvider, HyperClovaXConfig } from './hyperclova-provider';

/**
 * HyperCLOVA X Provider Wrapper
 * AIProvider 인터페이스를 구현하여 파이프라인과 호환
 */
export class HyperClovaXWrapper implements AIProvider {
  name = 'HyperCLOVA X';
  private provider: HyperClovaXProvider;

  constructor(config: HyperClovaXConfig, model: string = 'HCX-003') {
    this.provider = new HyperClovaXProvider(config, model);
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const startTime = Date.now();

    try {
      const result = await this.provider.generate(request.prompt, {
        language: request.language,
        context: request.context,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      const duration = Date.now() - startTime;

      return {
        code: result.code,
        model: result.model,
        tokens: result.tokens,
        duration,
      };
    } catch (error) {
      throw new Error(
        `HyperCLOVA X 코드 생성 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
