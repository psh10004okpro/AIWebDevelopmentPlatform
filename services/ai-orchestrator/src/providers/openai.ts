import OpenAI from 'openai';
import { AIProvider, CodeGenerationRequest, CodeGenerationResponse } from './base';

export class OpenAIProvider extends AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  get name(): string {
    return 'OpenAI';
  }

  validateApiKey(): boolean {
    return !!this.client.apiKey;
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(request.language);
    const userPrompt = this.buildUserPrompt(request);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || '';
      const code = this.extractCode(content);

      return {
        code,
        explanation: content,
        model: this.model,
        tokens: response.usage?.total_tokens,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI 코드 생성 실패: ${error}`);
    }
  }

  private buildSystemPrompt(language: string): string {
    return `You are an expert ${language} developer.
Generate clean, well-structured code based on user requirements.
Follow the latest best practices, ensure type safety, and include comments.
The generated code should be ready to run.`;
  }

  private buildUserPrompt(request: CodeGenerationRequest): string {
    let prompt = `Generate ${request.language} code for the following requirement:\n\n${request.prompt}`;

    if (request.context) {
      prompt += `\n\nContext:\n${request.context}`;
    }

    prompt += '\n\nReturn only the code with brief explanations.';
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
