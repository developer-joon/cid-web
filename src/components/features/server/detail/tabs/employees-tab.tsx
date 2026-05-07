'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCiEmployees } from '@/components/features/server/hooks';

export function EmployeesTab({ ciId }: { ciId: number }) {
  const { data, isLoading, isError } = useCiEmployees(ciId);
  if (isLoading) return <div className="p-4"><Skeleton className="h-24 w-full" /></div>;
  if (isError) return <div className="p-6 text-sm text-muted-foreground">담당자 정보를 불러오지 못했습니다.</div>;
  if (!data || data.length === 0) return <div className="p-6 text-sm text-muted-foreground">지정된 담당자가 없습니다.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이름</TableHead>
          <TableHead>역할</TableHead>
          <TableHead>이메일</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead>부서</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((e) => (
          <TableRow key={e.empId}>
            <TableCell className="font-medium">{e.empNm}</TableCell>
            <TableCell>{e.roleCd ?? '—'}</TableCell>
            <TableCell>{e.emailAddr ?? '—'}</TableCell>
            <TableCell>{e.telNo ?? '—'}</TableCell>
            <TableCell>{e.deptNm ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
