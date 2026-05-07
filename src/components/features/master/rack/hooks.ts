'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterRackRequest, UpdateRackRequest } from '@/api/generated/schemas';

const Created = z.object({ rackId: z.number().int() });

export function useCreateRack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterRackRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/master/racks', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return Created.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'racks', 'list'] }),
  });
}

export function useUpdateRack(rackId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateRackRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/master/racks/${rackId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'racks', 'list'] }),
  });
}
