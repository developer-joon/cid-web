'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterLocationRequest, UpdateLocationRequest } from '@/api/generated/schemas';

const Created = z.object({ locId: z.number().int() });

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterLocationRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/master/locations', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return Created.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'locations', 'list'] }),
  });
}

export function useUpdateLocation(locId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateLocationRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/master/locations/${locId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'locations', 'list'] }),
  });
}
