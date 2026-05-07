'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  serverFormSchema, type ServerFormValues, toUpdatePayload,
} from './schema';
import { useUpdateServer } from './hooks';
import { BasicInfoSection } from './sections/basic-info-section';
import { ServerSpecSection } from './sections/server-spec-section';
import { ServerOpsSection } from './sections/server-ops-section';
import { ServerFlagsSection } from './sections/server-flags-section';
import { MemoSection } from './sections/memo-section';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation, MasterRack, MasterVendor } from '@/lib/api/schemas';

interface Props {
  ciId: number;
  initial: ServerFormValues;
  locations: Map<number, MasterLocation>;
  racks: Map<number, MasterRack>;
  vendors: Map<number, MasterVendor>;
}

export function ServerEditForm({ ciId, initial, locations, racks, vendors }: Props) {
  const router = useRouter();
  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: initial,
  });
  const update = useUpdateServer(ciId);

  async function onSubmit(values: ServerFormValues) {
    try {
      await update.mutateAsync({
        payload: toUpdatePayload(values),
        changeReason: values.changeReason || undefined,
      });
      toast.success('수정되었습니다.');
      router.push(`/servers/${ciId}` as Route);
    } catch (err) {
      const t = formatErrorForToast(err);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <BasicInfoSection control={form.control} locations={locations} />
        <ServerSpecSection control={form.control} vendors={vendors} />
        <ServerOpsSection control={form.control} racks={racks} />
        <ServerFlagsSection control={form.control} />
        <MemoSection control={form.control} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/servers/${ciId}` as Route)}>
            취소
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
