import { z, ZodSchema } from 'zod';

export interface ValidationCheckResult {
  isSafe: boolean;
  vulnerabilities: string[];
  recommendations: string[];
  generatedSchemas?: string;
}

export class InputValidation {
  /**
   * 입력 검증 구현 확인
   */
  public async checkCode(code: string): Promise<ValidationCheckResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // Zod 사용 여부 확인
    const hasZod = this.checkZodUsage(code);

    // API 엔드포인트에서 입력을 받는지 확인
    const hasInputHandling = this.checkInputHandling(code);

    // 직접적인 req.body 사용 (검증 없이)
    const hasUnvalidatedInput = this.checkUnvalidatedInput(code);

    if (hasInputHandling && !hasZod) {
      recommendations.push('Zod를 사용한 입력 검증을 추가하세요.');
    }

    if (hasUnvalidatedInput) {
      vulnerabilities.push('검증되지 않은 사용자 입력이 직접 사용되고 있습니다.');
      recommendations.push('모든 사용자 입력을 검증하세요.');
    }

    const generatedSchemas = this.generateValidationSchemas();

    return {
      isSafe: vulnerabilities.length === 0 && hasZod,
      vulnerabilities,
      recommendations,
      generatedSchemas,
    };
  }

  /**
   * Zod 사용 여부 확인
   */
  private checkZodUsage(code: string): boolean {
    const zodPatterns = [
      /from\s+['"]zod['"]/gi,
      /z\.(string|number|object|array)/gi,
      /\.parse\(/gi,
      /\.safeParse\(/gi,
    ];

    return zodPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * 입력 처리 확인
   */
  private checkInputHandling(code: string): boolean {
    const inputPatterns = [
      /req\.body/gi,
      /req\.query/gi,
      /req\.params/gi,
      /formData/gi,
    ];

    return inputPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * 검증되지 않은 입력 확인
   */
  private checkUnvalidatedInput(code: string): boolean {
    // req.body를 직접 사용하고 있지만 parse나 validate가 없는 경우
    const hasReqBody = /req\.body/gi.test(code);
    const hasValidation = /\.parse\(|\.safeParse\(|validate\(/gi.test(code);

    return hasReqBody && !hasValidation;
  }

  /**
   * 검증 스키마 예제 생성
   */
  private generateValidationSchemas(): string {
    return `
// ========================================
// Zod Validation Schemas
// ========================================

import { z } from 'zod';

// 1. 기본 스키마 예제
export const userSchema = z.object({
  id: z.string().uuid('유효한 UUID가 아닙니다'),
  email: z.string().email('유효한 이메일 주소가 아닙니다'),
  name: z.string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 최대 50자까지 가능합니다'),
  age: z.number()
    .int('정수만 가능합니다')
    .positive('양수만 가능합니다')
    .max(150, '유효하지 않은 나이입니다')
    .optional(),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
  createdAt: z.date().or(z.string().datetime()),
});

// 2. 프로젝트 생성 스키마
export const createProjectSchema = z.object({
  name: z.string()
    .min(1, '프로젝트 이름은 필수입니다')
    .max(100, '프로젝트 이름은 최대 100자까지 가능합니다')
    .regex(/^[a-zA-Z0-9-_]+$/, '영문, 숫자, -, _만 사용 가능합니다'),
  description: z.string()
    .max(500, '설명은 최대 500자까지 가능합니다')
    .optional(),
  language: z.enum(['typescript', 'javascript', 'python']),
  framework: z.enum(['react', 'vue', 'angular', 'nextjs']),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).max(10, '태그는 최대 10개까지 가능합니다').optional(),
});

// 3. AI 코드 생성 요청 스키마
export const generateCodeSchema = z.object({
  prompt: z.string()
    .min(10, '프롬프트는 최소 10자 이상이어야 합니다')
    .max(2000, '프롬프트는 최대 2000자까지 가능합니다'),
  language: z.enum(['typescript', 'javascript', 'python', 'html', 'css']),
  framework: z.enum(['react', 'vue', 'angular', 'nextjs', 'express']).optional(),
  context: z.string().max(5000).optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().max(8192).default(2048),
  enableRAG: z.boolean().default(true),
});

// 4. 파일 업데이트 스키마
export const updateFileSchema = z.object({
  fileId: z.string().uuid(),
  content: z.string()
    .max(100000, '파일 내용은 최대 100KB까지 가능합니다'),
  language: z.string(),
  path: z.string()
    .regex(/^[a-zA-Z0-9\\/._-]+$/, '유효하지 않은 파일 경로입니다'),
});

// 5. 로그인 스키마
export const loginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요'),
  password: z.string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/,
      '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다'
    ),
});

// 6. 페이지네이션 스키마
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ========================================
// Next.js API Routes에서 사용
// ========================================

import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// 1. 검증 미들웨어
export function withValidation<T extends z.ZodTypeAny>(schema: T) {
  return function (
    handler: (
      req: NextApiRequest & { validatedData: z.infer<T> },
      res: NextApiResponse
    ) => Promise<void>
  ) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // 요청 본문 검증
        const validatedData = schema.parse(req.body);

        // 검증된 데이터를 req에 추가
        (req as any).validatedData = validatedData;

        return handler(req as any, res);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: 'Validation failed',
            issues: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          });
        }

        return res.status(500).json({
          error: 'Internal server error',
        });
      }
    };
  };
}

// 2. API 엔드포인트 예제
// pages/api/projects/create.ts
import { withValidation } from '@/middleware/validation';
import { createProjectSchema } from '@/schemas/project';

const handler = async (
  req: NextApiRequest & { validatedData: z.infer<typeof createProjectSchema> },
  res: NextApiResponse
) => {
  const { name, description, language, framework } = req.validatedData;

  // 검증된 데이터로 안전하게 작업
  const project = await prisma.project.create({
    data: {
      name,
      description,
      language,
      framework,
      userId: req.session.user.id,
    },
  });

  return res.status(201).json(project);
};

export default withValidation(createProjectSchema)(handler);

// ========================================
// 3. Query 파라미터 검증
// ========================================

export function validateQuery<T extends z.ZodTypeAny>(
  query: any,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(query);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

// 사용 예시
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const queryResult = validateQuery(req.query, paginationSchema);

  if (!queryResult.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      issues: queryResult.errors.errors,
    });
  }

  const { page, limit, sortBy, sortOrder } = queryResult.data;

  // 검증된 쿼리 파라미터 사용
  const projects = await prisma.project.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: sortBy ? { [sortBy]: sortOrder } : undefined,
  });

  return res.status(200).json(projects);
}

// ========================================
// 4. 커스텀 검증 규칙
// ========================================

// 파일 크기 검증
export const fileSchema = z.object({
  name: z.string(),
  size: z.number().max(5 * 1024 * 1024, '파일 크기는 5MB 이하여야 합니다'),
  type: z.string().regex(/^(image|video|audio)\\//, '지원하지 않는 파일 형식입니다'),
});

// URL 검증
export const urlSchema = z.string().url('유효한 URL이 아닙니다').refine(
  (url) => {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  },
  { message: 'HTTP 또는 HTTPS 프로토콜만 허용됩니다' }
);

// 비밀번호 확인 검증
export const passwordConfirmSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

// 날짜 범위 검증
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: '종료일은 시작일보다 이후여야 합니다',
  path: ['endDate'],
});

// ========================================
// 5. 프론트엔드에서 동일한 스키마 사용
// ========================================

// components/CreateProjectForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema } from '@/schemas/project';

export function CreateProjectForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createProjectSchema),
  });

  const onSubmit = async (data: z.infer<typeof createProjectSchema>) => {
    const response = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    // ...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      {/* 기타 필드 */}
    </form>
  );
}
`;
  }

  /**
   * 일반적인 검증 패턴 생성
   */
  public generateCommonPatterns(): Record<string, ZodSchema> {
    return {
      email: z.string().email(),
      uuid: z.string().uuid(),
      url: z.string().url(),
      phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
      postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
      ipAddress: z.string().ip(),
      creditCard: z.string().regex(/^\d{4}-?\d{4}-?\d{4}-?\d{4}$/),
      hexColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
    };
  }
}
