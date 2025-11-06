import { v4 as uuidv4 } from 'uuid';

export interface CSRFCheckResult {
  isSafe: boolean;
  vulnerabilities: string[];
  recommendations: string[];
  implementationCode?: string;
}

export class CSRFProtection {
  /**
   * CSRF 보호 취약점 검사
   */
  public async checkCode(code: string): Promise<CSRFCheckResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // POST/PUT/DELETE 엔드포인트가 있는지 확인
    const hasMutationEndpoints = this.checkMutationEndpoints(code);

    // CSRF 토큰 검증이 있는지 확인
    const hasCSRFValidation = this.checkCSRFValidation(code);

    // SameSite 쿠키 설정 확인
    const hasSameSiteCookie = this.checkSameSiteCookie(code);

    if (hasMutationEndpoints && !hasCSRFValidation) {
      vulnerabilities.push('POST/PUT/DELETE 엔드포인트에 CSRF 토큰 검증이 없습니다.');
      recommendations.push('CSRF 토큰을 생성하고 검증하세요.');
    }

    if (!hasSameSiteCookie) {
      recommendations.push('쿠키에 SameSite 속성을 설정하세요.');
    }

    // 구현 코드 생성
    const implementationCode = this.generateCSRFImplementation();

    return {
      isSafe: vulnerabilities.length === 0,
      vulnerabilities,
      recommendations,
      implementationCode,
    };
  }

  /**
   * 변경 작업 엔드포인트 확인
   */
  private checkMutationEndpoints(code: string): boolean {
    const mutationPatterns = [
      /\.post\s*\(/gi,
      /\.put\s*\(/gi,
      /\.delete\s*\(/gi,
      /\.patch\s*\(/gi,
      /method:\s*['"](?:POST|PUT|DELETE|PATCH)['"]/gi,
    ];

    return mutationPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * CSRF 토큰 검증 확인
   */
  private checkCSRFValidation(code: string): boolean {
    const csrfPatterns = [
      /csrf/gi,
      /x-csrf-token/gi,
      /csrfToken/gi,
      /csurf/gi,
    ];

    return csrfPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * SameSite 쿠키 설정 확인
   */
  private checkSameSiteCookie(code: string): boolean {
    const sameSitePatterns = [
      /sameSite:\s*['"](?:Strict|Lax)['"]/gi,
      /SameSite=(?:Strict|Lax)/gi,
    ];

    return sameSitePatterns.some((pattern) => pattern.test(code));
  }

  /**
   * CSRF 토큰 생성
   */
  public generateToken(): string {
    return uuidv4();
  }

  /**
   * CSRF 보호 구현 코드 생성
   */
  private generateCSRFImplementation(): string {
    return `
// ========================================
// CSRF Protection Implementation
// ========================================

// 1. Next.js API Route에서 CSRF 토큰 생성
// pages/api/csrf-token.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const csrfToken = uuidv4();

    // 쿠키에 CSRF 토큰 저장 (httpOnly, secure, sameSite)
    res.setHeader('Set-Cookie', [
      \`csrfToken=\${csrfToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600\`,
    ]);

    return res.status(200).json({ csrfToken });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ========================================
// 2. CSRF 검증 미들웨어
// middleware/csrf.ts
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

export function withCSRF(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // GET, HEAD, OPTIONS 요청은 CSRF 검증 불필요
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
      return handler(req, res);
    }

    // 헤더에서 CSRF 토큰 가져오기
    const headerToken = req.headers['x-csrf-token'] as string;

    // 쿠키에서 CSRF 토큰 가져오기
    const cookieToken = req.cookies.csrfToken;

    // 토큰 검증
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        message: 'CSRF 토큰이 유효하지 않습니다.'
      });
    }

    return handler(req, res);
  };
}

// ========================================
// 3. 보호된 API 엔드포인트 예제
// pages/api/protected-action.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withCSRF } from '@/middleware/csrf';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // CSRF 토큰이 검증된 후에만 실행됨
    const { data } = req.body;

    // 비즈니스 로직 실행
    // ...

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withCSRF(handler);

// ========================================
// 4. 프론트엔드에서 CSRF 토큰 사용
// hooks/useCSRF.ts
import { useEffect, useState } from 'react';

export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);

  useEffect(() => {
    // 컴포넌트 마운트 시 CSRF 토큰 가져오기
    fetch('/api/csrf-token')
      .then(res => res.json())
      .then(data => setCSRFToken(data.csrfToken))
      .catch(console.error);
  }, []);

  return csrfToken;
}

// 사용 예시
// components/ProtectedForm.tsx
import { useCSRF } from '@/hooks/useCSRF';

export function ProtectedForm() {
  const csrfToken = useCSRF();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csrfToken) {
      alert('CSRF 토큰을 불러오는 중입니다.');
      return;
    }

    const response = await fetch('/api/protected-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken, // CSRF 토큰을 헤더에 포함
      },
      credentials: 'include', // 쿠키 포함
      body: JSON.stringify({ data: 'example' }),
    });

    const result = await response.json();
    console.log(result);
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={!csrfToken}>
        Submit
      </button>
    </form>
  );
}

// ========================================
// 5. NextAuth.js와 함께 사용하는 경우
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  // ... 기타 설정
  cookies: {
    sessionToken: {
      name: \`next-auth.session-token\`,
      options: {
        httpOnly: true,
        sameSite: 'lax', // 또는 'strict'
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

export default NextAuth(authOptions);
`;
  }

  /**
   * Double Submit Cookie 패턴 구현 생성
   */
  public generateDoubleSubmitPattern(): string {
    return `
// Double Submit Cookie 패턴
// 서버에서 세션을 저장하지 않고도 CSRF 방지 가능

// 1. 토큰 생성 및 쿠키 설정
export function setCSRFCookie(res: NextApiResponse): string {
  const token = uuidv4();

  res.setHeader('Set-Cookie', [
    \`XSRF-TOKEN=\${token}; Path=/; SameSite=Strict; Secure; Max-Age=3600\`,
  ]);

  return token;
}

// 2. 검증 미들웨어
export function validateDoubleSubmit(req: NextApiRequest): boolean {
  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.headers['x-xsrf-token'] as string;

  return cookieToken && headerToken && cookieToken === headerToken;
}
`;
  }
}
