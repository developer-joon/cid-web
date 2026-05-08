'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCiHistorySnapshot } from './hooks';

export function HistorySnapshot({ ciId, rev }: { ciId: number; rev: number }) {
  const { data, isLoading, isError } = useCiHistorySnapshot(ciId, rev);
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (isError) return <div className="p-4 text-sm text-muted-foreground">스냅샷을 불러오지 못했습니다.</div>;
  if (!data) return null;
  return (
    <div className="grid grid-cols-1 gap-2 rounded-md border border-border/60 bg-muted/30 p-4 text-sm md:grid-cols-3">
      <Item label="CI 명">{data.ciNm ?? '—'}</Item>
      <Item label="타입">{data.ciTpCd ?? '—'}</Item>
      <Item label="환경">{data.envrnGpCd ?? '—'}</Item>
      <Item label="등급">{data.grdCd ? <Badge>{String(data.grdCd)}</Badge> : '—'}</Item>
      <Item label="업무">{data.ciBizwrkNm ?? '—'}</Item>
      <Item label="역할">{data.ciRoleNm ?? '—'}</Item>
      <Item label="상태">{data.ciStatVal ?? '—'}</Item>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}
