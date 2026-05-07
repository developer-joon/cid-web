'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';

const ALL = '__ALL__';
const TYPE_OPTIONS = [
  { value: ALL, label: '유형 전체' },
  { value: 'IDC', label: 'IDC' },
  { value: 'OFFICE', label: 'OFFICE' },
];
const KEYS = ['siteNmLike', 'floorNmLike', 'tpCd'] as const;

export function LocationFilters() {
  const { values, set } = useUrlFilters({ keys: KEYS });
  const [site, setSite] = useState(values.siteNmLike);
  const [floor, setFloor] = useState(values.floorNmLike);
  useEffect(() => setSite(values.siteNmLike), [values.siteNmLike]);
  useEffect(() => setFloor(values.floorNmLike), [values.floorNmLike]);

  function commitSite() { if (site !== values.siteNmLike) set({ siteNmLike: site }); }
  function commitFloor() { if (floor !== values.floorNmLike) set({ floorNmLike: floor }); }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={site} onChange={(e) => setSite(e.target.value)} onBlur={commitSite}
             onKeyDown={(e) => { if (e.key === 'Enter') commitSite(); }}
             placeholder="🔍 사이트" className="h-9 w-48 text-sm" />
      <Input value={floor} onChange={(e) => setFloor(e.target.value)} onBlur={commitFloor}
             onKeyDown={(e) => { if (e.key === 'Enter') commitFloor(); }}
             placeholder="🔍 층" className="h-9 w-32 text-sm" />
      <Select value={values.tpCd || ALL} onValueChange={(v) => set({ tpCd: v === ALL ? '' : v })}>
        <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="유형 전체" /></SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
