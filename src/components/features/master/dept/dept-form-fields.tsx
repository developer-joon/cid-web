'use client';

import type { Control } from 'react-hook-form';
import type { DeptFormValues } from './schema';
import type { MasterDept } from '@/lib/api/schemas';
import { TextField } from '@/components/forms/text-field';
import { YnField } from '@/components/forms/yn-field';
import { TreeSelectField, type TreeSelectItem } from '@/components/forms/tree-select-field';
import { hasRole } from '@/lib/auth/roles';

interface Props {
  control: Control<DeptFormValues>;
  allDepts: readonly MasterDept[];
  disabledIds?: ReadonlySet<number>;
  myRoles: readonly string[];
  mode: 'create' | 'edit';
}

export function DeptFormFields({ control, allDepts, disabledIds, myRoles, mode }: Props) {
  const items: TreeSelectItem[] = allDepts.map((d) => ({
    id: d.deptId,
    label: d.teamNm ? `${d.deptNm} · ${d.teamNm}` : d.deptNm,
    parentId: d.upperDeptId ?? null,
  }));
  const showActive = mode === 'edit' && hasRole(myRoles, 'OPERATOR');

  return (
    <div className="grid grid-cols-1 gap-3">
      <TextField control={control} name="deptNm" label="부서 명" required />
      <TextField control={control} name="teamNm" label="팀 명" />
      <TreeSelectField
        control={control}
        name="upperDeptId"
        label="상위 부서"
        items={items}
        disabledIds={disabledIds}
        rootOptionLabel="(루트)"
      />
      {showActive ? <YnField control={control} name="useYn" label="활성" /> : null}
    </div>
  );
}
