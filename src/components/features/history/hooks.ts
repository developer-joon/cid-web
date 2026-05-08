'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/mutator';
import {
  HistoryPageSchema, HistoryCiSnapshotSchema,
  type HistoryEntry, type HistoryCiSnapshot,
} from '@/lib/api/schemas';

export function useCiHistory(ciId: number) {
  return useQuery<HistoryEntry[]>({
    queryKey: ['cis', 'history', ciId],
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/history?page=0&size=200&sort=rev,desc`);
      const parsed = HistoryPageSchema.parse(raw);
      return parsed.content;
    },
  });
}

export function useCiHistorySnapshot(ciId: number, rev: number | null) {
  return useQuery<HistoryCiSnapshot>({
    queryKey: ['cis', 'history', ciId, 'snapshot', rev],
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/history/${rev}`);
      return HistoryCiSnapshotSchema.parse(raw);
    },
    enabled: rev != null,
  });
}
