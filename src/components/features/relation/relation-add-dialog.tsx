'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '@/components/features/master/shared/master-form-dialog';
import { TextField } from '@/components/forms/text-field';
import { NumberField } from '@/components/forms/number-field';
import { SelectField } from '@/components/forms/select-field';
import { useCreateRelation } from './hooks';
import { formatErrorForToast } from '@/lib/api/error-messages';

const formSchema = z.object({
  direction: z.enum(['FWD', 'BWD']),
  counterpartCiId: z.number().int().min(1, '필수입니다.'),
  relTpId: z.number().int().min(1, '필수입니다.'),
  remk: z.string().max(500).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof formSchema>;

const DIRECTION_OPTIONS = [
  { value: 'FWD', label: '이 CI → 상대 (의존함)' },
  { value: 'BWD', label: '상대 → 이 CI (의존받음)' },
];

interface Props { ciId: number }

export function RelationAddButton({ ciId }: Props) {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { direction: 'FWD', counterpartCiId: 0, relTpId: 0, remk: '' },
  });
  const create = useCreateRelation(ciId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    const payload = v.direction === 'FWD'
      ? { sourcCiId: ciId, trgtCiId: v.counterpartCiId, relTpId: v.relTpId, remk: v.remk || undefined }
      : { sourcCiId: v.counterpartCiId, trgtCiId: ciId, relTpId: v.relTpId, remk: v.remk || undefined };
    try {
      await create.mutateAsync({ payload });
      toast.success('관계가 추가되었습니다.');
      form.reset();
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ 관계 추가</Button>
      <MasterFormDialog
        open={open}
        onOpenChange={(o) => { if (!create.isPending) setOpen(o); }}
        title="관계 추가"
        description="자기참조 / 중복 관계는 백엔드가 거절합니다."
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <div className="grid grid-cols-1 gap-3">
            <SelectField control={form.control} name="direction" label="방향" options={DIRECTION_OPTIONS} />
            <NumberField control={form.control} name="counterpartCiId" label="상대 CI ID" />
            <NumberField control={form.control} name="relTpId" label="관계 타입 ID" />
            <TextField control={form.control} name="remk" label="비고" />
          </div>
        </Form>
      </MasterFormDialog>
    </>
  );
}
