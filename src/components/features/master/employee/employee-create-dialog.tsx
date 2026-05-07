'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { employeeFormSchema, defaultEmployeeFormValues, toEmployeeCreate, type EmployeeFormValues } from './schema';
import { useCreateEmployee } from './hooks';
import { EmployeeFormFields } from './employee-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterDept } from '@/lib/api/schemas';

export function EmployeeCreateButton({ depts, myRoles }: { depts: Map<number, MasterDept>; myRoles: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const form = useForm<EmployeeFormValues>({ resolver: zodResolver(employeeFormSchema), defaultValues: defaultEmployeeFormValues });
  const create = useCreateEmployee();

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    try {
      await create.mutateAsync({ payload: toEmployeeCreate(v) });
      toast.success('등록되었습니다.');
      form.reset(defaultEmployeeFormValues);
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
        title="담당자 등록"
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <EmployeeFormFields control={form.control} depts={depts} myRoles={myRoles} mode="create" />
        </Form>
      </MasterFormDialog>
    </>
  );
}
