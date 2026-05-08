'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import {
  CiRelationsResponseSchema, groupRelations, type CiRelationsGrouped,
} from '@/lib/api/schemas';
import type { RegisterRelationRequest } from '@/api/generated/schemas';

const RelationCreated = z.object({ relId: z.number().int() });

export function useCiRelations(ciId: number) {
  return useQuery<CiRelationsGrouped>({
    queryKey: ['cis', 'relations', ciId],
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/relations`);
      const parsed = CiRelationsResponseSchema.parse(raw);
      return groupRelations(parsed, ciId);
    },
  });
}

export function useCreateRelation(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterRelationRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/relations', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return RelationCreated.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cis', 'relations', ciId] }),
  });
}

export function useDeleteRelation(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { relId: number; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/relations/${input.relId}`, {
        method: 'DELETE',
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cis', 'relations', ciId] }),
  });
}
