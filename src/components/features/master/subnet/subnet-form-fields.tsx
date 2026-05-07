'use client';

import type { Control } from 'react-hook-form';
import type { SubnetFormValues } from './schema';
import type { MasterSubnet } from '@/lib/api/schemas';
import { TextField } from '@/components/forms/text-field';
import { NumberField } from '@/components/forms/number-field';
import { TreeSelectField, type TreeSelectItem } from '@/components/forms/tree-select-field';

interface Props {
  control: Control<SubnetFormValues>;
  allSubnets: readonly MasterSubnet[];
  disabledIds?: ReadonlySet<number>;
}

export function SubnetFormFields({ control, allSubnets, disabledIds }: Props) {
  const items: TreeSelectItem[] = allSubnets.map((s) => ({
    id: s.subnetId,
    label: s.subnetDescp ? `${s.subnetCidrAddr} · ${s.subnetDescp}` : s.subnetCidrAddr,
    parentId: s.upperSubnetId ?? null,
  }));
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextField control={control} name="subnetCidrAddr" label="CIDR" required placeholder="예: 10.1.0.0/24" />
      <TextField control={control} name="subnetDescp" label="설명" />
      <TextField control={control} name="vlanId" label="VLAN ID" placeholder="예: 101" />
      <TextField control={control} name="vrfNm" label="VRF 명" />
      <div className="md:col-span-2">
        <TreeSelectField
          control={control}
          name="upperSubnetId"
          label="상위 서브넷"
          items={items}
          disabledIds={disabledIds}
          rootOptionLabel="(루트)"
        />
      </div>
      <NumberField control={control} name="ciId" label="소유 CI ID (선택)" />
    </div>
  );
}
