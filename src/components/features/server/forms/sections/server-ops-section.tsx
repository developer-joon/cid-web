'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import type { MasterRack } from '@/lib/api/schemas';
import { FormSection } from '@/components/forms/form-section';
import { TextField } from '@/components/forms/text-field';
import { DateField } from '@/components/forms/date-field';
import { MasterSelectField } from '@/components/forms/master-select-field';

export function ServerOpsSection({
  control, racks,
}: { control: Control<ServerFormValues>; racks: Map<number, MasterRack> }) {
  const rackOpts = Array.from(racks.values()).map((r) => ({ value: r.rackId, label: r.rackLocCd }));
  return (
    <FormSection title="운영 정보">
      <MasterSelectField control={control} name="rackId" label="렉" options={rackOpts} placeholder="렉 선택" />
      <TextField control={control} name="assetId" label="실사 ID" />
      <DateField control={control} name="introDt" label="도입일" />
      <DateField control={control} name="maintEndDt" label="유지보수 종료일" />
      <TextField control={control} name="aciLvlGrd" label="보안등급" placeholder="예: 2등급" />
    </FormSection>
  );
}
