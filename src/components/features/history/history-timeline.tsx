'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCiHistory } from './hooks';
import { HistorySnapshot } from './history-snapshot';
import type { HistoryEntry } from '@/lib/api/schemas';

const REV_VARIANT = {
  ADD: 'success',
  MODIFY: 'info',
  DELETE: 'destructive',
} as const;

function REV_LABEL(t?: HistoryEntry['revType']) {
  if (t === 'ADD') return '등록';
  if (t === 'MODIFY') return '수정';
  if (t === 'DELETE') return '폐기';
  return '변경';
}

export function HistoryTimeline({ ciId }: { ciId: number }) {
  const { data, isLoading, isError } = useCiHistory(ciId);
  const [expandedRev, setExpandedRev] = useState<number | null>(null);

  if (isLoading) return <div className="p-4"><Skeleton className="h-32 w-full" /></div>;
  if (isError) return <div className="p-6 text-sm text-muted-foreground">이력을 불러오지 못했습니다.</div>;
  if (!data || data.length === 0) return <div className="p-6 text-sm text-muted-foreground">이력이 없습니다.</div>;

  return (
    <div className="divide-y divide-border/60">
      {data.map((entry) => {
        const isExpanded = expandedRev === entry.rev;
        const variant = REV_VARIANT[entry.revType ?? 'MODIFY'] ?? 'info';
        return (
          <div key={entry.rev}>
            <button
              type="button"
              onClick={() => setExpandedRev(isExpanded ? null : entry.rev)}
              className={cn(
                'flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-muted/40',
                isExpanded && 'bg-muted/30',
              )}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Badge variant={variant}>{REV_LABEL(entry.revType)}</Badge>
              <span className="flex-1">
                {entry.changeReason ? (
                  <>
                    <span className="font-medium">{entry.changeReason}</span>
                    {entry.username ? <span className="text-muted-foreground"> · {entry.username}</span> : null}
                  </>
                ) : (
                  <span className="text-muted-foreground">사유 없음{entry.username ? ` · ${entry.username}` : ''}</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.revDt ? new Date(entry.revDt).toLocaleString('ko-KR') : `rev ${entry.rev}`}
              </span>
            </button>
            {isExpanded ? (
              <div className="px-5 pb-4 pt-2">
                <HistorySnapshot ciId={ciId} rev={entry.rev} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
