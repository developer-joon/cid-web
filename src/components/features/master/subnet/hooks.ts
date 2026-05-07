'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterSubnetRequest, UpdateSubnetRequest } from '@/api/generated/schemas';

const Created = z.object({ subnetId: z.number().int() });

export function useCreateSubnet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterSubnetRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/subnets', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return Created.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'subnets', 'list'] }),
  });
}

export function useUpdateSubnet(subnetId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateSubnetRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/subnets/${subnetId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'subnets', 'list'] }),
  });
}
