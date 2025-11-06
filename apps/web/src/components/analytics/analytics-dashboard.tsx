'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Code,
  DollarSign,
  Users,
  Activity,
  FileCode,
  Zap
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalProjects: number;
    codeGenerated: number;
    totalCost: number;
    activeUsers: number;
  };
  usage: {
    period: '24h' | '7d' | '30d';
    requests: number;
    tokens: number;
    cost: number;
    successRate: number;
  };
  languages: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  frameworks: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  aiModels: Array<{
    name: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  costBreakdown: Array<{
    model: string;
    cost: number;
    percentage: number;
  }>;
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Mock data - 실제로는 API에서 가져와야 함
      const mockData: AnalyticsData = {
        overview: {
          totalProjects: 42,
          codeGenerated: 15420,
          totalCost: 127.50,
          activeUsers: 28,
        },
        usage: {
          period,
          requests: period === '24h' ? 156 : period === '7d' ? 892 : 3420,
          tokens: period === '24h' ? 45000 : period === '7d' ? 280000 : 1200000,
          cost: period === '24h' ? 12.50 : period === '7d' ? 78.30 : 315.00,
          successRate: 94.5,
        },
        languages: [
          { name: 'TypeScript', count: 520, percentage: 42 },
          { name: 'JavaScript', count: 380, percentage: 30 },
          { name: 'Python', count: 210, percentage: 17 },
          { name: 'HTML/CSS', count: 130, percentage: 11 },
        ],
        frameworks: [
          { name: 'Next.js', count: 450, percentage: 38 },
          { name: 'React', count: 380, percentage: 32 },
          { name: 'Vue', count: 180, percentage: 15 },
          { name: 'Express', count: 170, percentage: 15 },
        ],
        aiModels: [
          { name: 'Claude 3.5 Sonnet', requests: 450, tokens: 580000, cost: 58.50 },
          { name: 'GPT-4o Mini', requests: 320, tokens: 420000, cost: 12.60 },
          { name: 'HyperCLOVA X', requests: 122, tokens: 200000, cost: 7.20 },
        ],
        costBreakdown: [
          { model: 'Claude 3.5 Sonnet', cost: 58.50, percentage: 74.5 },
          { model: 'GPT-4o Mini', cost: 12.60, percentage: 16 },
          { model: 'HyperCLOVA X', cost: 7.20, percentage: 9.5 },
        ],
      };

      setData(mockData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">분석 대시보드</h2>
          <p className="text-muted-foreground">
            AI 코드 생성 사용량 및 통계를 확인하세요
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="24h">24시간</TabsTrigger>
            <TabsTrigger value="7d">7일</TabsTrigger>
            <TabsTrigger value="30d">30일</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 개요 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 프로젝트</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> 지난 달 대비
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">생성된 코드</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.codeGenerated.toLocaleString()} 줄
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+24%</span> 지난 달 대비
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 비용</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.overview.totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">+8%</span> 지난 달 대비
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5명</span> 이번 주
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 사용량 통계 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            사용량 통계 ({period === '24h' ? '최근 24시간' : period === '7d' ? '최근 7일' : '최근 30일'})
          </CardTitle>
          <CardDescription>AI 모델 사용량 및 성공률</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">요청 수</p>
              <p className="text-2xl font-bold">{data.usage.requests.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">토큰 사용량</p>
              <p className="text-2xl font-bold">{data.usage.tokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">비용</p>
              <p className="text-2xl font-bold">${data.usage.cost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">성공률</p>
              <p className="text-2xl font-bold text-green-600">{data.usage.successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 언어 & 프레임워크 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              많이 사용된 언어
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.languages.map((lang) => (
                <div key={lang.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{lang.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {lang.count} ({lang.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${lang.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              많이 사용된 프레임워크
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.frameworks.map((fw) => (
                <div key={fw.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{fw.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {fw.count} ({fw.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${fw.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI 모델 사용량 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI 모델 사용량
          </CardTitle>
          <CardDescription>모델별 요청 수, 토큰, 비용</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.aiModels.map((model) => (
              <div key={model.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{model.name}</p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{model.requests} 요청</span>
                    <span>{model.tokens.toLocaleString()} 토큰</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-lg">
                    ${model.cost.toFixed(2)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 비용 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            비용 분석
          </CardTitle>
          <CardDescription>모델별 비용 분포</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.costBreakdown.map((item) => (
              <div key={item.model}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.model}</span>
                  <span className="text-sm font-bold">
                    ${item.cost.toFixed(2)} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
