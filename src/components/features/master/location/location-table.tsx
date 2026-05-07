import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MasterLocation } from '@/lib/api/schemas';
import { LocationEditTrigger } from './location-edit-dialog';

export function LocationTable({ rows, canEdit }: { rows: MasterLocation[]; canEdit: boolean }) {
  if (rows.length === 0) {
    return <div className="p-10 text-center text-sm text-muted-foreground">조회된 위치가 없습니다.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>사이트</TableHead>
          <TableHead>층</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>설명</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((l) => (
          <TableRow key={l.locId}>
            <TableCell className="font-medium">{l.locSiteNm}</TableCell>
            <TableCell>{l.locFloorNm ?? '—'}</TableCell>
            <TableCell>{l.locTpCd ?? '—'}</TableCell>
            <TableCell className="text-muted-foreground">{l.locDescp ?? '—'}</TableCell>
            <TableCell>{canEdit ? <LocationEditTrigger row={l} /> : null}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
