'use client';

import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';

interface CostEstimate {
  minCost: number;
  maxCost: number;
  avgCost: number;
}

export function CostEstimator({ prompt }: { prompt: string }) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);

  useEffect(() => {
    if (!prompt || prompt.length < 10) {
      setEstimate(null);
      return;
    }

    const fetchEstimate = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_AI_ORCHESTRATOR_URL || 'http://localhost:3002'}/estimate-cost`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setEstimate(data.estimate);
          }
        }
      } catch (error) {
        console.error('비용 추정 실패:', error);
      }
    };

    // 디바운싱
    const timeout = setTimeout(fetchEstimate, 500);

    return () => clearTimeout(timeout);
  }, [prompt]);

  if (!estimate) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <DollarSign className="h-3 w-3" />
      <span>예상 비용: ${estimate.avgCost.toFixed(4)}</span>
    </div>
  );
}
