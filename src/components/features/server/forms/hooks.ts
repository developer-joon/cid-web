'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { CreateCiRequest, UpdateCiRequest } from '@/api/generated/schemas';

const CiCreatedSchema = z.object({ ciId: z.number().int() });

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: CreateCiRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/cis', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return CiCreatedSchema.parse(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cis', 'list'] });
    },
  });
}

export function useUpdateServer(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateCiRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cis', 'list'] });
      qc.invalidateQueries({ queryKey: ['cis', 'detail', ciId] });
    },
  });
}

export function useDecommissionServer(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reason: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/decommission`, {
        method: 'POST',
        body: JSON.stringify({ reason: input.reason }),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.reason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cis', 'list'] });
      qc.invalidateQueries({ queryKey: ['cis', 'detail', ciId] });
    },
  });
}
