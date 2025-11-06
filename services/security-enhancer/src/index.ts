import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { z } from 'zod';
import { SQLInjectionPrevention } from './modules/sql-injection-prevention';
import { XSSPrevention } from './modules/xss-prevention';
import { CSRFProtection } from './modules/csrf-protection';
import { RateLimiting } from './modules/rate-limiting';
import { InputValidation } from './modules/input-validation';

dotenv.config();

const app = express();
const PORT = process.env.SECURITY_ENHANCER_PORT || 3006;

// 미들웨어
app.use(helmet()); // 보안 헤더 설정
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 서비스 인스턴스 생성
const sqlInjectionPrevention = new SQLInjectionPrevention();
const xssPrevention = new XSSPrevention();
const csrfProtection = new CSRFProtection();
const rateLimiting = new RateLimiting();
const inputValidation = new InputValidation();

// 요청 스키마
const securityCheckSchema = z.object({
  code: z.string().min(1, '코드가 필요합니다'),
  language: z.enum(['typescript', 'javascript', 'python']).default('typescript'),
  checks: z.array(z.enum(['sql-injection', 'xss', 'csrf', 'rate-limit', 'input-validation'])).optional(),
});

/**
 * 전체 보안 검사
 */
app.post('/check', async (req: Request, res: Response) => {
  try {
    const { code, language, checks } = securityCheckSchema.parse(req.body);

    const enabledChecks = checks || ['sql-injection', 'xss', 'csrf', 'rate-limit', 'input-validation'];

    const results: any = {
      overallSafe: true,
      timestamp: new Date().toISOString(),
      language,
      checks: {},
    };

    // SQL Injection 검사
    if (enabledChecks.includes('sql-injection')) {
      const sqlResult = await sqlInjectionPrevention.checkCode(code);
      results.checks.sqlInjection = sqlResult;
      if (!sqlResult.isSafe) results.overallSafe = false;
    }

    // XSS 검사
    if (enabledChecks.includes('xss')) {
      const xssResult = await xssPrevention.checkCode(code);
      results.checks.xss = xssResult;
      if (!xssResult.isSafe) results.overallSafe = false;
    }

    // CSRF 검사
    if (enabledChecks.includes('csrf')) {
      const csrfResult = await csrfProtection.checkCode(code);
      results.checks.csrf = csrfResult;
      if (!csrfResult.isSafe) results.overallSafe = false;
    }

    // Rate Limiting 검사
    if (enabledChecks.includes('rate-limit')) {
      const rateLimitResult = await rateLimiting.checkCode(code);
      results.checks.rateLimit = rateLimitResult;
      if (!rateLimitResult.isSafe) results.overallSafe = false;
    }

    // Input Validation 검사
    if (enabledChecks.includes('input-validation')) {
      const validationResult = await inputValidation.checkCode(code);
      results.checks.inputValidation = validationResult;
      if (!validationResult.isSafe) results.overallSafe = false;
    }

    // 전체 보안 점수 계산
    const totalChecks = Object.keys(results.checks).length;
    const safeChecks = Object.values(results.checks).filter((check: any) => check.isSafe).length;
    results.securityScore = Math.round((safeChecks / totalChecks) * 100);

    // 전체 권장사항 수집
    results.allRecommendations = Object.values(results.checks)
      .flatMap((check: any) => check.recommendations || [])
      .filter((rec, index, self) => self.indexOf(rec) === index); // 중복 제거

    return res.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: error.errors,
      });
    }

    console.error('Security check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * SQL Injection 검사 전용
 */
app.post('/check/sql-injection', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await sqlInjectionPrevention.checkCode(code);
    return res.json(result);
  } catch (error) {
    console.error('SQL injection check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * XSS 검사 전용
 */
app.post('/check/xss', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await xssPrevention.checkCode(code);
    return res.json(result);
  } catch (error) {
    console.error('XSS check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * HTML 정제
 */
app.post('/sanitize/html', async (req: Request, res: Response) => {
  try {
    const { html, config } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    const sanitized = xssPrevention.sanitizeHTML(html, config);

    return res.json({
      original: html,
      sanitized,
      isSame: html === sanitized,
    });
  } catch (error) {
    console.error('HTML sanitization error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * CSRF 토큰 생성
 */
app.get('/csrf/generate-token', (req: Request, res: Response) => {
  try {
    const token = csrfProtection.generateToken();

    return res.json({
      csrfToken: token,
      expiresIn: 3600, // 1시간
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 검증 스키마 생성
 */
app.post('/generate/validation-schema', async (req: Request, res: Response) => {
  try {
    const { fields } = req.body;

    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Fields array is required' });
    }

    const schema = sqlInjectionPrevention.generateValidationSchema(fields);

    return res.json({
      schema: schema.toString(),
      fields,
    });
  } catch (error) {
    console.error('Schema generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 보안 강화 코드 생성
 */
app.post('/generate/secure-code', async (req: Request, res: Response) => {
  try {
    const { code, type } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    let secureCode = code;
    const applied: string[] = [];

    // SQL Injection 방지
    if (!type || type === 'all' || type === 'sql') {
      const sqlResult = await sqlInjectionPrevention.checkCode(code);
      if (sqlResult.fixedCode) {
        secureCode = sqlResult.fixedCode;
        applied.push('SQL Injection Prevention');
      }
    }

    // XSS 방지
    if (!type || type === 'all' || type === 'xss') {
      const xssResult = await xssPrevention.checkCode(secureCode);
      if (xssResult.fixedCode) {
        secureCode = xssResult.fixedCode;
        applied.push('XSS Prevention');
      }
    }

    return res.json({
      originalCode: code,
      secureCode,
      applied,
      improvements: applied.length,
    });
  } catch (error) {
    console.error('Secure code generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 보안 구현 예제 생성
 */
app.get('/examples/:type', (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    let example = '';

    switch (type) {
      case 'sql-injection':
        example = sqlInjectionPrevention.generatePrismaExample('User', 'findMany');
        break;
      case 'xss':
        example = xssPrevention.generateReactExample('<p>User content</p>');
        break;
      case 'csp':
        example = xssPrevention.generateCSPConfig();
        break;
      case 'csrf':
        example = csrfProtection.generateDoubleSubmitPattern();
        break;
      case 'rate-limit':
        example = rateLimiting.generateSlidingWindowImplementation();
        break;
      case 'validation':
        example = inputValidation.generateValidationSchemas();
        break;
      case 'escape-utils':
        example = xssPrevention.generateEscapeUtilities();
        break;
      default:
        return res.status(404).json({
          error: 'Example not found',
          availableTypes: [
            'sql-injection',
            'xss',
            'csp',
            'csrf',
            'rate-limit',
            'validation',
            'escape-utils',
          ],
        });
    }

    return res.json({
      type,
      example,
    });
  } catch (error) {
    console.error('Example generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 헬스 체크
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'security-enhancer',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 서비스 정보
 */
app.get('/info', (req: Request, res: Response) => {
  res.json({
    service: 'Security Enhancer',
    version: '1.0.0',
    description: 'Automated security enhancement for generated code',
    features: [
      'SQL Injection Prevention',
      'XSS Prevention with DOMPurify',
      'CSRF Protection',
      'Rate Limiting',
      'Input Validation with Zod',
    ],
    endpoints: {
      check: 'POST /check - Comprehensive security check',
      sqlInjection: 'POST /check/sql-injection - SQL injection check',
      xss: 'POST /check/xss - XSS vulnerability check',
      sanitize: 'POST /sanitize/html - HTML sanitization',
      csrf: 'GET /csrf/generate-token - Generate CSRF token',
      generateSchema: 'POST /generate/validation-schema - Generate Zod schema',
      secureCode: 'POST /generate/secure-code - Generate secure code',
      examples: 'GET /examples/:type - Get implementation examples',
    },
  });
});

// 에러 핸들링 미들웨어
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 핸들러
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🔒 Security Enhancer service listening on port ${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/info`);
});

export default app;
