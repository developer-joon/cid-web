import { z } from 'zod';
import type { RegisterEmpRequest, UpdateEmpRequest } from '@/api/generated/schemas';

const Yn = z.enum(['Y', 'N']);

export const employeeFormSchema = z.object({
  empNm: z.string().min(1, '필수입니다.').max(50),
  worldId: z.string().optional().or(z.literal('')),
  emailAddr: z.string().email('이메일 형식이 아닙니다.').optional().or(z.literal('')),
  telNo: z.string().optional().or(z.literal('')),
  deptId: z.number().int().optional(),
  useYn: Yn.default('Y'),
});
export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const defaultEmployeeFormValues: EmployeeFormValues = {
  empNm: '', worldId: '', emailAddr: '', telNo: '', deptId: undefined, useYn: 'Y',
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toEmployeeCreate(v: EmployeeFormValues): RegisterEmpRequest {
  return {
    empNm: v.empNm,
    worldId: blank(v.worldId),
    emailAddr: blank(v.emailAddr),
    telNo: blank(v.telNo),
    deptId: v.deptId,
  };
}
export function toEmployeeUpdate(v: EmployeeFormValues): UpdateEmpRequest {
  return { ...toEmployeeCreate(v), useYn: v.useYn };
}
