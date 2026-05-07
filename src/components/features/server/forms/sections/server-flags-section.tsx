'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import { FormSection } from '@/components/forms/form-section';
import { YnField } from '@/components/forms/yn-field';
import { TextField } from '@/components/forms/text-field';

export function ServerFlagsSection({ control }: { control: Control<ServerFormValues> }) {
  return (
    <FormSection title="옵션">
      <YnField control={control} name="virtMchnYn" label="가상머신" />
      <TextField control={control} name="virtMchnPltfomNm" label="가상화 플랫폼" placeholder="예: VMware" />
      <YnField control={control} name="osBackupYn" label="백업" />
      <YnField control={control} name="monitYn" label="모니터링" />
      <YnField control={control} name="alarmCallYn" label="알람 호출" />
      <YnField control={control} name="mngYn" label="관리 대상" />
      <YnField control={control} name="inetFacingYn" label="인터넷 노출" />
    </FormSection>
  );
}
