'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { rackFormSchema, defaultRackFormValues, toRackCreate, type RackFormValues } from './schema';
import { useCreateRack } from './hooks';
import { RackFormFields } from './rack-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation } from '@/lib/api/schemas';

export function RackCreateButton({ locations }: { locations: Map<number, MasterLocation> }) {
  const [open, setOpen] = useState(false);
  const form = useForm<RackFormValues>({ resolver: zodResolver(rackFormSchema), defaultValues: defaultRackFormValues });
  const create = useCreateRack();

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    try {
      await create.mutateAsync({ payload: toRackCreate(v) });
      toast.success('등록되었습니다.');
      form.reset(defaultRackFormValues);
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
        title="렉 등록"
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <RackFormFields control={form.control} locations={locations} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
