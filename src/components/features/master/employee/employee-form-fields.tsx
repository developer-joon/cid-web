'use client';

import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from './schema';
import type { MasterDept } from '@/lib/api/schemas';
import { TextField } from '@/components/forms/text-field';
import { MasterSelectField } from '@/components/forms/master-select-field';
import { YnField } from '@/components/forms/yn-field';
import { hasRole } from '@/lib/auth/roles';

export function EmployeeFormFields({
  control,
  depts,
  myRoles,
  mode,
}: {
  control: Control<EmployeeFormValues>;
  depts: Map<number, MasterDept>;
  myRoles: readonly string[];
  mode: 'create' | 'edit';
}) {
  const showActiveToggle = mode === 'edit' && hasRole(myRoles, 'ADMIN');
  const deptOptions = Array.from(depts.values()).map((d) => ({ value: d.deptId, label: d.deptNm }));
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextField control={control} name="empNm" label="성명" required />
      <TextField control={control} name="worldId" label="사내 ID" />
      <TextField control={control} name="emailAddr" label="이메일" />
      <TextField control={control} name="telNo" label="연락처" />
      <MasterSelectField control={control} name="deptId" label="부서" options={deptOptions} placeholder="부서 선택" />
      {showActiveToggle ? <YnField control={control} name="useYn" label="활성" /> : null}
    </div>
  );
}
