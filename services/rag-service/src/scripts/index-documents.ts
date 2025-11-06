import dotenv from 'dotenv';
import { DocumentIndexer } from '../indexer/document-crawler';

dotenv.config();

/**
 * 문서 인덱싱 스크립트
 * 사용법: pnpm index-docs
 */
async function main() {
  console.log('📚 문서 인덱싱 시작...\n');

  const indexer = new DocumentIndexer();

  try {
    await indexer.crawlAndIndex();
    console.log('\n🎉 인덱싱 완료!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 인덱싱 실패:', error);
    process.exit(1);
  }
}

main();
