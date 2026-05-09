'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { deptFormSchema, toDeptUpdate, type DeptFormValues } from './schema';
import { useUpdateDept } from './hooks';
import { DeptFormFields } from './dept-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterDept } from '@/lib/api/schemas';

function descendants(rootId: number, all: readonly MasterDept[]): Set<number> {
  const result = new Set<number>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const d of all) {
      if (d.upperDeptId != null && result.has(d.upperDeptId) && !result.has(d.deptId)) {
        result.add(d.deptId);
        added = true;
      }
    }
  }
  return result;
}

interface Props {
  row: MasterDept;
  allDepts: readonly MasterDept[];
  myRoles: readonly string[];
}

export function DeptEditTrigger({ row, allDepts, myRoles }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const disabledIds = descendants(row.deptId, allDepts);
  const form = useForm<DeptFormValues>({
    resolver: zodResolver(deptFormSchema),
    defaultValues: {
      deptNm: row.deptNm,
      teamNm: row.teamNm ?? '',
      upperDeptId: row.upperDeptId ?? undefined,
      useYn: row.useYn ?? 'Y',
    },
  });
  const update = useUpdateDept(row.deptId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await update.mutateAsync({ payload: toDeptUpdate(form.getValues()) });
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
        title={`부서 편집 — ${row.deptNm}`}
        isPending={update.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <DeptFormFields
            control={form.control}
            allDepts={allDepts}
            disabledIds={disabledIds}
            myRoles={myRoles}
            mode="edit"
          />
        </Form>
      </MasterFormDialog>
    </>
  );
}
