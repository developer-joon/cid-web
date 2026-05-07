import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MasterEmployee, MasterDept } from '@/lib/api/schemas';
import { EmployeeEditTrigger } from './employee-edit-dialog';

interface Props {
  rows: MasterEmployee[];
  depts: Map<number, MasterDept>;
  canEdit: boolean;
  myRoles: readonly string[];
}

export function EmployeeTable({ rows, depts, canEdit, myRoles }: Props) {
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-muted-foreground">조회된 담당자가 없습니다.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>활성</TableHead>
          <TableHead>성명</TableHead>
          <TableHead>사내 ID</TableHead>
          <TableHead>이메일</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead>부서</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => {
          const deptNm = e.deptNm ?? (e.deptId ? (depts.get(e.deptId)?.deptNm ?? '—') : '—');
          return (
            <TableRow key={e.empId}>
              <TableCell>
                {e.useYn === 'N'
                  ? <Badge>비활성</Badge>
                  : <Badge variant="success">활성</Badge>}
              </TableCell>
              <TableCell className="font-medium">{e.empNm}</TableCell>
              <TableCell>{e.worldId ?? '—'}</TableCell>
              <TableCell>{e.emailAddr ?? '—'}</TableCell>
              <TableCell>{e.telNo ?? '—'}</TableCell>
              <TableCell>{deptNm}</TableCell>
              <TableCell>{canEdit ? <EmployeeEditTrigger row={e} depts={depts} myRoles={myRoles} /> : null}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
