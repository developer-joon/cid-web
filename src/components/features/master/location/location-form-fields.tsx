'use client';

import type { Control } from 'react-hook-form';
import type { LocationFormValues } from './schema';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';

const TYPE_OPTIONS = [
  { value: 'IDC', label: 'IDC' },
  { value: 'OFFICE', label: 'OFFICE' },
  { value: 'OTHER', label: 'OTHER' },
];

export function LocationFormFields({ control }: { control: Control<LocationFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextField control={control} name="locSiteNm" label="사이트" required />
      <TextField control={control} name="locFloorNm" label="층" placeholder="예: 2층" />
      <SelectField control={control} name="locTpCd" label="유형" options={TYPE_OPTIONS} placeholder="유형 선택" />
      <TextField control={control} name="locDescp" label="설명" />
    </div>
  );
}
