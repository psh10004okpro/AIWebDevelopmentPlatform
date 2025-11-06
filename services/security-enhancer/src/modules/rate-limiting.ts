export interface RateLimitCheckResult {
  isSafe: boolean;
  vulnerabilities: string[];
  recommendations: string[];
  implementationCode?: string;
}

export class RateLimiting {
  /**
   * Rate Limiting 구현 확인
   */
  public async checkCode(code: string): Promise<RateLimitCheckResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // Rate Limiting 사용 여부 확인
    const hasRateLimit = this.checkRateLimitUsage(code);

    // API 엔드포인트 확인
    const hasAPIEndpoints = this.checkAPIEndpoints(code);

    if (hasAPIEndpoints && !hasRateLimit) {
      vulnerabilities.push('API 엔드포인트에 Rate Limiting이 적용되지 않았습니다.');
      recommendations.push('express-rate-limit 또는 유사한 라이브러리를 사용하세요.');
      recommendations.push('무차별 대입 공격(Brute Force)을 방지하세요.');
    }

    const implementationCode = this.generateRateLimitImplementation();

    return {
      isSafe: vulnerabilities.length === 0,
      vulnerabilities,
      recommendations,
      implementationCode,
    };
  }

  /**
   * Rate Limiting 사용 여부 확인
   */
  private checkRateLimitUsage(code: string): boolean {
    const rateLimitPatterns = [
      /rateLimit/gi,
      /express-rate-limit/gi,
      /rate-limiter/gi,
      /throttle/gi,
    ];

    return rateLimitPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * API 엔드포인트 확인
   */
  private checkAPIEndpoints(code: string): boolean {
    const apiPatterns = [
      /app\.(get|post|put|delete|patch)/gi,
      /router\.(get|post|put|delete|patch)/gi,
      /api\//gi,
      /NextApiRequest/gi,
    ];

    return apiPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * Rate Limiting 구현 코드 생성
   */
  private generateRateLimitImplementation(): string {
    return `
// ========================================
// Rate Limiting Implementation
// ========================================

// 1. Express.js용 Rate Limiting
// server/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';

// Redis 클라이언트 (프로덕션에서 권장)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// 일반 API용 Rate Limiter
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 15분당 최대 100개 요청
  message: {
    error: 'Too many requests',
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도하세요.',
  },
  standardHeaders: true, // RateLimit-* 헤더 반환
  legacyHeaders: false, // X-RateLimit-* 헤더 비활성화
  keyGenerator: (req) => {
    // IP 주소 기반 제한
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

// 로그인/인증용 Strict Rate Limiter
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분당 최대 5번 시도
  skipSuccessfulRequests: true, // 성공한 요청은 카운트하지 않음
  message: {
    error: 'Too many login attempts',
    message: '로그인 시도 횟수가 초과되었습니다. 15분 후 다시 시도하세요.',
  },
});

// AI 코드 생성용 Rate Limiter (비용 제어)
export const aiGenerationLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:ai:',
  }),
  windowMs: 60 * 60 * 1000, // 1시간
  max: 50, // 1시간당 최대 50개 요청
  message: {
    error: 'AI generation limit exceeded',
    message: 'AI 생성 한도를 초과했습니다. 1시간 후 다시 시도하세요.',
  },
});

// ========================================
// 2. Next.js API Routes용 Rate Limiting
// middleware/rate-limit.ts
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number; // 시간 간격 (ms)
  uniqueTokenPerInterval: number; // 간격당 고유 토큰 수
};

const rateLimitCache = new LRUCache<string, number[]>({
  max: 500, // 최대 500개 IP 추적
  ttl: 60000, // 1분 TTL
});

export function withRateLimit(
  handler: NextApiHandler,
  options: RateLimitOptions = {
    interval: 60 * 1000, // 1분
    uniqueTokenPerInterval: 10, // 1분당 10개 요청
  }
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers['x-forwarded-for'] as string ||
                  req.socket.remoteAddress ||
                  'unknown';

    const tokenCount = rateLimitCache.get(token) || [];
    const now = Date.now();
    const windowStart = now - options.interval;

    // 현재 시간 윈도우 내의 요청만 필터링
    const requestsInWindow = tokenCount.filter(time => time > windowStart);

    if (requestsInWindow.length >= options.uniqueTokenPerInterval) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
        retryAfter: Math.ceil((requestsInWindow[0] + options.interval - now) / 1000),
      });
    }

    // 새 요청 추가
    requestsInWindow.push(now);
    rateLimitCache.set(token, requestsInWindow);

    return handler(req, res);
  };
}

// ========================================
// 3. 사용 예시
// pages/api/generate.ts
import { withRateLimit } from '@/middleware/rate-limit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // AI 코드 생성 로직
  // ...

  return res.status(200).json({ success: true });
}

// AI 생성 엔드포인트: 1분당 5개 요청 제한
export default withRateLimit(handler, {
  interval: 60 * 1000,
  uniqueTokenPerInterval: 5,
});

// ========================================
// 4. Express.js 서버에 적용
// server/index.ts
import express from 'express';
import { apiLimiter, authLimiter, aiGenerationLimiter } from './middleware/rate-limit';

const app = express();

// 모든 API에 기본 Rate Limiting 적용
app.use('/api/', apiLimiter);

// 인증 엔드포인트에 엄격한 제한
app.use('/api/auth/', authLimiter);

// AI 생성 엔드포인트에 특별 제한
app.use('/api/ai/generate', aiGenerationLimiter);

app.post('/api/ai/generate', async (req, res) => {
  // AI 생성 로직
  res.json({ success: true });
});

// ========================================
// 5. 사용자별 Rate Limiting (인증된 사용자)
export const createUserRateLimiter = (maxRequests: number) => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1시간
    max: maxRequests,
    keyGenerator: (req) => {
      // 인증된 사용자 ID 기반 제한
      return (req as any).user?.id || req.ip || 'anonymous';
    },
    skip: (req) => {
      // 관리자는 제한 없음
      return (req as any).user?.role === 'admin';
    },
  });
};

// ========================================
// 6. 동적 Rate Limiting (사용자 티어별)
export function getDynamicRateLimit(userTier: 'free' | 'pro' | 'enterprise') {
  const limits = {
    free: { windowMs: 60 * 60 * 1000, max: 10 },
    pro: { windowMs: 60 * 60 * 1000, max: 100 },
    enterprise: { windowMs: 60 * 60 * 1000, max: 1000 },
  };

  return rateLimit(limits[userTier]);
}

// ========================================
// 7. Rate Limit 정보를 프론트엔드에 전달
export function addRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  reset: number
) {
  res.headers.set('X-RateLimit-Limit', limit.toString());
  res.headers.set('X-RateLimit-Remaining', remaining.toString());
  res.headers.set('X-RateLimit-Reset', reset.toString());
}
`;
  }

  /**
   * Sliding Window Rate Limiting 구현
   */
  public generateSlidingWindowImplementation(): string {
    return `
// Sliding Window Rate Limiting (더 정확한 제한)
import { Redis } from 'ioredis';

export class SlidingWindowRateLimiter {
  constructor(
    private redis: Redis,
    private windowSize: number = 60000, // 1분
    private maxRequests: number = 10
  ) {}

  async isAllowed(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - this.windowSize;

    // 오래된 요청 제거
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // 현재 요청 수 확인
    const currentCount = await this.redis.zcard(key);

    if (currentCount >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // 새 요청 추가
    await this.redis.zadd(key, now, \`\${now}-\${Math.random()}\`);
    await this.redis.expire(key, Math.ceil(this.windowSize / 1000));

    return {
      allowed: true,
      remaining: this.maxRequests - currentCount - 1,
    };
  }
}
`;
  }
}
