'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCiIps } from '@/components/features/server/hooks';

const IP_TYPE_VARIANT = {
  VIP: 'warning',
  REAL: 'info',
  ADMIN: 'success',
  NAS: 'default',
  PUBLIC: 'default',
  PRIVATE: 'default',
} as const;

export function IpsTab({ ciId }: { ciId: number }) {
  const { data, isLoading, isError } = useCiIps(ciId);

  if (isLoading) return <div className="p-4"><Skeleton className="h-24 w-full" /></div>;
  if (isError) return <div className="p-6 text-sm text-muted-foreground">IP 정보를 불러오지 못했습니다.</div>;
  if (!data || data.length === 0) return <div className="p-6 text-sm text-muted-foreground">할당된 IP가 없습니다.</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>타입</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>대역</TableHead>
          <TableHead>MAC</TableHead>
          <TableHead>DNS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((ip) => {
          const variant = IP_TYPE_VARIANT[ip.ipTpCd as keyof typeof IP_TYPE_VARIANT] ?? 'default';
          return (
            <TableRow key={ip.ipId}>
              <TableCell><Badge variant={variant}>{ip.ipTpCd}</Badge></TableCell>
              <TableCell className="font-medium">{ip.ipAddr}</TableCell>
              <TableCell>{ip.subnetCidrAddr ?? '—'}</TableCell>
              <TableCell>{ip.macAddr ?? '—'}</TableCell>
              <TableCell>{ip.dnsNm ?? '—'}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
