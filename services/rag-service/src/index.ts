import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { RAGRetriever } from './rag/retriever';
import { VectorDatabase } from './vector-db/qdrant-client';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.RAG_SERVICE_PORT || 3005;

app.use(express.json());

const retriever = new RAGRetriever();
const vectorDb = new VectorDatabase();

// 검색 요청 스키마
const SearchRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().positive().optional(),
  minScore: z.number().min(0).max(1).optional(),
  framework: z.string().optional(),
  language: z.string().optional(),
  includeExamples: z.boolean().optional(),
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = await vectorDb.getStats();
    res.json({
      status: 'ok',
      service: 'rag-service',
      vectorDb: {
        pointsCount: stats.pointsCount,
        vectorsCount: stats.vectorsCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'rag-service',
      error: 'Vector DB 연결 실패',
    });
  }
});

// RAG 검색 엔드포인트
app.post('/search', async (req: Request, res: Response) => {
  try {
    const validatedData = SearchRequestSchema.parse(req.body);

    const results = await retriever.retrieve(validatedData.query, {
      limit: validatedData.limit,
      minScore: validatedData.minScore,
      framework: validatedData.framework,
      language: validatedData.language,
      includeExamples: validatedData.includeExamples,
    });

    // 컨텍스트 구성
    const context = retriever.buildContext(results);

    res.json({
      success: true,
      query: validatedData.query,
      results,
      context,
      count: results.length,
    });
  } catch (error) {
    console.error('검색 오류:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: '잘못된 요청 형식',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: '검색 중 오류가 발생했습니다',
    });
  }
});

// 벡터 DB 통계
app.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await vectorDb.getStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '통계 조회 실패',
    });
  }
});

// 서버 시작
app.listen(PORT, async () => {
  console.log(`🔍 RAG Service가 포트 ${PORT}에서 실행 중입니다`);

  // 벡터 DB 초기화
  try {
    await vectorDb.initialize();
    console.log('✅ Vector DB 연결 성공');
  } catch (error) {
    console.error('❌ Vector DB 연결 실패:', error);
  }
});
