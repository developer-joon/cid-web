import { z } from 'zod';
import type { RegisterDeptRequest, UpdateDeptRequest } from '@/api/generated/schemas';

const Yn = z.enum(['Y', 'N']);

export const deptFormSchema = z.object({
  deptNm: z.string().min(1, '필수입니다.').max(100),
  teamNm: z.string().max(100).optional().or(z.literal('')),
  upperDeptId: z.number().int().optional(),
  useYn: Yn.default('Y'),
});
export type DeptFormValues = z.infer<typeof deptFormSchema>;

export const defaultDeptFormValues: DeptFormValues = {
  deptNm: '', teamNm: '', upperDeptId: undefined, useYn: 'Y',
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toDeptCreate(v: DeptFormValues): RegisterDeptRequest {
  return { deptNm: v.deptNm, teamNm: blank(v.teamNm), upperDeptId: v.upperDeptId };
}
export function toDeptUpdate(v: DeptFormValues): UpdateDeptRequest {
  return { ...toDeptCreate(v), useYn: v.useYn };
}
