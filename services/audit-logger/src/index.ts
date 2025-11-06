import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { z } from 'zod';
import { auditLogger, AuditAction, AuditSeverity, AuditLogEntry } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.AUDIT_LOGGER_PORT || 3007;

// 미들웨어
app.use(cors());
app.use(compression());
app.use(express.json());

// 로그 엔트리 스키마
const AuditLogEntrySchema = z.object({
  action: z.nativeEnum(AuditAction),
  severity: z.nativeEnum(AuditSeverity).default(AuditSeverity.INFO),
  userId: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().email().optional(),
  userIp: z.string().optional(),
  userAgent: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  sessionId: z.string().optional(),
  complianceTag: z.string().optional(),
});

/**
 * 감사 로그 기록
 */
app.post('/log', async (req: Request, res: Response) => {
  try {
    const validatedEntry = AuditLogEntrySchema.parse(req.body);

    await auditLogger.log({
      ...validatedEntry,
      timestamp: new Date(),
      userIp: validatedEntry.userIp || req.ip,
      userAgent: validatedEntry.userAgent || req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Audit log recorded successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        issues: error.errors,
      });
    }

    console.error('Failed to record audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record audit log',
    });
  }
});

/**
 * 사용자 로그인 기록
 */
app.post('/log/user-login', async (req: Request, res: Response) => {
  try {
    const { userId, email, success } = req.body;
    const ip = req.ip || 'unknown';

    await auditLogger.logUserLogin(userId, email, ip, success);

    res.status(201).json({
      success: true,
      message: 'Login event logged',
    });
  } catch (error) {
    console.error('Failed to log user login:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log login event',
    });
  }
});

/**
 * AI 요청 기록
 */
app.post('/log/ai-request', async (req: Request, res: Response) => {
  try {
    const { userId, model, prompt, tokens, success } = req.body;

    await auditLogger.logAIRequest(userId, model, prompt, tokens, success);

    res.status(201).json({
      success: true,
      message: 'AI request logged',
    });
  } catch (error) {
    console.error('Failed to log AI request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log AI request',
    });
  }
});

/**
 * 개인정보 접근 기록 (PIPA 준수)
 */
app.post('/log/personal-data-access', async (req: Request, res: Response) => {
  try {
    const { userId, targetUserId, purpose, dataTypes } = req.body;

    await auditLogger.logPersonalDataAccess(userId, targetUserId, purpose, dataTypes);

    res.status(201).json({
      success: true,
      message: 'Personal data access logged (PIPA compliant)',
    });
  } catch (error) {
    console.error('Failed to log personal data access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log personal data access',
    });
  }
});

/**
 * 보안 위반 기록
 */
app.post('/log/security-violation', async (req: Request, res: Response) => {
  try {
    const { userId, violationType, details } = req.body;
    const ip = req.ip || 'unknown';

    await auditLogger.logSecurityViolation(userId, violationType, details, ip);

    res.status(201).json({
      success: true,
      message: 'Security violation logged',
    });
  } catch (error) {
    console.error('Failed to log security violation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log security violation',
    });
  }
});

/**
 * 코드 생성 기록
 */
app.post('/log/code-generation', async (req: Request, res: Response) => {
  try {
    const { userId, projectId, language, linesOfCode, success } = req.body;

    await auditLogger.logCodeGeneration(userId, projectId, language, linesOfCode, success);

    res.status(201).json({
      success: true,
      message: 'Code generation logged',
    });
  } catch (error) {
    console.error('Failed to log code generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log code generation',
    });
  }
});

/**
 * 감사 로그 액션 목록
 */
app.get('/actions', (req: Request, res: Response) => {
  res.json({
    actions: Object.values(AuditAction),
    severities: Object.values(AuditSeverity),
  });
});

/**
 * 헬스 체크
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'audit-logger',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 서비스 정보
 */
app.get('/info', (req: Request, res: Response) => {
  res.json({
    service: 'Audit Logger',
    version: '1.0.0',
    description: 'Enterprise-grade audit logging service for compliance and security',
    features: [
      'User action tracking',
      'AI request logging',
      'Security violation monitoring',
      'PIPA compliance (개인정보보호법)',
      'Daily log rotation',
      'Long-term retention (6 years for PIPA)',
      'Sensitive data masking',
    ],
    compliance: {
      PIPA: 'Korean Personal Information Protection Act',
      retention: {
        general: '90 days',
        security: '365 days',
        personal_data: '2190 days (6 years)',
      },
    },
    endpoints: {
      log: 'POST /log - Generic audit log',
      userLogin: 'POST /log/user-login - User login events',
      aiRequest: 'POST /log/ai-request - AI generation requests',
      personalDataAccess: 'POST /log/personal-data-access - Personal data access (PIPA)',
      securityViolation: 'POST /log/security-violation - Security violations',
      codeGeneration: 'POST /log/code-generation - Code generation events',
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
  console.log(`📋 Audit Logger service listening on port ${PORT}`);
  console.log(`🔒 PIPA compliance enabled (6-year retention for personal data logs)`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/info`);
});

export default app;
