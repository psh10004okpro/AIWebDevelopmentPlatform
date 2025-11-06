import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { CodeGenerationPipeline } from './pipeline';
import { ModelRouter, TaskComplexity } from './router/model-router';
import { ContextManager } from './context/context-manager';
import { TokenTracker } from './tracking/token-tracker';
import { z } from 'zod';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// 서비스 초기화
const pipeline = new CodeGenerationPipeline();
const modelRouter = new ModelRouter();
const contextManager = new ContextManager();
const tokenTracker = new TokenTracker();

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:3005';

// 요청 스키마 검증
const GenerateRequestSchema = z.object({
  prompt: z.string().min(1, '프롬프트는 필수입니다'),
  language: z.enum(['typescript', 'javascript', 'react', 'css', 'html']),
  context: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  provider: z.enum(['claude', 'openai']).optional(),
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  useRAG: z.boolean().optional().default(true),
  complexity: z.nativeEnum(TaskComplexity).optional(),
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ai-orchestrator',
    providers: pipeline.getAvailableProviders(),
  });
});

// 코드 생성 엔드포인트 (RAG + 모델 라우팅 통합)
app.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // 요청 검증
    const validatedData = GenerateRequestSchema.parse(req.body);
    const sessionId = validatedData.sessionId || `session-${Date.now()}`;

    // 1. 컨텍스트 관리
    contextManager.addMessage(sessionId, 'user', validatedData.prompt);

    // 2. RAG 검색 (선택적)
    let ragContext = '';
    if (validatedData.useRAG) {
      try {
        const ragResponse = await axios.post(`${RAG_SERVICE_URL}/search`, {
          query: validatedData.prompt,
          limit: 3,
          language: validatedData.language,
          includeExamples: true,
        });

        if (ragResponse.data.success) {
          ragContext = ragResponse.data.context;
        }
      } catch (error) {
        console.warn('RAG 검색 실패, 계속 진행:', error);
      }
    }

    // 3. 작업 복잡도 추론
    const complexity =
      validatedData.complexity ||
      modelRouter.inferComplexity(
        validatedData.prompt,
        validatedData.context || ragContext
      );

    const modelConfig = modelRouter.getModelConfig(complexity);

    console.log(`🎯 작업 복잡도: ${complexity}`);
    console.log(`🤖 선택된 모델: ${modelConfig.provider}/${modelConfig.model}`);

    // 4. 전체 컨텍스트 구성
    const fullContext = [
      validatedData.context,
      ragContext,
      contextManager.buildPrompt(sessionId, false),
    ]
      .filter(Boolean)
      .join('\n\n');

    // 5. 코드 생성
    const result = await pipeline.generate(
      {
        prompt: validatedData.prompt,
        language: validatedData.language,
        context: fullContext,
        temperature: validatedData.temperature || modelConfig.temperature,
        maxTokens: validatedData.maxTokens || modelConfig.maxTokens,
      },
      modelConfig.provider
    );

    // 6. 응답 컨텍스트에 추가
    contextManager.addMessage(sessionId, 'assistant', result.code, result.tokens);

    // 7. 토큰 사용량 추적
    if (result.tokens) {
      await tokenTracker.trackUsage({
        sessionId,
        model: result.model,
        inputTokens: Math.floor(result.tokens * 0.4),
        outputTokens: Math.floor(result.tokens * 0.6),
        totalTokens: result.tokens,
        estimatedCost: tokenTracker.calculateCost(
          result.model,
          Math.floor(result.tokens * 0.4),
          Math.floor(result.tokens * 0.6)
        ),
        timestamp: Date.now(),
      });
    }

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        ...result,
        complexity,
        sessionId,
        duration,
        ragUsed: !!ragContext,
      },
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
    providers: modelRouter.getAvailableProviders(),
  });
});

// 토큰 사용량 통계
app.get('/stats/tokens/:sessionId', async (req: Request, res: Response) => {
  try {
    const usage = await tokenTracker.getSessionUsage(req.params.sessionId);
    res.json({
      success: true,
      usage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '통계 조회 실패',
    });
  }
});

// 실시간 통계
app.get('/stats/realtime', async (req: Request, res: Response) => {
  try {
    const stats = await tokenTracker.getRealtimeStats();
    const contextStats = contextManager.getStats();

    res.json({
      success: true,
      stats: {
        ...stats,
        contexts: contextStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '통계 조회 실패',
    });
  }
});

// 비용 추정
app.post('/estimate-cost', (req: Request, res: Response) => {
  try {
    const { prompt, context, complexity } = req.body;

    const taskComplexity =
      complexity || modelRouter.inferComplexity(prompt, context);

    const modelConfig = modelRouter.getModelConfig(taskComplexity);
    const promptLength = (prompt?.length || 0) + (context?.length || 0);

    const estimate = tokenTracker.estimateCost(modelConfig.model, promptLength);

    res.json({
      success: true,
      complexity: taskComplexity,
      model: `${modelConfig.provider}/${modelConfig.model}`,
      estimate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '비용 추정 실패',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 AI Orchestrator 서비스가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`사용 가능한 AI Providers: ${modelRouter.getAvailableProviders().join(', ')}`);
  console.log(`✨ RAG 서비스 연결: ${RAG_SERVICE_URL}`);
});
