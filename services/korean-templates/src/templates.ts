export interface Template {
  id: string;
  name: string;
  nameKo: string;
  category: 'ecommerce' | 'chatbot' | 'payment' | 'government' | 'admin' | 'auth';
  description: string;
  descriptionKo: string;
  language: 'typescript' | 'javascript';
  framework: 'nextjs' | 'react' | 'express';
  files: Array<{
    path: string;
    content: string;
  }>;
  dependencies: Record<string, string>;
  features: string[];
  tags: string[];
}

/**
 * 한국 시장 특화 템플릿 모음
 */
export const koreanTemplates: Template[] = [
  // 1. 네이버 스마트스토어 연동
  {
    id: 'naver-smart-store',
    name: 'Naver Smart Store Integration',
    nameKo: '네이버 스마트스토어 연동',
    category: 'ecommerce',
    description: 'Naver Smart Store API integration for product management',
    descriptionKo: '네이버 스마트스토어 API를 사용한 상품 관리 시스템',
    language: 'typescript',
    framework: 'nextjs',
    files: [
      {
        path: 'lib/naver-commerce.ts',
        content: `import axios from 'axios';

export interface NaverProduct {
  productId: string;
  productName: string;
  salePrice: number;
  stockQuantity: number;
  imageUrl: string;
  categoryId: string;
}

export class NaverCommerceAPI {
  private clientId: string;
  private clientSecret: string;
  private baseURL = 'https://api.commerce.naver.com';

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * 상품 목록 조회
   */
  async getProducts(page: number = 1, size: number = 20): Promise<NaverProduct[]> {
    try {
      const response = await axios.get(\`\${this.baseURL}/external/v1/products\`, {
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret,
        },
        params: { page, size },
      });

      return response.data.products;
    } catch (error) {
      console.error('상품 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 상품 등록
   */
  async createProduct(product: Omit<NaverProduct, 'productId'>): Promise<NaverProduct> {
    try {
      const response = await axios.post(
        \`\${this.baseURL}/external/v1/products\`,
        product,
        {
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('상품 등록 실패:', error);
      throw error;
    }
  }

  /**
   * 상품 수정
   */
  async updateProduct(productId: string, updates: Partial<NaverProduct>): Promise<NaverProduct> {
    try {
      const response = await axios.put(
        \`\${this.baseURL}/external/v1/products/\${productId}\`,
        updates,
        {
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('상품 수정 실패:', error);
      throw error;
    }
  }

  /**
   * 재고 업데이트
   */
  async updateStock(productId: string, quantity: number): Promise<void> {
    await this.updateProduct(productId, { stockQuantity: quantity });
  }
}
`,
      },
    ],
    dependencies: {
      axios: '^1.6.5',
    },
    features: [
      '상품 목록 조회',
      '상품 등록/수정/삭제',
      '재고 관리',
      '주문 관리',
      'API 인증',
    ],
    tags: ['네이버', '스마트스토어', '이커머스', '쇼핑몰'],
  },

  // 2. 카카오톡 챗봇
  {
    id: 'kakao-chatbot',
    name: 'Kakao Talk Chatbot',
    nameKo: '카카오톡 챗봇',
    category: 'chatbot',
    description: 'Kakao Talk chatbot integration with skill server',
    descriptionKo: '카카오톡 챗봇 스킬 서버 구현',
    language: 'typescript',
    framework: 'express',
    files: [
      {
        path: 'src/kakao-chatbot.ts',
        content: `import express, { Request, Response } from 'express';

export interface KakaoRequest {
  userRequest: {
    user: {
      id: string;
      type: string;
      properties: Record<string, any>;
    };
    utterance: string;
    params: Record<string, any>;
  };
  bot: {
    id: string;
    name: string;
  };
  action: {
    id: string;
    name: string;
    params: Record<string, any>;
  };
}

export interface KakaoResponse {
  version: string;
  template: {
    outputs: Array<{
      simpleText?: {
        text: string;
      };
      basicCard?: {
        title: string;
        description: string;
        thumbnail?: {
          imageUrl: string;
        };
        buttons?: Array<{
          action: 'webLink' | 'message' | 'block';
          label: string;
          webLinkUrl?: string;
          messageText?: string;
        }>;
      };
    }>;
    quickReplies?: Array<{
      label: string;
      action: 'message' | 'block';
      messageText?: string;
    }>;
  };
}

export class KakaoChatbotServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // 웰컴 메시지
    this.app.post('/kakao/welcome', (req: Request<{}, {}, KakaoRequest>, res: Response) => {
      const response: KakaoResponse = {
        version: '2.0',
        template: {
          outputs: [
            {
              simpleText: {
                text: '안녕하세요! 무엇을 도와드릴까요?',
              },
            },
          ],
          quickReplies: [
            {
              label: '상품 조회',
              action: 'message',
              messageText: '상품을 보여주세요',
            },
            {
              label: '주문 조회',
              action: 'message',
              messageText: '주문 내역을 확인하고 싶어요',
            },
          ],
        },
      };

      res.json(response);
    });

    // 상품 조회
    this.app.post('/kakao/product-search', async (req: Request<{}, {}, KakaoRequest>, res: Response) => {
      const { utterance } = req.body.userRequest;

      // 실제로는 데이터베이스에서 상품 정보를 가져와야 함
      const response: KakaoResponse = {
        version: '2.0',
        template: {
          outputs: [
            {
              basicCard: {
                title: '상품명',
                description: '상품 설명이 여기 표시됩니다.',
                thumbnail: {
                  imageUrl: 'https://example.com/product.jpg',
                },
                buttons: [
                  {
                    action: 'webLink',
                    label: '구매하기',
                    webLinkUrl: 'https://example.com/product/123',
                  },
                ],
              },
            },
          ],
        },
      };

      res.json(response);
    });

    // 주문 조회
    this.app.post('/kakao/order-status', async (req: Request<{}, {}, KakaoRequest>, res: Response) => {
      const userId = req.body.userRequest.user.id;

      // 실제로는 데이터베이스에서 주문 정보를 가져와야 함
      const response: KakaoResponse = {
        version: '2.0',
        template: {
          outputs: [
            {
              simpleText: {
                text: \`최근 주문 내역:\\n1. 주문번호: 12345 - 배송중\\n2. 주문번호: 12344 - 배송완료\`,
              },
            },
          ],
        },
      };

      res.json(response);
    });
  }

  listen(port: number) {
    this.app.listen(port, () => {
      console.log(\`카카오 챗봇 서버가 포트 \${port}에서 실행 중입니다\`);
    });
  }
}
`,
      },
    ],
    dependencies: {
      express: '^4.18.2',
      '@types/express': '^4.17.21',
    },
    features: [
      '스킬 서버 구현',
      '텍스트/카드 응답',
      '버튼/퀵 리플라이',
      '사용자 상태 관리',
      '웹훅 처리',
    ],
    tags: ['카카오톡', '챗봇', '메신저', '자동응답'],
  },

  // 3. 토스페이먼츠 결제 연동
  {
    id: 'toss-payments',
    name: 'Toss Payments Integration',
    nameKo: '토스페이먼츠 결제 연동',
    category: 'payment',
    description: 'Toss Payments API integration for payment processing',
    descriptionKo: '토스페이먼츠 API를 사용한 결제 처리',
    language: 'typescript',
    framework: 'nextjs',
    files: [
      {
        path: 'lib/toss-payments.ts',
        content: `import axios from 'axios';

export interface PaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail: string;
  successUrl: string;
  failUrl: string;
}

export interface PaymentResult {
  paymentKey: string;
  orderId: string;
  status: 'READY' | 'IN_PROGRESS' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED';
  totalAmount: number;
  method: string;
  approvedAt?: string;
}

export class TossPayments {
  private secretKey: string;
  private clientKey: string;
  private baseURL = 'https://api.tosspayments.com/v1';

  constructor(secretKey: string, clientKey: string) {
    this.secretKey = secretKey;
    this.clientKey = clientKey;
  }

  /**
   * 결제 승인
   */
  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      const response = await axios.post(
        \`\${this.baseURL}/payments/confirm\`,
        {
          paymentKey,
          orderId,
          amount,
        },
        {
          headers: {
            Authorization: \`Basic \${Buffer.from(\`\${this.secretKey}:\`).toString('base64')}\`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('결제 승인 실패:', error);
      throw error;
    }
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKey: string): Promise<PaymentResult> {
    try {
      const response = await axios.get(\`\${this.baseURL}/payments/\${paymentKey}\`, {
        headers: {
          Authorization: \`Basic \${Buffer.from(\`\${this.secretKey}:\`).toString('base64')}\`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('결제 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 결제 취소
   */
  async cancelPayment(
    paymentKey: string,
    cancelReason: string,
    cancelAmount?: number
  ): Promise<PaymentResult> {
    try {
      const response = await axios.post(
        \`\${this.baseURL}/payments/\${paymentKey}/cancel\`,
        {
          cancelReason,
          ...(cancelAmount && { cancelAmount }),
        },
        {
          headers: {
            Authorization: \`Basic \${Buffer.from(\`\${this.secretKey}:\`).toString('base64')}\`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('결제 취소 실패:', error);
      throw error;
    }
  }

  /**
   * 클라이언트 키 반환 (프론트엔드용)
   */
  getClientKey(): string {
    return this.clientKey;
  }
}

// React Hook 예제
export function useTossPayments() {
  const initiatePayment = async (request: PaymentRequest) => {
    // @ts-ignore - Toss Payments SDK는 스크립트로 로드됨
    const tossPayments = TossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);

    await tossPayments.requestPayment('카드', {
      amount: request.amount,
      orderId: request.orderId,
      orderName: request.orderName,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      successUrl: request.successUrl,
      failUrl: request.failUrl,
    });
  };

  return { initiatePayment };
}
`,
      },
    ],
    dependencies: {
      axios: '^1.6.5',
    },
    features: [
      '결제 요청',
      '결제 승인',
      '결제 조회',
      '결제 취소',
      '부분 취소',
      '결제 수단: 카드/계좌/간편결제',
    ],
    tags: ['토스페이먼츠', '결제', 'PG', '간편결제'],
  },

  // 4. 정부24 API 연동
  {
    id: 'gov24-api',
    name: 'Government24 API Integration',
    nameKo: '정부24 API 연동',
    category: 'government',
    description: 'Government24 open API integration',
    descriptionKo: '정부24 오픈 API 연동',
    language: 'typescript',
    framework: 'express',
    files: [
      {
        path: 'lib/gov24-api.ts',
        content: `import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

export interface Gov24Config {
  serviceKey: string;
}

export class Gov24API {
  private serviceKey: string;
  private baseURL = 'https://www.gov.kr/api';

  constructor(config: Gov24Config) {
    this.serviceKey = config.serviceKey;
  }

  /**
   * 민원 서비스 목록 조회
   */
  async getServiceList(category?: string): Promise<any[]> {
    try {
      const response = await axios.get(\`\${this.baseURL}/serviceList\`, {
        params: {
          serviceKey: this.serviceKey,
          ...(category && { category }),
        },
      });

      const result = await parseXML(response.data);
      return result.response.body[0].items[0].item || [];
    } catch (error) {
      console.error('서비스 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 민원 서비스 상세 조회
   */
  async getServiceDetail(serviceId: string): Promise<any> {
    try {
      const response = await axios.get(\`\${this.baseURL}/serviceDetail\`, {
        params: {
          serviceKey: this.serviceKey,
          serviceId,
        },
      });

      const result = await parseXML(response.data);
      return result.response.body[0].item[0];
    } catch (error) {
      console.error('서비스 상세 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 민원 신청
   */
  async applyService(serviceId: string, data: Record<string, any>): Promise<any> {
    try {
      const response = await axios.post(
        \`\${this.baseURL}/applyService\`,
        {
          serviceKey: this.serviceKey,
          serviceId,
          ...data,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('민원 신청 실패:', error);
      throw error;
    }
  }

  /**
   * 민원 처리 현황 조회
   */
  async getApplicationStatus(applicationId: string): Promise<any> {
    try {
      const response = await axios.get(\`\${this.baseURL}/applicationStatus\`, {
        params: {
          serviceKey: this.serviceKey,
          applicationId,
        },
      });

      const result = await parseXML(response.data);
      return result.response.body[0].item[0];
    } catch (error) {
      console.error('처리 현황 조회 실패:', error);
      throw error;
    }
  }
}
`,
      },
    ],
    dependencies: {
      axios: '^1.6.5',
      xml2js: '^0.6.2',
      '@types/xml2js': '^0.4.14',
    },
    features: [
      '민원 서비스 목록 조회',
      '민원 상세 정보',
      '민원 신청',
      '처리 현황 조회',
      'XML 파싱',
    ],
    tags: ['정부24', '공공API', '민원', '전자정부'],
  },

  // 5. 한국형 관리자 대시보드
  {
    id: 'korean-admin-dashboard',
    name: 'Korean Admin Dashboard',
    nameKo: '한국형 관리자 대시보드',
    category: 'admin',
    description: 'Korean-style admin dashboard with common features',
    descriptionKo: '한국 웹사이트 스타일의 관리자 대시보드',
    language: 'typescript',
    framework: 'nextjs',
    files: [
      {
        path: 'components/admin/dashboard.tsx',
        content: `'use client';

import { Card } from '@/components/ui/card';
import { Users, ShoppingCart, DollarSign, Activity } from 'lucide-react';

export function KoreanAdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">전체 통계 및 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">전체 회원</p>
              <p className="text-2xl font-bold">1,234명</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">오늘 주문</p>
              <p className="text-2xl font-bold">45건</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">오늘 매출</p>
              <p className="text-2xl font-bold">₩2,450,000</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">접속자</p>
              <p className="text-2xl font-bold">89명</p>
            </div>
            <Activity className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* 최근 주문 */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">최근 주문 내역</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 hover:bg-muted rounded">
              <div>
                <p className="font-medium">주문 #{12345 + i}</p>
                <p className="text-sm text-muted-foreground">홍길동</p>
              </div>
              <div className="text-right">
                <p className="font-medium">₩{(50000 * i).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">결제완료</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
`,
      },
    ],
    dependencies: {
      'lucide-react': '^0.312.0',
    },
    features: [
      '통계 대시보드',
      '회원 관리',
      '주문 관리',
      '매출 분석',
      '한국어 UI',
      '원화 표시',
    ],
    tags: ['관리자', '대시보드', 'Admin', 'CMS'],
  },
];

/**
 * ID로 템플릿 찾기
 */
export function getTemplateById(id: string): Template | undefined {
  return koreanTemplates.find((t) => t.id === id);
}

/**
 * 카테고리별 템플릿 필터링
 */
export function getTemplatesByCategory(category: Template['category']): Template[] {
  return koreanTemplates.filter((t) => t.category === category);
}

/**
 * 태그로 템플릿 검색
 */
export function searchTemplatesByTag(tag: string): Template[] {
  return koreanTemplates.filter((t) => t.tags.some((t) => t.includes(tag)));
}
