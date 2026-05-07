import { z } from 'zod';
import { pageSchema } from './pagination';

export const MasterLocationSchema = z.object({
  locId: z.number().int(),
  locSiteNm: z.string(),
  locFloorNm: z.string().optional(),
  locTpCd: z.string().optional(),
});
export type MasterLocation = z.infer<typeof MasterLocationSchema>;

export const MasterRackSchema = z.object({
  rackId: z.number().int(),
  rackLocCd: z.string(),
  locId: z.number().int(),
  remk: z.string().optional(),
});
export type MasterRack = z.infer<typeof MasterRackSchema>;

export const MasterVendorSchema = z.object({
  vendorId: z.number().int(),
  vendorNm: z.string(),
  vendorTpCd: z.string().optional(),
  chgrNm: z.string().optional(),
  chgrEmailAddr: z.string().optional(),
  chgrTelNo: z.string().optional(),
  remk: z.string().optional(),
  useYn: z.enum(['Y', 'N']).optional(),
});
export type MasterVendor = z.infer<typeof MasterVendorSchema>;

export const MasterEmployeeSchema = z.object({
  empId: z.number().int(),
  empNm: z.string(),
  worldId: z.string().optional(),
  emailAddr: z.string().optional(),
  telNo: z.string().optional(),
  deptId: z.number().int().optional(),
  deptNm: z.string().optional(),
  useYn: z.enum(['Y', 'N']).optional(),
});
export type MasterEmployee = z.infer<typeof MasterEmployeeSchema>;

export const MasterDeptSchema = z.object({
  deptId: z.number().int(),
  deptNm: z.string(),
  teamNm: z.string().optional(),
  upperDeptId: z.number().int().optional(),
  useYn: z.enum(['Y', 'N']).optional(),
});
export type MasterDept = z.infer<typeof MasterDeptSchema>;

export const LocationsPageSchema = pageSchema(MasterLocationSchema);
export const RacksPageSchema = pageSchema(MasterRackSchema);
export const VendorsPageSchema = pageSchema(MasterVendorSchema);
export const EmployeesPageSchema = pageSchema(MasterEmployeeSchema);
export const DeptsPageSchema = pageSchema(MasterDeptSchema);
