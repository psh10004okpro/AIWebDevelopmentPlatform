'use client';

import { AlertTriangle, CheckCircle, Info, Shield, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SecurityReportProps {
  report: {
    overallSafe: boolean;
    securityScore: number;
    timestamp: string;
    language: string;
    checks: {
      sqlInjection?: {
        isSafe: boolean;
        vulnerabilities: string[];
        recommendations: string[];
        fixedCode?: string;
      };
      xss?: {
        isSafe: boolean;
        vulnerabilities: string[];
        recommendations: string[];
        fixedCode?: string;
      };
      csrf?: {
        isSafe: boolean;
        vulnerabilities: string[];
        recommendations: string[];
        implementationCode?: string;
      };
      inputValidation?: {
        isSafe: boolean;
        vulnerabilities: string[];
        recommendations: string[];
        generatedSchemas?: string;
      };
      rateLimit?: {
        isSafe: boolean;
        vulnerabilities: string[];
        recommendations: string[];
      };
    };
    allRecommendations: string[];
  };
}

export function SecurityReport({ report }: SecurityReportProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const checkNames: Record<string, string> = {
    sqlInjection: 'SQL Injection',
    xss: 'XSS (Cross-Site Scripting)',
    csrf: 'CSRF (Cross-Site Request Forgery)',
    inputValidation: 'Input Validation',
    rateLimit: 'Rate Limiting',
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>보안 검사 리포트</CardTitle>
          </div>
          <Badge variant={getScoreBadgeVariant(report.securityScore)}>
            보안 점수: {report.securityScore}/100
          </Badge>
        </div>
        <CardDescription>
          생성된 코드에 대한 자동 보안 분석 결과입니다
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 전체 상태 */}
        <Alert variant={report.overallSafe ? 'default' : 'destructive'}>
          {report.overallSafe ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>
            {report.overallSafe ? '보안 검사 통과' : '보안 취약점 발견'}
          </AlertTitle>
          <AlertDescription>
            {report.overallSafe
              ? '코드에서 주요 보안 취약점이 발견되지 않았습니다.'
              : '일부 보안 취약점이 발견되었습니다. 아래 권장사항을 확인하세요.'}
          </AlertDescription>
        </Alert>

        {/* 개별 체크 결과 */}
        <Accordion type="multiple" className="w-full">
          {Object.entries(report.checks).map(([checkType, checkResult]) => {
            if (!checkResult) return null;

            const isSecurityCheck = checkType in checkNames;
            if (!isSecurityCheck) return null;

            return (
              <AccordionItem key={checkType} value={checkType}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    {checkResult.isSafe ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{checkNames[checkType as keyof typeof checkNames]}</span>
                    <Badge
                      variant={checkResult.isSafe ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {checkResult.isSafe ? '통과' : '취약점 발견'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {/* 취약점 목록 */}
                    {checkResult.vulnerabilities &&
                      checkResult.vulnerabilities.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            발견된 취약점
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {checkResult.vulnerabilities.map((vuln, idx) => (
                              <li key={idx}>{vuln}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* 권장사항 */}
                    {checkResult.recommendations &&
                      checkResult.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                            <Info className="h-3 w-3 text-blue-500" />
                            권장사항
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {checkResult.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* 수정된 코드 (있는 경우) */}
                    {'fixedCode' in checkResult && checkResult.fixedCode && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">수정된 코드</h4>
                        <ScrollArea className="h-[200px] w-full rounded-md border">
                          <pre className="p-4 text-xs">
                            <code>{checkResult.fixedCode}</code>
                          </pre>
                        </ScrollArea>
                      </div>
                    )}

                    {/* 구현 예제 (CSRF 등) */}
                    {'implementationCode' in checkResult && checkResult.implementationCode && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">구현 예제</h4>
                        <ScrollArea className="h-[200px] w-full rounded-md border">
                          <pre className="p-4 text-xs">
                            <code>{checkResult.implementationCode}</code>
                          </pre>
                        </ScrollArea>
                      </div>
                    )}

                    {/* 검증 스키마 (Input Validation) */}
                    {'generatedSchemas' in checkResult && checkResult.generatedSchemas && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">검증 스키마 예제</h4>
                        <ScrollArea className="h-[200px] w-full rounded-md border">
                          <pre className="p-4 text-xs">
                            <code>{checkResult.generatedSchemas}</code>
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* 전체 권장사항 요약 */}
        {report.allRecommendations && report.allRecommendations.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
              <Info className="h-4 w-4" />
              전체 권장사항 요약
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {report.allRecommendations.slice(0, 5).map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
            {report.allRecommendations.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                + {report.allRecommendations.length - 5}개의 추가 권장사항
              </p>
            )}
          </div>
        )}

        {/* 타임스탬프 */}
        <p className="text-xs text-muted-foreground text-right">
          검사 시간: {new Date(report.timestamp).toLocaleString('ko-KR')}
        </p>
      </CardContent>
    </Card>
  );
}
