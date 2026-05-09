'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { locationFormSchema, toLocationUpdate, type LocationFormValues } from './schema';
import { useUpdateLocation } from './hooks';
import { LocationFormFields } from './location-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation } from '@/lib/api/schemas';

type LocationRow = MasterLocation & { locDescp?: string };

export function LocationEditTrigger({ row }: { row: LocationRow }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      locSiteNm: row.locSiteNm,
      locFloorNm: row.locFloorNm ?? '',
      locTpCd: row.locTpCd ?? '',
      locDescp: row.locDescp ?? '',
    },
  });
  const update = useUpdateLocation(row.locId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await update.mutateAsync({ payload: toLocationUpdate(form.getValues()) });
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
        title={`위치 편집 — ${row.locSiteNm}`}
        isPending={update.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <LocationFormFields control={form.control} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
