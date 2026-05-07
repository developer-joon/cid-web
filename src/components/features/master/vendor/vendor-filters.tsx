'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { ActiveToggle } from '../shared/active-toggle';

const ALL = '__ALL__';
const KEYS = ['vendorNmLike', 'vendorTpCd', 'useYn'] as const;

const TYPE_OPTIONS = [
  { value: 'HW', label: 'HW' },
  { value: 'SW', label: 'SW' },
  { value: 'MSP', label: 'MSP' },
  { value: 'CSP', label: 'CSP' },
  { value: 'OTHER', label: 'OTHER' },
];

export function VendorFilters() {
  const { values, set } = useUrlFilters({ keys: KEYS });
  const [draft, setDraft] = useState(values.vendorNmLike);
  useEffect(() => setDraft(values.vendorNmLike), [values.vendorNmLike]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== values.vendorNmLike) set({ vendorNmLike: draft }); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && draft !== values.vendorNmLike) set({ vendorNmLike: draft }); }}
        placeholder="🔍 벤더 명 검색"
        className="h-9 w-64 text-sm"
      />
      <Select
        value={values.vendorTpCd || ALL}
        onValueChange={(v) => set({ vendorTpCd: v === ALL ? '' : v })}
      >
        <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="유형 전체" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>유형 전체</SelectItem>
          {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <ActiveToggle />
    </div>
  );
}
