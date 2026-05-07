'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { vendorFormSchema, defaultVendorFormValues, toVendorCreate, type VendorFormValues } from './schema';
import { useCreateVendor } from './hooks';
import { VendorFormFields } from './vendor-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';

export function VendorCreateButton({ myRoles }: { myRoles: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const form = useForm<VendorFormValues>({ resolver: zodResolver(vendorFormSchema), defaultValues: defaultVendorFormValues });
  const create = useCreateVendor();

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    try {
      await create.mutateAsync({ payload: toVendorCreate(v) });
      toast.success('등록되었습니다.');
      form.reset(defaultVendorFormValues);
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
        title="벤더 등록"
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <VendorFormFields control={form.control} myRoles={myRoles} mode="create" />
        </Form>
      </MasterFormDialog>
    </>
  );
}
