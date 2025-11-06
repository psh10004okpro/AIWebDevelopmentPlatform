import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { CodeGenerationPipeline } from './pipeline';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// 코드 생성 파이프라인 초기화
const pipeline = new CodeGenerationPipeline();

// 요청 스키마 검증
const GenerateRequestSchema = z.object({
  prompt: z.string().min(1, '프롬프트는 필수입니다'),
  language: z.enum(['typescript', 'javascript', 'react', 'css', 'html']),
  context: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  provider: z.enum(['claude', 'openai']).optional(),
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ai-orchestrator',
    providers: pipeline.getAvailableProviders(),
  });
});

// 코드 생성 엔드포인트
app.post('/generate', async (req: Request, res: Response) => {
  try {
    // 요청 검증
    const validatedData = GenerateRequestSchema.parse(req.body);

    // 코드 생성
    const result = await pipeline.generate(
      {
        prompt: validatedData.prompt,
        language: validatedData.language,
        context: validatedData.context,
        temperature: validatedData.temperature,
        maxTokens: validatedData.maxTokens,
      },
      validatedData.provider
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('코드 생성 오류:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: '잘못된 요청 형식',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '코드 생성 중 오류가 발생했습니다',
    });
  }
});

// 사용 가능한 Provider 목록
app.get('/providers', (req: Request, res: Response) => {
  res.json({
    providers: pipeline.getAvailableProviders(),
  });
});

app.listen(PORT, () => {
  console.log(`🤖 AI Orchestrator 서비스가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`사용 가능한 AI Providers: ${pipeline.getAvailableProviders().join(', ')}`);
});
