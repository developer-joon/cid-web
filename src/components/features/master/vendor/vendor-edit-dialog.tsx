'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { vendorFormSchema, toVendorUpdate, type VendorFormValues } from './schema';
import { useUpdateVendor } from './hooks';
import { VendorFormFields } from './vendor-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterVendor } from '@/lib/api/schemas';

export function VendorEditTrigger({ row, myRoles }: { row: MasterVendor; myRoles: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      vendorNm: row.vendorNm,
      vendorTpCd: row.vendorTpCd ?? '',
      chgrNm: row.chgrNm ?? '',
      chgrEmailAddr: row.chgrEmailAddr ?? '',
      chgrTelNo: row.chgrTelNo ?? '',
      remk: row.remk ?? '',
      useYn: row.useYn ?? 'Y',
    },
  });
  const update = useUpdateVendor(row.vendorId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await update.mutateAsync({ payload: toVendorUpdate(form.getValues()) });
      toast.success('수정되었습니다.');
      setOpen(false);
      router.refresh();
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
        title={`벤더 편집 — ${row.vendorNm}`}
        isPending={update.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <VendorFormFields control={form.control} myRoles={myRoles} mode="edit" />
        </Form>
      </MasterFormDialog>
    </>
  );
}
