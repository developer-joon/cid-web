'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { subnetFormSchema, toSubnetUpdate, type SubnetFormValues } from './schema';
import { useUpdateSubnet } from './hooks';
import { SubnetFormFields } from './subnet-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterSubnet } from '@/lib/api/schemas';

function descendants(rootId: number, all: readonly MasterSubnet[]): Set<number> {
  const result = new Set<number>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const s of all) {
      if (s.upperSubnetId != null && result.has(s.upperSubnetId) && !result.has(s.subnetId)) {
        result.add(s.subnetId);
        added = true;
      }
    }
  }
  return result;
}

interface Props {
  row: MasterSubnet;
  allSubnets: readonly MasterSubnet[];
  myRoles: readonly string[];
}

export function SubnetEditTrigger({ row, allSubnets }: Props) {
  const [open, setOpen] = useState(false);
  const disabledIds = descendants(row.subnetId, allSubnets);
  const form = useForm<SubnetFormValues>({
    resolver: zodResolver(subnetFormSchema),
    defaultValues: {
      subnetCidrAddr: row.subnetCidrAddr,
      subnetDescp: row.subnetDescp ?? '',
      vlanId: row.vlanId ?? '',
      vrfNm: row.vrfNm ?? '',
      upperSubnetId: row.upperSubnetId ?? undefined,
      ciId: row.ciId ?? undefined,
    },
  });
  const update = useUpdateSubnet(row.subnetId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await update.mutateAsync({ payload: toSubnetUpdate(form.getValues()) });
      toast.success('수정되었습니다.');
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
        title={`서브넷 편집 — ${row.subnetCidrAddr}`}
        isPending={update.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <SubnetFormFields
            control={form.control}
            allSubnets={allSubnets}
            disabledIds={disabledIds}
          />
        </Form>
      </MasterFormDialog>
    </>
  );
}
