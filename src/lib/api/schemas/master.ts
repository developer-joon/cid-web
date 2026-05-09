import { z } from 'zod';
import { pageSchema } from './pagination';

// Backend serializes empty/absent fields as JSON null. These helpers accept
// either null or missing and normalize to `undefined` so downstream form
// types remain `T | undefined` (not `T | null | undefined`).
const optStr = z.string().nullish().transform((v) => v ?? undefined);
const optNum = z.number().int().nullish().transform((v) => v ?? undefined);
const optYn = z.enum(['Y', 'N']).nullish().transform((v) => v ?? undefined);

export const MasterLocationSchema = z.object({
  locId: z.number().int(),
  locSiteNm: z.string(),
  locFloorNm: optStr,
  locTpCd: optStr,
  locDescp: optStr,
});
export type MasterLocation = z.infer<typeof MasterLocationSchema>;

export const MasterRackSchema = z.object({
  rackId: z.number().int(),
  rackLocCd: z.string(),
  locId: z.number().int(),
  remk: optStr,
});
export type MasterRack = z.infer<typeof MasterRackSchema>;

export const MasterVendorSchema = z.object({
  vendorId: z.number().int(),
  vendorNm: z.string(),
  vendorTpCd: optStr,
  chgrNm: optStr,
  chgrEmailAddr: optStr,
  chgrTelNo: optStr,
  remk: optStr,
  useYn: optYn,
});
export type MasterVendor = z.infer<typeof MasterVendorSchema>;

export const MasterEmployeeSchema = z.object({
  empId: z.number().int(),
  empNm: z.string(),
  worldId: optStr,
  emailAddr: optStr,
  telNo: optStr,
  deptId: optNum,
  deptNm: optStr,
  useYn: optYn,
});
export type MasterEmployee = z.infer<typeof MasterEmployeeSchema>;

export const MasterDeptSchema = z.object({
  deptId: z.number().int(),
  deptNm: z.string(),
  teamNm: optStr,
  upperDeptId: optNum,
  useYn: optYn,
});
export type MasterDept = z.infer<typeof MasterDeptSchema>;

export const MasterSubnetSchema = z.object({
  subnetId: z.number().int(),
  subnetCidrAddr: z.string(),
  subnetDescp: optStr,
  vlanId: optStr,
  vrfNm: optStr,
  upperSubnetId: optNum,
  ciId: optNum,
});
export type MasterSubnet = z.infer<typeof MasterSubnetSchema>;

export const LocationsPageSchema = pageSchema(MasterLocationSchema);
export const RacksPageSchema = pageSchema(MasterRackSchema);
export const VendorsPageSchema = pageSchema(MasterVendorSchema);
export const EmployeesPageSchema = pageSchema(MasterEmployeeSchema);
export const DeptsPageSchema = pageSchema(MasterDeptSchema);
export const SubnetsPageSchema = pageSchema(MasterSubnetSchema);
