'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { ActiveToggle } from '../shared/active-toggle';
import type { MasterDept } from '@/lib/api/schemas';

const ALL = '__ALL__';
const KEYS = ['empNmLike', 'worldIdLike', 'deptId', 'useYn'] as const;

export function EmployeeFilters({ depts }: { depts: Map<number, MasterDept> }) {
  const { values, set } = useUrlFilters({ keys: KEYS });
  const [nameDraft, setNameDraft] = useState(values.empNmLike);
  const [worldIdDraft, setWorldIdDraft] = useState(values.worldIdLike);

  useEffect(() => setNameDraft(values.empNmLike), [values.empNmLike]);
  useEffect(() => setWorldIdDraft(values.worldIdLike), [values.worldIdLike]);

  const deptOptions = Array.from(depts.values()).map((d) => ({ value: String(d.deptId), label: d.deptNm }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => { if (nameDraft !== values.empNmLike) set({ empNmLike: nameDraft }); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && nameDraft !== values.empNmLike) set({ empNmLike: nameDraft }); }}
        placeholder="🔍 성명 검색"
        className="h-9 w-48 text-sm"
      />
      <Input
        value={worldIdDraft}
        onChange={(e) => setWorldIdDraft(e.target.value)}
        onBlur={() => { if (worldIdDraft !== values.worldIdLike) set({ worldIdLike: worldIdDraft }); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && worldIdDraft !== values.worldIdLike) set({ worldIdLike: worldIdDraft }); }}
        placeholder="🔍 사내 ID 검색"
        className="h-9 w-48 text-sm"
      />
      <Select
        value={values.deptId || ALL}
        onValueChange={(v) => set({ deptId: v === ALL ? '' : v })}
      >
        <SelectTrigger className="h-9 w-48 text-sm"><SelectValue placeholder="부서 전체" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>부서 전체</SelectItem>
          {deptOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <ActiveToggle />
    </div>
  );
}
