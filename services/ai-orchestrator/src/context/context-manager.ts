import { LRUCache } from 'lru-cache';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
}

export interface ConversationContext {
  sessionId: string;
  projectId?: string;
  messages: Message[];
  totalTokens: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 컨텍스트 관리 시스템
 * - 대화 히스토리 유지
 * - 토큰 사용량 추적
 * - 스마트 컨텍스트 압축
 */
export class ContextManager {
  private contexts: LRUCache<string, ConversationContext>;
  private maxTokensPerContext: number;

  constructor(maxContexts: number = 100, maxTokensPerContext: number = 8000) {
    this.maxTokensPerContext = maxTokensPerContext;

    this.contexts = new LRUCache({
      max: maxContexts,
      ttl: 1000 * 60 * 60 * 24, // 24시간
    });
  }

  /**
   * 새 컨텍스트 생성
   */
  createContext(sessionId: string, projectId?: string): ConversationContext {
    const context: ConversationContext = {
      sessionId,
      projectId,
      messages: [],
      totalTokens: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.contexts.set(sessionId, context);
    return context;
  }

  /**
   * 컨텍스트 가져오기
   */
  getContext(sessionId: string): ConversationContext | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * 메시지 추가
   */
  addMessage(
    sessionId: string,
    role: Message['role'],
    content: string,
    tokens?: number
  ): ConversationContext {
    let context = this.getContext(sessionId);

    if (!context) {
      context = this.createContext(sessionId);
    }

    const message: Message = {
      role,
      content,
      timestamp: Date.now(),
      tokens,
    };

    context.messages.push(message);
    context.totalTokens += tokens || this.estimateTokens(content);
    context.updatedAt = Date.now();

    // 토큰 제한 초과 시 압축
    if (context.totalTokens > this.maxTokensPerContext) {
      this.compressContext(context);
    }

    this.contexts.set(sessionId, context);
    return context;
  }

  /**
   * 컨텍스트 압축
   * - 오래된 메시지 요약
   * - 시스템 메시지와 최근 메시지 유지
   */
  private compressContext(context: ConversationContext) {
    // 시스템 메시지는 유지
    const systemMessages = context.messages.filter((m) => m.role === 'system');

    // 최근 5개 메시지 유지
    const recentMessages = context.messages.slice(-5);

    // 중간 메시지들을 요약으로 대체
    const middleMessages = context.messages.slice(
      systemMessages.length,
      context.messages.length - 5
    );

    if (middleMessages.length > 0) {
      const summary: Message = {
        role: 'system',
        content: `[이전 대화 요약]\n${middleMessages.length}개의 이전 메시지가 있습니다.`,
        timestamp: Date.now(),
        tokens: 50,
      };

      context.messages = [...systemMessages, summary, ...recentMessages];
    } else {
      context.messages = [...systemMessages, ...recentMessages];
    }

    // 토큰 수 재계산
    context.totalTokens = context.messages.reduce(
      (sum, m) => sum + (m.tokens || this.estimateTokens(m.content)),
      0
    );
  }

  /**
   * 토큰 수 추정 (대략적)
   */
  private estimateTokens(text: string): number {
    // 간단한 추정: 평균적으로 1 토큰 = 4자
    return Math.ceil(text.length / 4);
  }

  /**
   * 컨텍스트를 프롬프트 형식으로 변환
   */
  buildPrompt(sessionId: string, includeHistory: boolean = true): string {
    const context = this.getContext(sessionId);
    if (!context) {
      return '';
    }

    if (!includeHistory) {
      // 마지막 사용자 메시지만 반환
      const lastUserMessage = context.messages
        .slice()
        .reverse()
        .find((m) => m.role === 'user');
      return lastUserMessage?.content || '';
    }

    // 전체 대화 히스토리를 프롬프트로 변환
    return context.messages
      .map((m) => {
        const roleLabel = {
          system: 'System',
          user: 'User',
          assistant: 'Assistant',
        }[m.role];

        return `${roleLabel}: ${m.content}`;
      })
      .join('\n\n');
  }

  /**
   * 프로젝트별 컨텍스트 가져오기
   */
  getProjectContexts(projectId: string): ConversationContext[] {
    const allContexts: ConversationContext[] = [];

    for (const [, context] of this.contexts.entries()) {
      if (context.projectId === projectId) {
        allContexts.push(context);
      }
    }

    return allContexts;
  }

  /**
   * 컨텍스트 삭제
   */
  deleteContext(sessionId: string): boolean {
    return this.contexts.delete(sessionId);
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      totalContexts: this.contexts.size,
      maxContexts: this.contexts.max,
    };
  }

  /**
   * 프로젝트 컨텍스트 요약 생성
   */
  summarizeProjectContext(projectId: string): string {
    const contexts = this.getProjectContexts(projectId);

    if (contexts.length === 0) {
      return '';
    }

    const allMessages = contexts.flatMap((c) => c.messages);

    // 주요 정보 추출
    const userMessages = allMessages.filter((m) => m.role === 'user');
    const topics = new Set<string>();

    userMessages.forEach((m) => {
      // 간단한 키워드 추출 (실제로는 더 정교한 방법 사용)
      const words = m.content.toLowerCase().split(' ');
      const keywords = words.filter((w) => w.length > 5);
      keywords.slice(0, 3).forEach((k) => topics.add(k));
    });

    return `프로젝트 컨텍스트:\n- ${contexts.length}개의 대화 세션\n- 주요 토픽: ${Array.from(topics).join(', ')}\n- 총 메시지: ${allMessages.length}개`;
  }
}
