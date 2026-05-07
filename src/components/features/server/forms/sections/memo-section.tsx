'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import { FormSection } from '@/components/forms/form-section';
import { TextField } from '@/components/forms/text-field';

export function MemoSection({ control }: { control: Control<ServerFormValues> }) {
  return (
    <FormSection title="메모 / 변경 사유">
      <TextField control={control} name="ciDescp" label="CI 설명" placeholder="자유 메모" />
      <TextField control={control} name="changeReason" label="변경 사유 (선택)" placeholder="예: OS 업그레이드" />
    </FormSection>
  );
}
