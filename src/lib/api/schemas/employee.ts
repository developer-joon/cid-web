import { z } from 'zod';

export const CiEmployeeItemSchema = z.object({
  empId: z.number().int(),
  empNm: z.string(),
  emailAddr: z.string().optional(),
  telNo: z.string().optional(),
  worldId: z.string().optional(),
  deptId: z.number().int().optional(),
  deptNm: z.string().optional(),
  roleCd: z.string().optional(),
});
export type CiEmployeeItem = z.infer<typeof CiEmployeeItemSchema>;

export const CiEmployeeListSchema = z.array(CiEmployeeItemSchema);
