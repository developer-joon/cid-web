import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MasterVendor } from '@/lib/api/schemas';
import { VendorEditTrigger } from './vendor-edit-dialog';

interface Props {
  rows: MasterVendor[];
  canEdit: boolean;
  myRoles: readonly string[];
}

export function VendorTable({ rows, canEdit, myRoles }: Props) {
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-muted-foreground">조회된 벤더가 없습니다.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>활성</TableHead>
          <TableHead>벤더 명</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead>이메일</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((v) => (
          <TableRow key={v.vendorId}>
            <TableCell>
              {v.useYn === 'N'
                ? <Badge>비활성</Badge>
                : <Badge variant="success">활성</Badge>}
            </TableCell>
            <TableCell className="font-medium">{v.vendorNm}</TableCell>
            <TableCell>{v.vendorTpCd ?? '—'}</TableCell>
            <TableCell>{v.chgrNm ?? '—'}</TableCell>
            <TableCell>{v.chgrEmailAddr ?? '—'}</TableCell>
            <TableCell>{v.chgrTelNo ?? '—'}</TableCell>
            <TableCell>{canEdit ? <VendorEditTrigger row={v} myRoles={myRoles} /> : null}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
