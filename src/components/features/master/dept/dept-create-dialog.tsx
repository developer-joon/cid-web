'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { deptFormSchema, defaultDeptFormValues, toDeptCreate, type DeptFormValues } from './schema';
import { useCreateDept } from './hooks';
import { DeptFormFields } from './dept-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterDept } from '@/lib/api/schemas';

interface Props {
  allDepts: MasterDept[];
  myRoles: readonly string[];
}

export function DeptCreateButton({ allDepts, myRoles }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<DeptFormValues>({
    resolver: zodResolver(deptFormSchema),
    defaultValues: defaultDeptFormValues,
  });
  const create = useCreateDept();

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    try {
      await create.mutateAsync({ payload: toDeptCreate(v) });
      toast.success('등록되었습니다.');
      form.reset(defaultDeptFormValues);
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
        title="부서 등록"
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <DeptFormFields control={form.control} allDepts={allDepts} myRoles={myRoles} mode="create" />
        </Form>
      </MasterFormDialog>
    </>
  );
}
