'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '@/components/features/master/shared/master-form-dialog';
import { ipFormSchema, toIpUpdate, type IpFormValues } from './schema';
import { useUpdateIp } from './hooks';
import { IpFormFields } from './ip-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { CiIpItem, MasterSubnet } from '@/lib/api/schemas';

interface Props { row: CiIpItem; ciId: number; subnets: readonly MasterSubnet[] }

export function IpEditTrigger({ row, ciId, subnets }: Props) {
  const [open, setOpen] = useState(false);
  const form = useForm<IpFormValues>({
    resolver: zodResolver(ipFormSchema),
    defaultValues: {
      ipAddr: row.ipAddr,
      ipTpCd: (row.ipTpCd ?? 'REAL') as IpFormValues['ipTpCd'],
      hostNm: row.hostNm ?? '',
      ipDescp: '',
      macAddr: row.macAddr ?? '',
      dnsNm: row.dnsNm ?? '',
      subnetId: row.subnetId,
    },
  });
  const update = useUpdateIp(row.ipId, ciId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await update.mutateAsync({ payload: toIpUpdate(form.getValues()) });
      toast.success('IP가 수정되었습니다.');
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>편집</Button>
      <MasterFormDialog
        open={open}
        onOpenChange={(o) => { if (!update.isPending) setOpen(o); }}
        title={`IP 편집 — ${row.ipAddr}`}
        isPending={update.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <IpFormFields control={form.control} subnets={subnets} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
