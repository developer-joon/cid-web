'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { locationFormSchema, defaultLocationFormValues, toLocationCreate, type LocationFormValues } from './schema';
import { useCreateLocation } from './hooks';
import { LocationFormFields } from './location-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';

export function LocationCreateButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<LocationFormValues>({ resolver: zodResolver(locationFormSchema), defaultValues: defaultLocationFormValues });
  const create = useCreateLocation();

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    try {
      await create.mutateAsync({ payload: toLocationCreate(v) });
      toast.success('등록되었습니다.');
      form.reset(defaultLocationFormValues);
      setOpen(false);
      router.refresh();
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
        title="위치 등록"
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <LocationFormFields control={form.control} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
