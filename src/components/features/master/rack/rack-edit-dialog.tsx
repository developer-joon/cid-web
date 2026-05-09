'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { rackFormSchema, toRackUpdate, type RackFormValues } from './schema';
import { useUpdateRack } from './hooks';
import { RackFormFields } from './rack-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation, MasterRack } from '@/lib/api/schemas';

export function RackEditTrigger({ row, locations }: { row: MasterRack; locations: Map<number, MasterLocation> }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<RackFormValues>({
    resolver: zodResolver(rackFormSchema),
    defaultValues: { rackLocCd: row.rackLocCd, locId: row.locId, remk: row.remk ?? '' },
  });
  const update = useUpdateRack(row.rackId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await update.mutateAsync({ payload: toRackUpdate(form.getValues()) });
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
        title={`렉 편집 — ${row.rackLocCd}`}
        isPending={update.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <RackFormFields control={form.control} locations={locations} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
