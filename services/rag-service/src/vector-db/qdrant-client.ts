import { QdrantClient } from '@qdrant/js-client-rest';

export class VectorDatabase {
  private client: QdrantClient;
  private collectionName: string;

  constructor(url: string = process.env.QDRANT_URL || 'http://localhost:6333') {
    this.client = new QdrantClient({ url });
    this.collectionName = 'code_embeddings';
  }

  /**
   * 컬렉션 초기화
   */
  async initialize() {
    try {
      // 컬렉션 존재 여부 확인
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

      if (!exists) {
        // 컬렉션 생성 (768 차원 - OpenAI text-embedding-3-small)
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 768,
            distance: 'Cosine',
          },
        });
        console.log(`✅ 컬렉션 '${this.collectionName}' 생성됨`);
      } else {
        console.log(`✅ 컬렉션 '${this.collectionName}' 이미 존재함`);
      }
    } catch (error) {
      console.error('❌ 컬렉션 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 벡터 추가
   */
  async upsertVectors(
    points: Array<{
      id: string;
      vector: number[];
      payload: {
        content: string;
        language: string;
        framework?: string;
        url?: string;
        type: 'documentation' | 'example' | 'component';
      };
    }>
  ) {
    try {
      await this.client.upsert(this.collectionName, {
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
      console.log(`✅ ${points.length}개 벡터 추가됨`);
    } catch (error) {
      console.error('❌ 벡터 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 시맨틱 검색
   */
  async search(
    query: number[],
    limit: number = 5,
    filter?: {
      language?: string;
      framework?: string;
      type?: string;
    }
  ) {
    try {
      const searchFilter: any = {};

      if (filter) {
        searchFilter.must = [];
        if (filter.language) {
          searchFilter.must.push({
            key: 'language',
            match: { value: filter.language },
          });
        }
        if (filter.framework) {
          searchFilter.must.push({
            key: 'framework',
            match: { value: filter.framework },
          });
        }
        if (filter.type) {
          searchFilter.must.push({
            key: 'type',
            match: { value: filter.type },
          });
        }
      }

      const results = await this.client.search(this.collectionName, {
        vector: query,
        limit,
        filter: Object.keys(searchFilter).length > 0 ? searchFilter : undefined,
        with_payload: true,
      });

      return results.map((r) => ({
        id: r.id,
        score: r.score,
        content: r.payload?.content as string,
        language: r.payload?.language as string,
        framework: r.payload?.framework as string,
        url: r.payload?.url as string,
        type: r.payload?.type as string,
      }));
    } catch (error) {
      console.error('❌ 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 컬렉션 삭제
   */
  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`✅ 컬렉션 '${this.collectionName}' 삭제됨`);
    } catch (error) {
      console.error('❌ 컬렉션 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 통계 조회
   */
  async getStats() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        pointsCount: info.points_count,
        vectorsCount: info.vectors_count,
        segmentsCount: info.segments_count,
      };
    } catch (error) {
      console.error('❌ 통계 조회 실패:', error);
      throw error;
    }
  }
}
