import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, CodeGenerationRequest, CodeGenerationResponse } from './base';

export class ClaudeProvider extends AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  get name(): string {
    return 'Claude';
  }

  validateApiKey(): boolean {
    return !!this.client.apiKey;
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(request.language);
    const userPrompt = this.buildUserPrompt(request);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      const code =
        content.type === 'text' ? this.extractCode(content.text) : '';

      return {
        code,
        explanation: content.type === 'text' ? content.text : undefined,
        model: this.model,
        tokens: response.usage.input_tokens + response.usage.output_tokens,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error(`Claude 코드 생성 실패: ${error}`);
    }
  }

  private buildSystemPrompt(language: string): string {
    return `당신은 전문 ${language} 개발자입니다.
사용자의 요청에 따라 깔끔하고 잘 구조화된 코드를 생성합니다.
코드는 최신 모범 사례를 따르고, 타입 안전성을 보장하며, 주석을 포함해야 합니다.
생성된 코드는 바로 실행 가능해야 합니다.`;
  }

  private buildUserPrompt(request: CodeGenerationRequest): string {
    let prompt = `다음 요구사항에 맞는 ${request.language} 코드를 생성해주세요:\n\n${request.prompt}`;

    if (request.context) {
      prompt += `\n\n컨텍스트:\n${request.context}`;
    }

    prompt += '\n\n코드만 반환하고, 설명은 간단하게 해주세요.';
    return prompt;
  }

  private extractCode(text: string): string {
    // 코드 블록 추출 (```로 감싸진 부분)
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const matches = text.match(codeBlockRegex);

    if (matches && matches.length > 0) {
      return matches[0].replace(/```(?:\w+)?\n|```/g, '').trim();
    }

    return text;
  }
}
