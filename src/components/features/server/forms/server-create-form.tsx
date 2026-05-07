'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  serverFormSchema, type ServerFormValues, defaultServerFormValues, toCreatePayload,
} from './schema';
import { useCreateServer } from './hooks';
import { BasicInfoSection } from './sections/basic-info-section';
import { ServerSpecSection } from './sections/server-spec-section';
import { ServerOpsSection } from './sections/server-ops-section';
import { ServerFlagsSection } from './sections/server-flags-section';
import { MemoSection } from './sections/memo-section';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation, MasterRack, MasterVendor } from '@/lib/api/schemas';

interface Props {
  locations: Map<number, MasterLocation>;
  racks: Map<number, MasterRack>;
  vendors: Map<number, MasterVendor>;
}

export function ServerCreateForm({ locations, racks, vendors }: Props) {
  const router = useRouter();
  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: defaultServerFormValues,
  });
  const create = useCreateServer();

  async function onSubmit(values: ServerFormValues) {
    try {
      const result = await create.mutateAsync({
        payload: toCreatePayload(values),
        changeReason: values.changeReason || undefined,
      });
      toast.success('등록되었습니다.');
      router.push(`/servers/${result.ciId}` as Route);
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
          <Button type="button" variant="outline" onClick={() => router.push('/servers' as Route)}>
            취소
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
