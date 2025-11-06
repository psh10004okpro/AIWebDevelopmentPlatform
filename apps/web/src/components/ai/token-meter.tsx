'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Zap } from 'lucide-react';

interface TokenStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}

export function TokenMeter({ sessionId }: { sessionId?: string }) {
  const [stats, setStats] = useState<TokenStats>({
    totalTokens: 0,
    totalCost: 0,
    requestCount: 0,
  });

  useEffect(() => {
    if (!sessionId) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_AI_ORCHESTRATOR_URL || 'http://localhost:3002'}/stats/tokens/${sessionId}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.usage);
          }
        }
      } catch (error) {
        console.error('통계 조회 실패:', error);
      }
    };

    fetchStats();

    // 30초마다 갱신
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-yellow-500" />
        <div>
          <p className="text-xs text-muted-foreground">토큰</p>
          <p className="text-sm font-semibold">{stats.totalTokens.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-green-500" />
        <div>
          <p className="text-xs text-muted-foreground">비용</p>
          <p className="text-sm font-semibold">${stats.totalCost.toFixed(4)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-500" />
        <div>
          <p className="text-xs text-muted-foreground">요청</p>
          <p className="text-sm font-semibold">{stats.requestCount}</p>
        </div>
      </div>
    </div>
  );
}
