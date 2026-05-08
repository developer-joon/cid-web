'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCiRelations } from '@/components/features/relation/hooks';
import { RelationAddButton } from '@/components/features/relation/relation-add-dialog';
import { RelationDeleteButton } from '@/components/features/relation/relation-delete-button';
import type { RelationItem } from '@/lib/api/schemas';

interface Props { ciId: number; canEdit: boolean }

function RelationTable({
  ciId, rows, direction, canEdit,
}: { ciId: number; rows: RelationItem[]; direction: 'forward' | 'backward'; canEdit: boolean }) {
  if (rows.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">관계가 없습니다.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{direction === 'forward' ? '의존 대상 CI' : '의존하는 CI'}</TableHead>
          <TableHead>라벨</TableHead>
          <TableHead>관계 타입</TableHead>
          <TableHead>비고</TableHead>
          {canEdit ? <TableHead className="w-[60px]"></TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const counterpartId = direction === 'forward' ? r.trgtCiId : r.sourcCiId;
          const counterpartName = direction === 'forward' ? r.trgtCiNm : r.sourcCiNm;
          const label = direction === 'forward' ? r.fwdLblNm : r.bwdLblNm;
          return (
            <TableRow key={r.relId}>
              <TableCell className="font-medium">
                {counterpartName ?? `CI #${counterpartId}`}
              </TableCell>
              <TableCell>{label ? <Badge variant="info">{label}</Badge> : '—'}</TableCell>
              <TableCell>{r.relTpId}</TableCell>
              <TableCell className="text-muted-foreground">{r.remk ?? '—'}</TableCell>
              {canEdit ? (
                <TableCell>
                  <RelationDeleteButton ciId={ciId} relId={r.relId} label={`${counterpartName ?? counterpartId}`} />
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function RelationsTab({ ciId, canEdit }: Props) {
  const { data, isLoading, isError } = useCiRelations(ciId);

  if (isLoading) return <div className="p-4"><Skeleton className="h-24 w-full" /></div>;
  if (isError) return <div className="p-6 text-sm text-muted-foreground">관계 정보를 불러오지 못했습니다.</div>;
  if (!data) return null;

  return (
    <div>
      {canEdit ? (
        <div className="flex justify-end border-b border-border/60 px-4 py-2">
          <RelationAddButton ciId={ciId} />
        </div>
      ) : null}
      <div className="space-y-4 p-4">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">이 CI가 의존하는 것</h3>
          <RelationTable ciId={ciId} rows={data.forward} direction="forward" canEdit={canEdit} />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">이 CI에 의존하는 것</h3>
          <RelationTable ciId={ciId} rows={data.backward} direction="backward" canEdit={canEdit} />
        </section>
      </div>
    </div>
  );
}
