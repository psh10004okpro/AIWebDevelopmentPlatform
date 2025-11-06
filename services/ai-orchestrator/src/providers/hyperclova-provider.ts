import axios from 'axios';

export interface HyperClovaXConfig {
  apiKey: string;
  apiKeyPrimaryVal: string;
  apigwApiKey: string;
  requestId?: string;
  endpoint?: string;
}

export interface HyperClovaXRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  temperature?: number;
  repeatPenalty?: number;
  stopBefore?: string[];
  includeAiFilters?: boolean;
  seed?: number;
}

export interface HyperClovaXResponse {
  status: {
    code: string;
    message: string;
  };
  result: {
    message: {
      role: string;
      content: string;
    };
    inputLength: number;
    outputLength: number;
    stopReason: string;
    seed: number;
    aiFilter: Array<{
      groupName: string;
      name: string;
      score: number;
    }>;
  };
}

/**
 * NAVER HyperCLOVA X Provider
 * 한국어에 특화된 거대 언어 모델
 */
export class HyperClovaXProvider {
  private config: HyperClovaXConfig;
  private readonly baseURL: string;
  private readonly model: string;

  constructor(config: HyperClovaXConfig, model: string = 'HCX-003') {
    this.config = config;
    this.model = model;
    this.baseURL = config.endpoint || 'https://clovastudio.stream.ntruss.com';
  }

  /**
   * HyperCLOVA X로 코드 생성
   */
  async generate(prompt: string, options?: {
    language?: string;
    context?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    code: string;
    model: string;
    tokens: number;
    stopReason: string;
  }> {
    const { language = 'typescript', context = '', temperature = 0.5, maxTokens = 4096 } = options || {};

    // 시스템 프롬프트 구성 (한국어 최적화)
    const systemPrompt = `당신은 전문 소프트웨어 개발자입니다. 주어진 요청에 따라 고품질의 ${language} 코드를 생성하세요.

코드 작성 가이드라인:
- 깔끔하고 읽기 쉬운 코드를 작성하세요
- 적절한 주석을 한국어로 추가하세요
- 최신 베스트 프랙티스를 따르세요
- 타입 안정성을 보장하세요
- 에러 처리를 포함하세요`;

    const messages: HyperClovaXRequest['messages'] = [
      { role: 'system', content: systemPrompt },
    ];

    if (context) {
      messages.push({
        role: 'user',
        content: `컨텍스트:\n${context}`,
      });
    }

    messages.push({
      role: 'user',
      content: `요청사항: ${prompt}\n\n위 요청에 맞는 ${language} 코드를 생성해주세요.`,
    });

    const requestBody: HyperClovaXRequest = {
      messages,
      topP: 0.8,
      topK: 0,
      maxTokens,
      temperature,
      repeatPenalty: 5.0,
      stopBefore: [],
      includeAiFilters: true,
      seed: 0,
    };

    try {
      const response = await axios.post<HyperClovaXResponse>(
        `${this.baseURL}/testapp/v1/chat-completions/${this.model}`,
        requestBody,
        {
          headers: {
            'X-NCP-CLOVASTUDIO-API-KEY': this.config.apiKey,
            'X-NCP-APIGW-API-KEY': this.config.apigwApiKey,
            'X-NCP-CLOVASTUDIO-REQUEST-ID': this.config.requestId || this.generateRequestId(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 60000,
        }
      );

      if (response.data.status.code !== '20000') {
        throw new Error(`HyperCLOVA X API Error: ${response.data.status.message}`);
      }

      const result = response.data.result;
      const code = this.extractCode(result.message.content);

      return {
        code,
        model: this.model,
        tokens: result.inputLength + result.outputLength,
        stopReason: result.stopReason,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `HyperCLOVA X 요청 실패: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 한국어 자연어를 코드로 변환 (특화 기능)
   */
  async koreanToCode(koreanPrompt: string, options?: {
    language?: string;
    includeComments?: boolean;
  }): Promise<string> {
    const { language = 'typescript', includeComments = true } = options || {};

    const systemPrompt = `당신은 한국어 자연어 설명을 ${language} 코드로 변환하는 전문가입니다.
사용자가 한국어로 설명한 기능을 정확하게 이해하고, 실행 가능한 코드를 생성하세요.
${includeComments ? '코드에는 한국어 주석을 포함하세요.' : ''}`;

    const response = await this.generate(koreanPrompt, {
      language,
      context: systemPrompt,
      temperature: 0.3,
      maxTokens: 3000,
    });

    return response.code;
  }

  /**
   * 코드 리뷰 (한국어)
   */
  async reviewCode(code: string, language: string): Promise<{
    issues: string[];
    suggestions: string[];
    score: number;
  }> {
    const prompt = `다음 ${language} 코드를 리뷰해주세요:

\`\`\`${language}
${code}
\`\`\`

다음 형식으로 리뷰 결과를 제공해주세요:
1. 발견된 문제점 (있다면)
2. 개선 제안
3. 코드 품질 점수 (0-100)`;

    const result = await this.generate(prompt, {
      language: 'markdown',
      temperature: 0.3,
      maxTokens: 2000,
    });

    // 응답 파싱 (간단한 구현)
    const content = result.code;
    const issues = this.extractSection(content, '문제점') || [];
    const suggestions = this.extractSection(content, '개선 제안') || [];
    const scoreMatch = content.match(/점수[:\s]+(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;

    return {
      issues,
      suggestions,
      score,
    };
  }

  /**
   * 응답에서 코드 블록 추출
   */
  private extractCode(content: string): string {
    // 마크다운 코드 블록 추출
    const codeBlockMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // 코드 블록이 없으면 전체 내용 반환
    return content.trim();
  }

  /**
   * 섹션별 내용 추출
   */
  private extractSection(content: string, sectionName: string): string[] {
    const lines = content.split('\n');
    const items: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (line.includes(sectionName)) {
        inSection = true;
        continue;
      }

      if (inSection) {
        if (line.match(/^\d+\./)) {
          // 다음 섹션 시작
          break;
        }
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          items.push(line.trim().substring(1).trim());
        }
      }
    }

    return items;
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * HyperCLOVA X 모델 정보
   */
  static getModelInfo(model: string = 'HCX-003') {
    const models: Record<string, {
      name: string;
      description: string;
      contextWindow: number;
      inputPrice: number;
      outputPrice: number;
    }> = {
      'HCX-003': {
        name: 'HyperCLOVA X',
        description: '네이버의 최신 초거대 AI 모델, 한국어 특화',
        contextWindow: 8192,
        inputPrice: 0.0, // NCP 가격 정책에 따라 변경
        outputPrice: 0.0,
      },
      'HCX-002': {
        name: 'HyperCLOVA X (이전 버전)',
        description: '한국어 자연어 처리에 최적화',
        contextWindow: 4096,
        inputPrice: 0.0,
        outputPrice: 0.0,
      },
    };

    return models[model] || models['HCX-003'];
  }
}

/**
 * HyperCLOVA X 설정 검증
 */
export function validateHyperClovaXConfig(config: Partial<HyperClovaXConfig>): boolean {
  return !!(
    config.apiKey &&
    config.apiKeyPrimaryVal &&
    config.apigwApiKey
  );
}
