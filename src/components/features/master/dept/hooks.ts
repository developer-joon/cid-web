'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterDeptRequest, UpdateDeptRequest } from '@/api/generated/schemas';

const Created = z.object({ deptId: z.number().int() });

export function useCreateDept() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterDeptRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/master/depts', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return Created.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'depts', 'list'] }),
  });
}

export function useUpdateDept(deptId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateDeptRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/master/depts/${deptId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'depts', 'list'] }),
  });
}
