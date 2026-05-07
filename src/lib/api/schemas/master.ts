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
});
export type MasterRack = z.infer<typeof MasterRackSchema>;

export const MasterVendorSchema = z.object({
  vendorId: z.number().int(),
  vendorNm: z.string(),
  vendorTpCd: z.string().optional(),
});
export type MasterVendor = z.infer<typeof MasterVendorSchema>;

export const LocationsPageSchema = pageSchema(MasterLocationSchema);
export const RacksPageSchema = pageSchema(MasterRackSchema);
export const VendorsPageSchema = pageSchema(MasterVendorSchema);
