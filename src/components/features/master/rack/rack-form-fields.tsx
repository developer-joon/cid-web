'use client';

import type { Control } from 'react-hook-form';
import type { RackFormValues } from './schema';
import type { MasterLocation } from '@/lib/api/schemas';
import { TextField } from '@/components/forms/text-field';
import { MasterSelectField } from '@/components/forms/master-select-field';
import { formatLocation } from '@/lib/master/format';

export function RackFormFields({ control, locations }: { control: Control<RackFormValues>; locations: Map<number, MasterLocation> }) {
  const opts = Array.from(locations.values()).map((l) => ({ value: l.locId, label: formatLocation(l) }));
  return (
    <div className="grid grid-cols-1 gap-3">
      <TextField control={control} name="rackLocCd" label="렉 코드" required placeholder="예: A-01" />
      <MasterSelectField control={control} name="locId" label="위치" options={opts} placeholder="위치 선택" />
      <TextField control={control} name="remk" label="메모" placeholder="자유 메모" />
    </div>
  );
}
