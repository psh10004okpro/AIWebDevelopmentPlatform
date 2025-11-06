import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

export interface XSSCheckResult {
  isSafe: boolean;
  vulnerabilities: string[];
  fixedCode?: string;
  recommendations: string[];
  sanitizedOutputs?: Array<{ original: string; sanitized: string }>;
}

export class XSSPrevention {
  private readonly window: Window;
  private readonly DOMPurify: any;

  constructor() {
    // JSDOM을 사용하여 서버 사이드에서 DOMPurify 사용
    const dom = new JSDOM('');
    this.window = dom.window as unknown as Window;
    this.DOMPurify = createDOMPurify(this.window);
  }

  /**
   * XSS 취약점 패턴들
   */
  private readonly vulnerablePatterns = [
    // dangerouslySetInnerHTML 사용
    /dangerouslySetInnerHTML\s*=\s*\{\{?\s*__html:\s*[^}]+\}\}?/gi,
    // innerHTML 직접 사용
    /\.innerHTML\s*=\s*[^;]+/gi,
    // document.write
    /document\.write\s*\(/gi,
    // eval 사용
    /eval\s*\(/gi,
    // 사용자 입력을 직접 렌더링
    /\{[^}]*\}\s*(?!.*?(?:sanitize|escape|encode))/gi,
  ];

  /**
   * 코드에서 XSS 취약점 검사
   */
  public async checkCode(code: string): Promise<XSSCheckResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];
    const sanitizedOutputs: Array<{ original: string; sanitized: string }> = [];

    // dangerouslySetInnerHTML 검사
    const dangerousHTML = code.match(/dangerouslySetInnerHTML/gi);
    if (dangerousHTML) {
      vulnerabilities.push('dangerouslySetInnerHTML 사용 발견 - XSS 취약점 위험');
      recommendations.push('DOMPurify로 HTML을 정제(sanitize)하세요.');
    }

    // innerHTML 직접 사용 검사
    const innerHTMLUsage = code.match(/\.innerHTML\s*=/gi);
    if (innerHTMLUsage) {
      vulnerabilities.push('innerHTML 직접 사용 발견 - XSS 취약점 위험');
      recommendations.push('textContent를 사용하거나 DOMPurify로 정제하세요.');
    }

    // eval 사용 검사
    const evalUsage = code.match(/\beval\s*\(/gi);
    if (evalUsage) {
      vulnerabilities.push('eval() 함수 사용 발견 - 매우 위험한 코드 실행');
      recommendations.push('eval() 사용을 피하고 안전한 대안을 사용하세요.');
    }

    // document.write 검사
    const documentWrite = code.match(/document\.write/gi);
    if (documentWrite) {
      vulnerabilities.push('document.write 사용 발견');
      recommendations.push('DOM API나 React 렌더링을 사용하세요.');
    }

    // DOMPurify 사용 여부 확인
    const hasDOMPurify = this.checkDOMPurifyUsage(code);
    if (!hasDOMPurify && vulnerabilities.length > 0) {
      recommendations.push('DOMPurify 라이브러리를 설치하고 사용하세요: npm install dompurify');
    }

    // 취약점이 발견되면 수정된 코드 생성
    let fixedCode: string | undefined;
    if (vulnerabilities.length > 0) {
      fixedCode = this.generateFixedCode(code);
    }

    return {
      isSafe: vulnerabilities.length === 0,
      vulnerabilities,
      fixedCode,
      recommendations,
      sanitizedOutputs,
    };
  }

  /**
   * DOMPurify 사용 여부 확인
   */
  private checkDOMPurifyUsage(code: string): boolean {
    const purifyPatterns = [
      /DOMPurify\.sanitize/gi,
      /from\s+['"]dompurify['"]/gi,
      /import.*DOMPurify/gi,
    ];

    return purifyPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * HTML 문자열 정제
   */
  public sanitizeHTML(dirty: string, config?: any): string {
    return this.DOMPurify.sanitize(dirty, config);
  }

  /**
   * 여러 HTML 문자열 일괄 정제
   */
  public sanitizeMultiple(inputs: string[]): Array<{ original: string; sanitized: string }> {
    return inputs.map((input) => ({
      original: input,
      sanitized: this.sanitizeHTML(input),
    }));
  }

  /**
   * 취약한 코드를 안전한 코드로 변환
   */
  private generateFixedCode(code: string): string {
    let fixed = code;

    // dangerouslySetInnerHTML을 DOMPurify로 감싸기
    fixed = fixed.replace(
      /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html:\s*([^}]+)\s*\}\}/gi,
      (match, htmlContent) => {
        return `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(${htmlContent.trim()}) }}`;
      }
    );

    // innerHTML을 DOMPurify로 감싸기
    fixed = fixed.replace(
      /(\w+)\.innerHTML\s*=\s*([^;]+);/gi,
      (match, element, content) => {
        return `${element}.innerHTML = DOMPurify.sanitize(${content.trim()});`;
      }
    );

    // DOMPurify import 추가 (아직 없는 경우)
    if (!this.checkDOMPurifyUsage(fixed)) {
      fixed = `import DOMPurify from 'dompurify';\n\n${fixed}`;
    }

    return fixed;
  }

  /**
   * React 컴포넌트용 안전한 HTML 렌더링 예제 생성
   */
  public generateReactExample(htmlContent: string): string {
    return `
import DOMPurify from 'dompurify';

// 안전한 HTML 렌더링
function SafeHTMLComponent({ htmlContent }: { htmlContent: string }) {
  const sanitizedHTML = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
  });

  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
}

// 사용 예시
export default function Page() {
  const userContent = "${htmlContent}";

  return <SafeHTMLComponent htmlContent={userContent} />;
}
`;
  }

  /**
   * Next.js용 CSP(Content Security Policy) 설정 생성
   */
  public generateCSPConfig(): string {
    return `
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
`;
  }

  /**
   * 입력 검증 및 이스케이프 유틸리티 생성
   */
  public generateEscapeUtilities(): string {
    return `
// utils/security.ts
export const securityUtils = {
  /**
   * HTML 특수 문자 이스케이프
   */
  escapeHTML(str: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
  },

  /**
   * JavaScript 문자열 이스케이프
   */
  escapeJS(str: string): string {
    return str
      .replace(/\\\\/g, '\\\\\\\\')
      .replace(/'/g, "\\\\'")
      .replace(/"/g, '\\\\"')
      .replace(/\\n/g, '\\\\n')
      .replace(/\\r/g, '\\\\r')
      .replace(/\\t/g, '\\\\t');
  },

  /**
   * URL 파라미터 이스케이프
   */
  escapeURL(str: string): string {
    return encodeURIComponent(str);
  },

  /**
   * 사용자 입력 검증
   */
  validateInput(input: string, maxLength: number = 1000): boolean {
    if (input.length > maxLength) return false;

    // 위험한 패턴 검사
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\\w+\\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(input));
  },
};
`;
  }
}
