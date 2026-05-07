'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterEmpRequest, UpdateEmpRequest } from '@/api/generated/schemas';

const Created = z.object({ empId: z.number().int() });

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterEmpRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/master/employees', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return Created.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'employees', 'list'] }),
  });
}

export function useUpdateEmployee(empId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateEmpRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/master/employees/${empId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'employees', 'list'] }),
  });
}
