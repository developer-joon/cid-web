'use client';

import type { Control } from 'react-hook-form';
import type { IpFormValues } from './schema';
import type { MasterSubnet } from '@/lib/api/schemas';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';
import { TreeSelectField, type TreeSelectItem } from '@/components/forms/tree-select-field';

const TYPE_OPTIONS = [
  { value: 'REAL', label: 'REAL' },
  { value: 'VIP', label: 'VIP' },
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'NAS', label: 'NAS' },
  { value: 'PUBLIC', label: 'PUBLIC' },
  { value: 'PRIVATE', label: 'PRIVATE' },
];

export function IpFormFields({ control, subnets }: { control: Control<IpFormValues>; subnets: readonly MasterSubnet[] }) {
  const items: TreeSelectItem[] = subnets.map((s) => ({
    id: s.subnetId,
    label: s.subnetDescp ? `${s.subnetCidrAddr} · ${s.subnetDescp}` : s.subnetCidrAddr,
    parentId: s.upperSubnetId ?? null,
  }));
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextField control={control} name="ipAddr" label="IP 주소" required placeholder="예: 10.1.1.15" />
      <SelectField control={control} name="ipTpCd" label="유형" options={TYPE_OPTIONS} />
      <TextField control={control} name="hostNm" label="호스트명" />
      <TextField control={control} name="macAddr" label="MAC 주소" placeholder="AA:BB:CC:11:22:33" />
      <TextField control={control} name="dnsNm" label="DNS 명" />
      <TextField control={control} name="ipDescp" label="설명" />
      <div className="md:col-span-2">
        <TreeSelectField control={control} name="subnetId" label="대역 (Subnet)" items={items} rootOptionLabel="(미선택)" />
      </div>
    </div>
  );
}
