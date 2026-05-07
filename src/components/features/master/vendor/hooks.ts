'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterVendorRequest, UpdateVendorRequest } from '@/api/generated/schemas';

const Created = z.object({ vendorId: z.number().int() });

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterVendorRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/master/vendors', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return Created.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'vendors', 'list'] }),
  });
}

export function useUpdateVendor(vendorId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateVendorRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/master/vendors/${vendorId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'vendors', 'list'] }),
  });
}
