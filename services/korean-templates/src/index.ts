import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { koreanTemplates, getTemplateById, getTemplatesByCategory, searchTemplatesByTag } from './templates';

dotenv.config();

const app = express();
const PORT = process.env.KOREAN_TEMPLATES_PORT || 3008;

// 미들웨어
app.use(cors());
app.use(express.json());

/**
 * 모든 템플릿 목록
 */
app.get('/templates', (req: Request, res: Response) => {
  const { category, tag, language } = req.query;

  let results = koreanTemplates;

  if (category) {
    results = getTemplatesByCategory(category as any);
  }

  if (tag) {
    results = searchTemplatesByTag(tag as string);
  }

  if (language) {
    results = results.filter((t) => t.language === language);
  }

  res.json({
    success: true,
    count: results.length,
    templates: results.map((t) => ({
      id: t.id,
      name: t.name,
      nameKo: t.nameKo,
      category: t.category,
      description: t.description,
      descriptionKo: t.descriptionKo,
      language: t.language,
      framework: t.framework,
      features: t.features,
      tags: t.tags,
    })),
  });
});

/**
 * 특정 템플릿 상세 조회
 */
app.get('/templates/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const template = getTemplateById(id);

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found',
      message: '템플릿을 찾을 수 없습니다.',
    });
  }

  res.json({
    success: true,
    template,
  });
});

/**
 * 템플릿 카테고리 목록
 */
app.get('/categories', (req: Request, res: Response) => {
  const categories = [
    { id: 'ecommerce', name: '이커머스', nameEn: 'E-commerce' },
    { id: 'chatbot', name: '챗봇', nameEn: 'Chatbot' },
    { id: 'payment', name: '결제', nameEn: 'Payment' },
    { id: 'government', name: '정부/공공', nameEn: 'Government' },
    { id: 'admin', name: '관리자', nameEn: 'Admin' },
    { id: 'auth', name: '인증', nameEn: 'Authentication' },
  ];

  res.json({
    success: true,
    categories,
  });
});

/**
 * 인기 태그 목록
 */
app.get('/tags', (req: Request, res: Response) => {
  const allTags = koreanTemplates.flatMap((t) => t.tags);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const popularTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  res.json({
    success: true,
    tags: popularTags,
  });
});

/**
 * 템플릿 통계
 */
app.get('/stats', (req: Request, res: Response) => {
  const stats = {
    totalTemplates: koreanTemplates.length,
    byCategory: koreanTemplates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byLanguage: koreanTemplates.reduce((acc, t) => {
      acc[t.language] = (acc[t.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byFramework: koreanTemplates.reduce((acc, t) => {
      acc[t.framework] = (acc[t.framework] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  res.json({
    success: true,
    stats,
  });
});

/**
 * 헬스 체크
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'korean-templates',
    timestamp: new Date().toISOString(),
    templatesAvailable: koreanTemplates.length,
  });
});

/**
 * 서비스 정보
 */
app.get('/info', (req: Request, res: Response) => {
  res.json({
    service: 'Korean Templates Service',
    version: '1.0.0',
    description: 'Korean market specialized code templates',
    features: [
      'Naver Smart Store integration',
      'Kakao Talk chatbot',
      'Toss Payments integration',
      'Government24 API',
      'Korean Admin Dashboard',
    ],
    templates: koreanTemplates.length,
    endpoints: {
      list: 'GET /templates - List all templates',
      detail: 'GET /templates/:id - Get template details',
      categories: 'GET /categories - List categories',
      tags: 'GET /tags - Popular tags',
      stats: 'GET /stats - Template statistics',
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
  console.log(`🇰🇷 Korean Templates service listening on port ${PORT}`);
  console.log(`📦 ${koreanTemplates.length} templates available`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/info`);
});

export default app;
