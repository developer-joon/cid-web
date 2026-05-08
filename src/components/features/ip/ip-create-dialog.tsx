'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '@/components/features/master/shared/master-form-dialog';
import { ipFormSchema, defaultIpFormValues, toIpCreate, type IpFormValues } from './schema';
import { useCreateIpForCi } from './hooks';
import { IpFormFields } from './ip-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterSubnet } from '@/lib/api/schemas';

interface Props { ciId: number; subnets: readonly MasterSubnet[] }

export function IpCreateButton({ ciId, subnets }: Props) {
  const [open, setOpen] = useState(false);
  const form = useForm<IpFormValues>({ resolver: zodResolver(ipFormSchema), defaultValues: defaultIpFormValues });
  const create = useCreateIpForCi(ciId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await create.mutateAsync({ payload: toIpCreate(form.getValues(), ciId) });
      toast.success('IP가 등록되었습니다.');
      form.reset(defaultIpFormValues);
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ IP 등록</Button>
      <MasterFormDialog
        open={open}
        onOpenChange={(o) => { if (!create.isPending) setOpen(o); }}
        title="IP 등록"
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <IpFormFields control={form.control} subnets={subnets} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
