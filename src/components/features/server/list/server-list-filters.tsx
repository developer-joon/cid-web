'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';

const ALL = '__ALL__';

const ENV_OPTIONS = [
  { value: ALL, label: '환경 전체' },
  { value: 'PROD', label: 'PROD' },
  { value: 'STAGE', label: 'STAGE' },
  { value: 'DEV', label: 'DEV' },
];

const STATUS_OPTIONS = [
  { value: ALL, label: '상태 전체' },
  { value: 'ACTIVE', label: '운영중' },
  { value: 'DECOMMISSIONED', label: '폐기' },
];

const FILTER_KEYS = ['ciNm', 'envrnGpCd', 'ciStatVal'] as const;

export function ServerListFilters() {
  const { values, set } = useUrlFilters({ keys: FILTER_KEYS });
  const [draftCiNm, setDraftCiNm] = useState(values.ciNm);

  useEffect(() => setDraftCiNm(values.ciNm), [values.ciNm]);

  const fromValue = (v: string) => (v === ALL ? '' : v);
  const toValue = (v: string) => (v ? v : ALL);

  function commitSearch() {
    if (draftCiNm !== values.ciNm) set({ ciNm: draftCiNm });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
      <Input
        type="text"
        value={draftCiNm}
        onChange={(e) => setDraftCiNm(e.target.value)}
        onBlur={commitSearch}
        onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(); }}
        placeholder="🔍 호스트명으로 검색 (ciNm)"
        className="h-9 w-72 text-sm"
      />
      <Select value={toValue(values.envrnGpCd)} onValueChange={(v) => set({ envrnGpCd: fromValue(v) })}>
        <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="환경 전체" /></SelectTrigger>
        <SelectContent>
          {ENV_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={toValue(values.ciStatVal)} onValueChange={(v) => set({ ciStatVal: fromValue(v) })}>
        <SelectTrigger className="h-9 w-44 text-sm"><SelectValue placeholder="상태 전체" /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
