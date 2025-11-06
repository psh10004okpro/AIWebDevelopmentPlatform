import { z } from 'zod';

export interface SQLInjectionCheckResult {
  isSafe: boolean;
  vulnerabilities: string[];
  fixedCode?: string;
  recommendations: string[];
}

export class SQLInjectionPrevention {
  /**
   * SQL 인젝션 취약점 패턴들
   */
  private readonly vulnerablePatterns = [
    // 문자열 연결을 통한 쿼리 생성
    /\$\{[^}]*\}.*?(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)/gi,
    /['"].*?\+.*?(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)/gi,
    // 직접 변수 삽입
    /query\s*=\s*['"`].*?\$\{/gi,
    /execute\s*\(\s*['"`].*?\+/gi,
    // 안전하지 않은 쿼리 실행
    /\.query\s*\(\s*['"`].*?\$\{/gi,
    /\.execute\s*\(\s*['"`].*?\+/gi,
  ];

  /**
   * 코드에서 SQL 인젝션 취약점 검사
   */
  public async checkCode(code: string): Promise<SQLInjectionCheckResult> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // 취약한 패턴 검색
    for (const pattern of this.vulnerablePatterns) {
      const matches = code.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          vulnerabilities.push(`취약한 SQL 쿼리 발견: ${match.substring(0, 50)}...`);
        });
      }
    }

    // Prisma/TypeORM 등 ORM 사용 여부 확인
    const hasORM = this.checkORMUsage(code);
    const hasParameterized = this.checkParameterizedQuery(code);

    if (!hasORM && !hasParameterized) {
      recommendations.push('Prisma, TypeORM 등 ORM 사용을 권장합니다.');
      recommendations.push('또는 매개변수화된 쿼리(Parameterized Query)를 사용하세요.');
    }

    // 취약점이 발견되면 수정된 코드 생성
    let fixedCode: string | undefined;
    if (vulnerabilities.length > 0) {
      fixedCode = this.generateFixedCode(code);
      recommendations.push('생성된 fixedCode를 확인하고 적용하세요.');
    }

    return {
      isSafe: vulnerabilities.length === 0,
      vulnerabilities,
      fixedCode,
      recommendations,
    };
  }

  /**
   * ORM 사용 여부 확인
   */
  private checkORMUsage(code: string): boolean {
    const ormPatterns = [
      /from\s+['"]@prisma\/client['"]/i,
      /from\s+['"]typeorm['"]/i,
      /prisma\./gi,
      /getRepository/gi,
      /\.findOne|\.findMany|\.create|\.update|\.delete/gi,
    ];

    return ormPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * 매개변수화된 쿼리 사용 여부 확인
   */
  private checkParameterizedQuery(code: string): boolean {
    const parameterizedPatterns = [
      /\?/g, // Placeholder
      /\$\d+/g, // PostgreSQL style ($1, $2)
      /:\w+/g, // Named parameters
      /query\s*\(\s*['"`][^'"`]*['"`]\s*,\s*\[/gi, // query('SELECT ...', [params])
    ];

    return parameterizedPatterns.some((pattern) => pattern.test(code));
  }

  /**
   * 취약한 코드를 안전한 코드로 변환
   */
  private generateFixedCode(code: string): string {
    let fixed = code;

    // 문자열 연결을 매개변수화된 쿼리로 변환
    fixed = fixed.replace(
      /query\s*=\s*['"`](.+?)\$\{(.+?)\}(.+?)['"`]/gi,
      (match, before, variable, after) => {
        return `query = \`${before}?${after}\`;\nconst params = [${variable}];`;
      }
    );

    // Prisma 예제 추가
    if (!this.checkORMUsage(fixed)) {
      fixed = `// 권장: Prisma ORM 사용 예제\n// const user = await prisma.user.findUnique({\n//   where: { id: userId }\n// });\n\n${fixed}`;
    }

    return fixed;
  }

  /**
   * Prisma를 사용한 안전한 쿼리 예제 생성
   */
  public generatePrismaExample(modelName: string, operation: 'findMany' | 'findUnique' | 'create' | 'update' | 'delete'): string {
    const examples: Record<typeof operation, string> = {
      findMany: `
// 안전한 Prisma 쿼리 예제
const ${modelName.toLowerCase()}s = await prisma.${modelName.toLowerCase()}.findMany({
  where: {
    // 조건을 객체로 전달 (자동으로 이스케이프됨)
    status: 'active'
  },
  take: 10,
  skip: 0,
});`,
      findUnique: `
// 안전한 Prisma 쿼리 예제
const ${modelName.toLowerCase()} = await prisma.${modelName.toLowerCase()}.findUnique({
  where: {
    id: userId // 매개변수로 전달 (자동으로 이스케이프됨)
  },
});`,
      create: `
// 안전한 Prisma 쿼리 예제
const ${modelName.toLowerCase()} = await prisma.${modelName.toLowerCase()}.create({
  data: {
    // 데이터를 객체로 전달 (자동으로 이스케이프됨)
    name: userName,
    email: userEmail,
  },
});`,
      update: `
// 안전한 Prisma 쿼리 예제
const ${modelName.toLowerCase()} = await prisma.${modelName.toLowerCase()}.update({
  where: {
    id: userId
  },
  data: {
    // 업데이트할 데이터를 객체로 전달
    name: newName,
  },
});`,
      delete: `
// 안전한 Prisma 쿼리 예제
const ${modelName.toLowerCase()} = await prisma.${modelName.toLowerCase()}.delete({
  where: {
    id: userId
  },
});`,
    };

    return examples[operation];
  }

  /**
   * SQL 쿼리 검증 스키마 생성
   */
  public generateValidationSchema(fields: Array<{ name: string; type: 'string' | 'number' | 'email' | 'uuid' }>) {
    const schemaFields: Record<string, any> = {};

    fields.forEach((field) => {
      switch (field.type) {
        case 'string':
          schemaFields[field.name] = z.string().min(1).max(255);
          break;
        case 'number':
          schemaFields[field.name] = z.number().int().positive();
          break;
        case 'email':
          schemaFields[field.name] = z.string().email();
          break;
        case 'uuid':
          schemaFields[field.name] = z.string().uuid();
          break;
      }
    });

    return z.object(schemaFields);
  }
}
