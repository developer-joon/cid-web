import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MasterLocation, MasterRack } from '@/lib/api/schemas';
import { formatLocation } from '@/lib/master/format';
import { RackEditTrigger } from './rack-edit-dialog';

interface Props {
  rows: MasterRack[];
  locations: Map<number, MasterLocation>;
  canEdit: boolean;
}

export function RackTable({ rows, locations, canEdit }: Props) {
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-muted-foreground">조회된 렉이 없습니다.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>렉 코드</TableHead>
          <TableHead>위치</TableHead>
          <TableHead>메모</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.rackId}>
            <TableCell className="font-medium">{r.rackLocCd}</TableCell>
            <TableCell>{formatLocation(locations.get(r.locId))}</TableCell>
            <TableCell className="text-muted-foreground">{r.remk ?? '—'}</TableCell>
            <TableCell>{canEdit ? <RackEditTrigger row={r} locations={locations} /> : null}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
