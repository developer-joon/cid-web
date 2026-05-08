'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCiIps } from '@/components/features/server/hooks';
import { IpCreateButton } from '@/components/features/ip/ip-create-dialog';
import { IpEditTrigger } from '@/components/features/ip/ip-edit-dialog';
import { IpUnassignButton } from '@/components/features/ip/ip-unassign-button';
import type { MasterSubnet } from '@/lib/api/schemas';

const IP_TYPE_VARIANT = {
  VIP: 'warning',
  REAL: 'info',
  ADMIN: 'success',
  NAS: 'default',
  PUBLIC: 'default',
  PRIVATE: 'default',
} as const;

interface Props { ciId: number; subnets: readonly MasterSubnet[]; canEdit: boolean }

export function IpsTab({ ciId, subnets, canEdit }: Props) {
  const { data, isLoading, isError } = useCiIps(ciId);

  return (
    <div>
      {canEdit ? (
        <div className="flex justify-end border-b border-border/60 px-4 py-2">
          <IpCreateButton ciId={ciId} subnets={subnets} />
        </div>
      ) : null}

      {isLoading ? (
        <div className="p-4"><Skeleton className="h-24 w-full" /></div>
      ) : isError ? (
        <div className="p-6 text-sm text-muted-foreground">IP 정보를 불러오지 못했습니다.</div>
      ) : !data || data.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">할당된 IP가 없습니다.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>타입</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>대역</TableHead>
              <TableHead>MAC</TableHead>
              <TableHead>DNS</TableHead>
              {canEdit ? <TableHead className="w-[160px]"></TableHead> : null}
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
                  {canEdit ? (
                    <TableCell>
                      <div className="flex gap-1">
                        <IpEditTrigger row={ip} ciId={ciId} subnets={subnets} />
                        <IpUnassignButton ipId={ip.ipId} ipAddr={ip.ipAddr} ciId={ciId} />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
