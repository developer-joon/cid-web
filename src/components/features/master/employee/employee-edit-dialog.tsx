'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { employeeFormSchema, toEmployeeUpdate, type EmployeeFormValues } from './schema';
import { useUpdateEmployee } from './hooks';
import { EmployeeFormFields } from './employee-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterEmployee, MasterDept } from '@/lib/api/schemas';

export function EmployeeEditTrigger({
  row,
  depts,
  myRoles,
}: {
  row: MasterEmployee;
  depts: Map<number, MasterDept>;
  myRoles: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      empNm: row.empNm,
      worldId: row.worldId ?? '',
      emailAddr: row.emailAddr ?? '',
      telNo: row.telNo ?? '',
      deptId: row.deptId,
      useYn: row.useYn ?? 'Y',
    },
  });
  const update = useUpdateEmployee(row.empId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await update.mutateAsync({ payload: toEmployeeUpdate(form.getValues()) });
      toast.success('수정되었습니다.');
      setOpen(false);
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
        title={`담당자 편집 — ${row.empNm}`}
        isPending={update.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <EmployeeFormFields control={form.control} depts={depts} myRoles={myRoles} mode="edit" />
        </Form>
      </MasterFormDialog>
    </>
  );
}
