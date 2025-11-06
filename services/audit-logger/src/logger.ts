import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

export enum AuditAction {
  // 사용자 액션
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTER = 'USER_REGISTER',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',

  // 프로젝트 관리
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  PROJECT_DELETE = 'PROJECT_DELETE',
  PROJECT_SHARE = 'PROJECT_SHARE',

  // 코드 생성
  CODE_GENERATE = 'CODE_GENERATE',
  CODE_EDIT = 'CODE_EDIT',
  CODE_DELETE = 'CODE_DELETE',
  CODE_EXPORT = 'CODE_EXPORT',

  // AI 작업
  AI_REQUEST = 'AI_REQUEST',
  AI_RESPONSE = 'AI_RESPONSE',
  AI_ERROR = 'AI_ERROR',

  // 보안 관련
  SECURITY_CHECK = 'SECURITY_CHECK',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  AUTH_FAILURE = 'AUTH_FAILURE',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // 데이터 보호 (PIPA 준수)
  PERSONAL_DATA_ACCESS = 'PERSONAL_DATA_ACCESS',
  PERSONAL_DATA_EXPORT = 'PERSONAL_DATA_EXPORT',
  PERSONAL_DATA_DELETE = 'PERSONAL_DATA_DELETE',
  CONSENT_UPDATE = 'CONSENT_UPDATE',

  // 시스템
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userIp?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  sessionId?: string;
  complianceTag?: string; // PIPA, GDPR 등
}

/**
 * 엔터프라이즈 감사 로그 시스템
 */
export class AuditLogger {
  private logger: winston.Logger;

  constructor() {
    const logsDir = process.env.AUDIT_LOGS_DIR || path.join(process.cwd(), 'logs');

    // Winston 로거 설정
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'audit-logger' },
      transports: [
        // 일반 로그 (일별 로테이션)
        new DailyRotateFile({
          filename: path.join(logsDir, 'audit-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '90d', // 90일 보관 (규정 준수)
        }),

        // 보안 관련 로그 (별도 보관)
        new DailyRotateFile({
          filename: path.join(logsDir, 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '365d', // 1년 보관 (보안 규정)
          level: 'warn',
        }),

        // PIPA 준수 로그 (개인정보 관련)
        new DailyRotateFile({
          filename: path.join(logsDir, 'pipa-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '2190d', // 6년 보관 (개인정보보호법 제21조)
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format((info) => {
              // PIPA 관련 로그만 필터링
              return info.complianceTag === 'PIPA' ? info : false;
            })()
          ),
        }),

        // 콘솔 출력 (개발 환경)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
          silent: process.env.NODE_ENV === 'production',
        }),
      ],
    });
  }

  /**
   * 감사 로그 기록
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
      id: entry.id || this.generateId(),
    };

    // 민감 정보 마스킹
    const sanitizedEntry = this.sanitizeSensitiveData(logEntry);

    // Severity에 따라 로그 레벨 결정
    const level = this.getSeverityLevel(entry.severity);

    this.logger.log(level, entry.description, sanitizedEntry);

    // 데이터베이스에도 저장 (선택적)
    if (process.env.AUDIT_DB_ENABLED === 'true') {
      await this.saveToDatabase(sanitizedEntry);
    }
  }

  /**
   * 민감 정보 마스킹
   */
  private sanitizeSensitiveData(entry: AuditLogEntry): AuditLogEntry {
    const sanitized = { ...entry };

    // 이메일 부분 마스킹
    if (sanitized.userEmail) {
      const [local, domain] = sanitized.userEmail.split('@');
      sanitized.userEmail = `${local.substring(0, 2)}***@${domain}`;
    }

    // 메타데이터에서 민감 키 제거
    if (sanitized.metadata) {
      const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];
      sensitiveKeys.forEach((key) => {
        if (sanitized.metadata![key]) {
          sanitized.metadata![key] = '***REDACTED***';
        }
      });
    }

    return sanitized;
  }

  /**
   * Severity를 Winston 로그 레벨로 변환
   */
  private getSeverityLevel(severity: AuditSeverity): string {
    const levelMap: Record<AuditSeverity, string> = {
      [AuditSeverity.INFO]: 'info',
      [AuditSeverity.WARNING]: 'warn',
      [AuditSeverity.ERROR]: 'error',
      [AuditSeverity.CRITICAL]: 'error',
    };

    return levelMap[severity] || 'info';
  }

  /**
   * 데이터베이스에 저장 (Prisma)
   */
  private async saveToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      // TODO: Prisma를 사용하여 DB에 저장
      // await prisma.auditLog.create({ data: entry });
    } catch (error) {
      console.error('Failed to save audit log to database:', error);
    }
  }

  /**
   * 고유 ID 생성
   */
  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * 사용자 로그인 기록
   */
  async logUserLogin(userId: string, email: string, ip: string, success: boolean): Promise<void> {
    await this.log({
      action: AuditAction.USER_LOGIN,
      severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
      userId,
      userEmail: email,
      userIp: ip,
      description: success ? 'User logged in successfully' : 'Failed login attempt',
      success,
      timestamp: new Date(),
    });
  }

  /**
   * AI 요청 기록
   */
  async logAIRequest(
    userId: string,
    model: string,
    prompt: string,
    tokens: number,
    success: boolean
  ): Promise<void> {
    await this.log({
      action: AuditAction.AI_REQUEST,
      severity: AuditSeverity.INFO,
      userId,
      resource: 'AI Model',
      resourceId: model,
      description: `AI code generation request`,
      metadata: {
        model,
        promptLength: prompt.length,
        tokens,
      },
      success,
      timestamp: new Date(),
    });
  }

  /**
   * 개인정보 접근 기록 (PIPA 준수)
   */
  async logPersonalDataAccess(
    userId: string,
    targetUserId: string,
    purpose: string,
    dataTypes: string[]
  ): Promise<void> {
    await this.log({
      action: AuditAction.PERSONAL_DATA_ACCESS,
      severity: AuditSeverity.INFO,
      userId,
      resourceId: targetUserId,
      description: `Personal data accessed: ${purpose}`,
      metadata: {
        purpose,
        dataTypes,
        legalBasis: 'User Consent', // 동의 근거
      },
      success: true,
      complianceTag: 'PIPA',
      timestamp: new Date(),
    });
  }

  /**
   * 보안 위반 기록
   */
  async logSecurityViolation(
    userId: string,
    violationType: string,
    details: string,
    ip: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.SECURITY_VIOLATION,
      severity: AuditSeverity.CRITICAL,
      userId,
      userIp: ip,
      description: `Security violation detected: ${violationType}`,
      metadata: {
        violationType,
        details,
      },
      success: false,
      timestamp: new Date(),
    });
  }

  /**
   * 코드 생성 기록
   */
  async logCodeGeneration(
    userId: string,
    projectId: string,
    language: string,
    linesOfCode: number,
    success: boolean
  ): Promise<void> {
    await this.log({
      action: AuditAction.CODE_GENERATE,
      severity: AuditSeverity.INFO,
      userId,
      resource: 'Project',
      resourceId: projectId,
      description: `Generated ${linesOfCode} lines of ${language} code`,
      metadata: {
        language,
        linesOfCode,
      },
      success,
      timestamp: new Date(),
    });
  }
}

// 싱글톤 인스턴스
export const auditLogger = new AuditLogger();
