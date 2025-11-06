import axios from 'axios';
import * as cheerio from 'cheerio';
import { EmbeddingGenerator } from '../embeddings/embedding-generator';
import { VectorDatabase } from '../vector-db/qdrant-client';

interface DocumentSource {
  name: string;
  baseUrl: string;
  framework: string;
  language: string;
  urlPatterns: RegExp[];
}

/**
 * 문서 크롤러 및 인덱서
 */
export class DocumentIndexer {
  private embeddings: EmbeddingGenerator;
  private vectorDb: VectorDatabase;

  // 크롤링할 문서 소스
  private sources: DocumentSource[] = [
    {
      name: 'React Official Docs',
      baseUrl: 'https://react.dev',
      framework: 'react',
      language: 'typescript',
      urlPatterns: [/^https:\/\/react\.dev\/learn/, /^https:\/\/react\.dev\/reference/],
    },
    {
      name: 'Next.js Docs',
      baseUrl: 'https://nextjs.org',
      framework: 'nextjs',
      language: 'typescript',
      urlPatterns: [/^https:\/\/nextjs\.org\/docs/],
    },
    {
      name: 'Tailwind CSS Docs',
      baseUrl: 'https://tailwindcss.com',
      framework: 'tailwindcss',
      language: 'css',
      urlPatterns: [/^https:\/\/tailwindcss\.com\/docs/],
    },
  ];

  constructor() {
    this.embeddings = new EmbeddingGenerator();
    this.vectorDb = new VectorDatabase();
  }

  /**
   * 문서 크롤링 및 인덱싱
   */
  async crawlAndIndex() {
    console.log('🚀 문서 크롤링 및 인덱싱 시작...');

    // 벡터 DB 초기화
    await this.vectorDb.initialize();

    for (const source of this.sources) {
      console.log(`\n📚 ${source.name} 크롤링 중...`);
      await this.crawlSource(source);
    }

    // 통계 출력
    const stats = await this.vectorDb.getStats();
    console.log('\n✅ 인덱싱 완료!');
    console.log(`📊 총 ${stats.pointsCount}개 문서 인덱싱됨`);
  }

  /**
   * 특정 소스 크롤링
   */
  private async crawlSource(source: DocumentSource) {
    try {
      // 샘플 URL들 (실제로는 sitemap.xml을 파싱하거나 재귀적으로 크롤링)
      const sampleUrls = await this.getSampleUrls(source);

      for (const url of sampleUrls) {
        try {
          await this.crawlPage(url, source);
          // Rate limiting
          await this.sleep(1000);
        } catch (error) {
          console.error(`❌ ${url} 크롤링 실패:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ ${source.name} 크롤링 실패:`, error);
    }
  }

  /**
   * 개별 페이지 크롤링 및 인덱싱
   */
  private async crawlPage(url: string, source: DocumentSource) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'NextGen-AI-Platform-Crawler/1.0',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // 메인 콘텐츠 추출 (각 사이트마다 다를 수 있음)
      const content = this.extractContent($);

      if (!content || content.length < 100) {
        return;
      }

      // 코드 블록 추출
      const codeBlocks = this.extractCodeBlocks($);

      // 콘텐츠 청킹
      const chunks = this.embeddings.chunkCode(content, 512);

      // 임베딩 생성
      const embeddings = await this.embeddings.generateBatchEmbeddings(chunks);

      // 벡터 DB에 저장
      const points = chunks.map((chunk, index) => ({
        id: `${source.framework}-${Buffer.from(url).toString('base64')}-${index}`,
        vector: embeddings[index],
        payload: {
          content: chunk,
          language: source.language,
          framework: source.framework,
          url,
          type: 'documentation' as const,
        },
      }));

      await this.vectorDb.upsertVectors(points);

      // 코드 블록도 별도로 인덱싱
      if (codeBlocks.length > 0) {
        const codeEmbeddings = await this.embeddings.generateBatchEmbeddings(codeBlocks);
        const codePoints = codeBlocks.map((code, index) => ({
          id: `${source.framework}-code-${Buffer.from(url).toString('base64')}-${index}`,
          vector: codeEmbeddings[index],
          payload: {
            content: code,
            language: source.language,
            framework: source.framework,
            url,
            type: 'example' as const,
          },
        }));

        await this.vectorDb.upsertVectors(codePoints);
      }

      console.log(`✓ ${url} - ${chunks.length}개 청크, ${codeBlocks.length}개 코드 블록`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * HTML에서 텍스트 콘텐츠 추출
   */
  private extractContent($: cheerio.CheerioAPI): string {
    // 일반적인 문서 영역 선택자들
    const selectors = [
      'article',
      'main',
      '.prose',
      '.documentation',
      '.content',
      '#content',
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        // 스크립트, 스타일 제거
        element.find('script, style, nav, header, footer').remove();
        return element.text().trim();
      }
    }

    // 기본값: body에서 텍스트 추출
    $('script, style, nav, header, footer').remove();
    return $('body').text().trim();
  }

  /**
   * 코드 블록 추출
   */
  private extractCodeBlocks($: cheerio.CheerioAPI): string[] {
    const codeBlocks: string[] = [];

    $('pre code, .highlight code').each((_, element) => {
      const code = $(element).text().trim();
      if (code.length > 20) {
        codeBlocks.push(code);
      }
    });

    return codeBlocks;
  }

  /**
   * 샘플 URL 가져오기 (실제로는 sitemap 파싱)
   */
  private async getSampleUrls(source: DocumentSource): Promise<string[]> {
    // 실제 구현에서는 sitemap.xml을 파싱하거나 크롤링
    // 여기서는 샘플 URL 반환
    const sampleUrls: Record<string, string[]> = {
      react: [
        'https://react.dev/learn/thinking-in-react',
        'https://react.dev/learn/state-a-components-memory',
        'https://react.dev/reference/react/useState',
      ],
      nextjs: [
        'https://nextjs.org/docs/app/building-your-application/routing',
        'https://nextjs.org/docs/app/api-reference/functions/use-router',
      ],
      tailwindcss: [
        'https://tailwindcss.com/docs/utility-first',
        'https://tailwindcss.com/docs/responsive-design',
      ],
    };

    return sampleUrls[source.framework] || [];
  }

  /**
   * Sleep 유틸리티
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
