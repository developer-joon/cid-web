'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { subnetFormSchema, defaultSubnetFormValues, toSubnetCreate, type SubnetFormValues } from './schema';
import { useCreateSubnet } from './hooks';
import { SubnetFormFields } from './subnet-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterSubnet } from '@/lib/api/schemas';

interface Props {
  allSubnets: MasterSubnet[];
}

export function SubnetCreateButton({ allSubnets }: Props) {
  const [open, setOpen] = useState(false);
  const form = useForm<SubnetFormValues>({
    resolver: zodResolver(subnetFormSchema),
    defaultValues: defaultSubnetFormValues,
  });
  const create = useCreateSubnet();

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    try {
      await create.mutateAsync({ payload: toSubnetCreate(v) });
      toast.success('등록되었습니다.');
      form.reset(defaultSubnetFormValues);
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ 등록</Button>
      <MasterFormDialog
        open={open}
        onOpenChange={(o) => { if (!create.isPending) setOpen(o); }}
        title="서브넷 등록"
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <SubnetFormFields control={form.control} allSubnets={allSubnets} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
