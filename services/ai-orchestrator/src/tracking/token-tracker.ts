import { prisma } from '@nextgen-ai-platform/database';

export interface TokenUsage {
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: number;
}

/**
 * 토큰 사용량 추적 및 비용 추정
 */
export class TokenTracker {
  // 모델별 가격 (USD per 1M tokens)
  private pricing: Record<string, { input: number; output: number }> = {
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'gpt-4o': { input: 5.0, output: 15.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo-preview': { input: 10.0, output: 30.0 },
  };

  /**
   * 토큰 사용량 기록
   */
  async trackUsage(usage: TokenUsage): Promise<void> {
    try {
      await prisma.generationLog.create({
        data: {
          prompt: usage.sessionId,
          code: '',
          model: usage.model,
          tokens: usage.totalTokens,
          duration: 0,
          success: true,
        },
      });
    } catch (error) {
      console.error('토큰 사용량 기록 실패:', error);
    }
  }

  /**
   * 비용 계산
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelPricing = this.pricing[model];

    if (!modelPricing) {
      console.warn(`모델 ${model}의 가격 정보가 없습니다`);
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * 세션별 총 사용량 조회
   */
  async getSessionUsage(sessionId: string): Promise<{
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }> {
    try {
      const logs = await prisma.generationLog.findMany({
        where: {
          prompt: sessionId,
        },
      });

      const totalTokens = logs.reduce((sum, log) => sum + (log.tokens || 0), 0);
      const totalCost = logs.reduce((sum, log) => {
        const tokens = log.tokens || 0;
        return sum + this.calculateCost(log.model, tokens / 2, tokens / 2);
      }, 0);

      return {
        totalTokens,
        totalCost,
        requestCount: logs.length,
      };
    } catch (error) {
      console.error('사용량 조회 실패:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
      };
    }
  }

  /**
   * 일별 사용량 통계
   */
  async getDailyStats(date: Date): Promise<{
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    modelBreakdown: Record<string, number>;
  }> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const logs = await prisma.generationLog.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const totalTokens = logs.reduce((sum, log) => sum + (log.tokens || 0), 0);

      let totalCost = 0;
      const modelBreakdown: Record<string, number> = {};

      logs.forEach((log) => {
        const tokens = log.tokens || 0;
        const cost = this.calculateCost(log.model, tokens / 2, tokens / 2);
        totalCost += cost;

        if (!modelBreakdown[log.model]) {
          modelBreakdown[log.model] = 0;
        }
        modelBreakdown[log.model] += tokens;
      });

      return {
        totalTokens,
        totalCost,
        totalRequests: logs.length,
        modelBreakdown,
      };
    } catch (error) {
      console.error('일별 통계 조회 실패:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        totalRequests: 0,
        modelBreakdown: {},
      };
    }
  }

  /**
   * 예상 비용 추정
   */
  estimateCost(model: string, promptLength: number): {
    minCost: number;
    maxCost: number;
    avgCost: number;
  } {
    // 대략적인 토큰 수 추정 (1 토큰 = 4자)
    const inputTokens = Math.ceil(promptLength / 4);

    // 출력 토큰은 입력의 0.5x ~ 2x 사이
    const minOutputTokens = Math.ceil(inputTokens * 0.5);
    const maxOutputTokens = Math.ceil(inputTokens * 2);
    const avgOutputTokens = Math.ceil(inputTokens * 1.0);

    return {
      minCost: this.calculateCost(model, inputTokens, minOutputTokens),
      maxCost: this.calculateCost(model, inputTokens, maxOutputTokens),
      avgCost: this.calculateCost(model, inputTokens, avgOutputTokens),
    };
  }

  /**
   * 실시간 사용량 모니터링
   */
  async getRealtimeStats(): Promise<{
    last24h: {
      tokens: number;
      cost: number;
      requests: number;
    };
    last7d: {
      tokens: number;
      cost: number;
      requests: number;
    };
  }> {
    const now = new Date();

    // 24시간
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const logs24h = await prisma.generationLog.findMany({
      where: { createdAt: { gte: last24h } },
    });

    // 7일
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const logs7d = await prisma.generationLog.findMany({
      where: { createdAt: { gte: last7d } },
    });

    const calc = (logs: any[]) => ({
      tokens: logs.reduce((sum, log) => sum + (log.tokens || 0), 0),
      cost: logs.reduce((sum, log) => {
        const tokens = log.tokens || 0;
        return sum + this.calculateCost(log.model, tokens / 2, tokens / 2);
      }, 0),
      requests: logs.length,
    });

    return {
      last24h: calc(logs24h),
      last7d: calc(logs7d),
    };
  }
}
