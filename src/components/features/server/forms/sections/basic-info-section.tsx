'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import type { MasterLocation } from '@/lib/api/schemas';
import { FormSection } from '@/components/forms/form-section';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';
import { MasterSelectField } from '@/components/forms/master-select-field';
import { formatLocation } from '@/lib/master/format';

const ENV_OPTIONS = [
  { value: 'PROD', label: 'PROD' },
  { value: 'STAGE', label: 'STAGE' },
  { value: 'DEV', label: 'DEV' },
];
const GRADE_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

export function BasicInfoSection({
  control, locations,
}: { control: Control<ServerFormValues>; locations: Map<number, MasterLocation> }) {
  const locOptions = Array.from(locations.values()).map((l) => ({
    value: l.locId, label: formatLocation(l),
  }));
  return (
    <FormSection title="기본 정보 (CI 공통)">
      <TextField control={control} name="ciNm" label="CI 명" required placeholder="예: WMS-WEB-03" />
      <TextField control={control} name="ciBizwrkNm" label="업무영역" placeholder="예: WMS" />
      <TextField control={control} name="ciRoleNm" label="역할" placeholder="예: 웹 프론트" />
      <SelectField control={control} name="envrnGpCd" label="환경" options={ENV_OPTIONS} placeholder="환경 선택" />
      <SelectField control={control} name="grdCd" label="등급" options={GRADE_OPTIONS} placeholder="등급 선택" />
      <MasterSelectField control={control} name="locId" label="위치" options={locOptions} placeholder="위치 선택" />
    </FormSection>
  );
}
