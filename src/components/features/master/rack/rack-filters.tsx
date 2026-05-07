'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';
import type { MasterLocation } from '@/lib/api/schemas';
import { formatLocation } from '@/lib/master/format';

const ALL = '__ALL__';
const KEYS = ['rackLocCdLike', 'locId'] as const;

export function RackFilters({ locations }: { locations: Map<number, MasterLocation> }) {
  const { values, set } = useUrlFilters({ keys: KEYS });
  const [draft, setDraft] = useState(values.rackLocCdLike);
  useEffect(() => setDraft(values.rackLocCdLike), [values.rackLocCdLike]);

  const locOptions = Array.from(locations.values()).map((l) => ({ value: String(l.locId), label: formatLocation(l) }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft !== values.rackLocCdLike) set({ rackLocCdLike: draft }); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && draft !== values.rackLocCdLike) set({ rackLocCdLike: draft }); }}
        placeholder="🔍 렉 코드 검색"
        className="h-9 w-64 text-sm"
      />
      <Select
        value={values.locId || ALL}
        onValueChange={(v) => set({ locId: v === ALL ? '' : v })}
      >
        <SelectTrigger className="h-9 w-56 text-sm"><SelectValue placeholder="위치 전체" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>위치 전체</SelectItem>
          {locOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
