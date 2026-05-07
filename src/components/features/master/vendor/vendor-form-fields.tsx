'use client';

import type { Control } from 'react-hook-form';
import type { VendorFormValues } from './schema';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';
import { YnField } from '@/components/forms/yn-field';
import { hasRole } from '@/lib/auth/roles';

const TYPE_OPTIONS = [
  { value: 'HW', label: 'HW' },
  { value: 'SW', label: 'SW' },
  { value: 'MSP', label: 'MSP' },
  { value: 'CSP', label: 'CSP' },
  { value: 'OTHER', label: 'OTHER' },
];

export function VendorFormFields({
  control,
  myRoles,
  mode,
}: {
  control: Control<VendorFormValues>;
  myRoles: readonly string[];
  mode: 'create' | 'edit';
}) {
  const showActiveToggle = mode === 'edit' && hasRole(myRoles, 'OPERATOR');
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextField control={control} name="vendorNm" label="벤더 명" required />
      <SelectField control={control} name="vendorTpCd" label="유형" options={TYPE_OPTIONS} placeholder="유형 선택" />
      <TextField control={control} name="chgrNm" label="담당자" />
      <TextField control={control} name="chgrEmailAddr" label="이메일" />
      <TextField control={control} name="chgrTelNo" label="연락처" />
      <TextField control={control} name="remk" label="메모" />
      {showActiveToggle ? <YnField control={control} name="useYn" label="활성" /> : null}
    </div>
  );
}
