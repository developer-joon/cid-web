import { z } from 'zod';
import type { RegisterLocationRequest, UpdateLocationRequest } from '@/api/generated/schemas';

export const locationFormSchema = z.object({
  locSiteNm: z.string().min(1, '필수입니다.').max(100),
  locFloorNm: z.string().max(50).optional().or(z.literal('')),
  locTpCd: z.string().max(50).optional().or(z.literal('')),
  locDescp: z.string().max(500).optional().or(z.literal('')),
});
export type LocationFormValues = z.infer<typeof locationFormSchema>;

export const defaultLocationFormValues: LocationFormValues = {
  locSiteNm: '', locFloorNm: '', locTpCd: '', locDescp: '',
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toLocationCreate(v: LocationFormValues): RegisterLocationRequest {
  return {
    locSiteNm: v.locSiteNm,
    locFloorNm: blank(v.locFloorNm),
    locTpCd: blank(v.locTpCd),
    locDescp: blank(v.locDescp),
  };
}
export function toLocationUpdate(v: LocationFormValues): UpdateLocationRequest {
  return toLocationCreate(v) as UpdateLocationRequest;
}
