'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import type { MasterVendor } from '@/lib/api/schemas';
import { FormSection } from '@/components/forms/form-section';
import { TextField } from '@/components/forms/text-field';
import { NumberField } from '@/components/forms/number-field';
import { MasterSelectField } from '@/components/forms/master-select-field';

export function ServerSpecSection({
  control, vendors,
}: { control: Control<ServerFormValues>; vendors: Map<number, MasterVendor> }) {
  const vendorOpts = Array.from(vendors.values()).map((v) => ({ value: v.vendorId, label: v.vendorNm }));
  return (
    <FormSection title="서버 사양 (serverData)">
      <TextField control={control} name="hostNm" label="호스트명" placeholder="예: wms-web-03" />
      <TextField control={control} name="osTpNm" label="OS 종류" placeholder="예: Rocky Linux" />
      <TextField control={control} name="osVer" label="OS 버전" placeholder="예: 9.7" />
      <NumberField control={control} name="cpucoreCnt" label="CPU 코어" unit="C" />
      <NumberField control={control} name="memoryCapa" label="메모리" unit="GB" />
      <NumberField control={control} name="diskCapa" label="디스크" unit="GB" />
      <MasterSelectField control={control} name="vendorId" label="벤더" options={vendorOpts} placeholder="벤더 선택" />
      <TextField control={control} name="modelNm" label="모델명" placeholder="예: PowerEdge R750" />
      <TextField control={control} name="serialNo" label="시리얼 번호" />
    </FormSection>
  );
}
