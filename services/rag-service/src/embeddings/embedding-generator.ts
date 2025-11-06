import OpenAI from 'openai';
import { LRUCache } from 'lru-cache';

/**
 * 임베딩 생성기
 * OpenAI의 text-embedding-3-small 모델 사용
 */
export class EmbeddingGenerator {
  private client: OpenAI;
  private model: string;
  private cache: LRUCache<string, number[]>;

  constructor(apiKey: string = process.env.OPENAI_API_KEY || '') {
    this.client = new OpenAI({ apiKey });
    this.model = 'text-embedding-3-small'; // 768 dimensions

    // 캐싱 (최대 1000개 임베딩)
    this.cache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 60 * 24, // 24시간
    });
  }

  /**
   * 텍스트를 임베딩으로 변환
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // 캐시 확인
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;

      // 캐시에 저장
      this.cache.set(text, embedding);

      return embedding;
    } catch (error) {
      console.error('❌ 임베딩 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 배치 임베딩 생성
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // 캐시되지 않은 텍스트만 필터링
      const uncachedTexts: string[] = [];
      const cachedEmbeddings: Map<number, number[]> = new Map();

      texts.forEach((text, index) => {
        const cached = this.cache.get(text);
        if (cached) {
          cachedEmbeddings.set(index, cached);
        } else {
          uncachedTexts.push(text);
        }
      });

      // API 호출 (캐시되지 않은 것만)
      let newEmbeddings: number[][] = [];
      if (uncachedTexts.length > 0) {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: uncachedTexts,
          encoding_format: 'float',
        });

        newEmbeddings = response.data.map((d) => d.embedding);

        // 캐시에 저장
        uncachedTexts.forEach((text, i) => {
          this.cache.set(text, newEmbeddings[i]);
        });
      }

      // 결과 병합 (원래 순서대로)
      const results: number[][] = [];
      let newEmbeddingIndex = 0;

      texts.forEach((text, index) => {
        if (cachedEmbeddings.has(index)) {
          results.push(cachedEmbeddings.get(index)!);
        } else {
          results.push(newEmbeddings[newEmbeddingIndex++]);
        }
      });

      return results;
    } catch (error) {
      console.error('❌ 배치 임베딩 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 코드 청크를 임베딩하기 좋은 크기로 분할
   */
  chunkCode(code: string, maxLength: number = 512): string[] {
    const lines = code.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const line of lines) {
      const lineLength = line.length;

      if (currentLength + lineLength > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [line];
        currentLength = lineLength;
      } else {
        currentChunk.push(line);
        currentLength += lineLength;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }

    return chunks;
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitRate: this.cache.calculatedSize / (this.cache.max || 1),
    };
  }
}
