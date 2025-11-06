import { EmbeddingGenerator } from '../embeddings/embedding-generator';
import { VectorDatabase } from '../vector-db/qdrant-client';

export interface RetrievalResult {
  content: string;
  score: number;
  framework?: string;
  url?: string;
  type: string;
}

/**
 * RAG Retriever
 * 쿼리에 대한 관련 문서 검색
 */
export class RAGRetriever {
  private embeddings: EmbeddingGenerator;
  private vectorDb: VectorDatabase;

  constructor() {
    this.embeddings = new EmbeddingGenerator();
    this.vectorDb = new VectorDatabase();
  }

  /**
   * 쿼리에 대한 관련 문서 검색
   */
  async retrieve(
    query: string,
    options: {
      limit?: number;
      minScore?: number;
      framework?: string;
      language?: string;
      includeExamples?: boolean;
    } = {}
  ): Promise<RetrievalResult[]> {
    const {
      limit = 5,
      minScore = 0.7,
      framework,
      language,
      includeExamples = true,
    } = options;

    try {
      // 쿼리 임베딩 생성
      const queryEmbedding = await this.embeddings.generateEmbedding(query);

      // 벡터 검색
      const results = await this.vectorDb.search(queryEmbedding, limit * 2, {
        framework,
        language,
      });

      // 필터링 및 정렬
      let filtered = results.filter((r) => r.score >= minScore);

      if (!includeExamples) {
        filtered = filtered.filter((r) => r.type !== 'example');
      }

      // 상위 N개 반환
      return filtered.slice(0, limit).map((r) => ({
        content: r.content,
        score: r.score,
        framework: r.framework,
        url: r.url,
        type: r.type,
      }));
    } catch (error) {
      console.error('❌ 검색 실패:', error);
      return [];
    }
  }

  /**
   * 컨텍스트 구성
   * 검색 결과를 프롬프트에 포함할 수 있는 형태로 변환
   */
  buildContext(results: RetrievalResult[]): string {
    if (results.length === 0) {
      return '';
    }

    let context = '다음은 관련 문서 및 예제입니다:\n\n';

    results.forEach((result, index) => {
      context += `[${index + 1}] ${result.type === 'example' ? '예제' : '문서'} (relevance: ${(result.score * 100).toFixed(1)}%)\n`;
      if (result.framework) {
        context += `프레임워크: ${result.framework}\n`;
      }
      if (result.url) {
        context += `출처: ${result.url}\n`;
      }
      context += `\n${result.content}\n\n`;
      context += '---\n\n';
    });

    return context;
  }

  /**
   * 하이브리드 검색 (키워드 + 시맨틱)
   */
  async hybridSearch(
    query: string,
    keywords: string[],
    options: {
      limit?: number;
      framework?: string;
    } = {}
  ): Promise<RetrievalResult[]> {
    // 시맨틱 검색
    const semanticResults = await this.retrieve(query, options);

    // 키워드 기반 부스팅
    const boosted = semanticResults.map((result) => {
      let boostScore = result.score;

      // 키워드가 포함되어 있으면 스코어 증가
      const content = result.content.toLowerCase();
      const matchedKeywords = keywords.filter((kw) => content.includes(kw.toLowerCase()));

      if (matchedKeywords.length > 0) {
        boostScore += matchedKeywords.length * 0.1;
      }

      return {
        ...result,
        score: Math.min(boostScore, 1.0), // 최대 1.0
      };
    });

    // 재정렬
    return boosted.sort((a, b) => b.score - a.score);
  }
}
