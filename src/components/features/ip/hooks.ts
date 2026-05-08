'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterIpRequest, UpdateIpRequest } from '@/api/generated/schemas';

const IpCreated = z.object({ ipId: z.number().int() });

export function useCreateIpForCi(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterIpRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/ips`, {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return IpCreated.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cis', 'ips', ciId] }),
  });
}

export function useUpdateIp(ipId: number, ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateIpRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/ips/${ipId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cis', 'ips', ciId] }),
  });
}

export function useUnassignIp(ipId: number, ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/ips/${ipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ unassignCi: true }),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cis', 'ips', ciId] }),
  });
}
