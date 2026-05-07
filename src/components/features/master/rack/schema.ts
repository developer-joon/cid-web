import { z } from 'zod';
import type { RegisterRackRequest, UpdateRackRequest } from '@/api/generated/schemas';

export const rackFormSchema = z.object({
  rackLocCd: z.string().min(1, '필수입니다.').max(50),
  locId: z.number().int(),
  remk: z.string().max(500).optional().or(z.literal('')),
});
export type RackFormValues = z.infer<typeof rackFormSchema>;

export const defaultRackFormValues: RackFormValues = { rackLocCd: '', locId: 0, remk: '' };

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toRackCreate(v: RackFormValues): RegisterRackRequest {
  return { rackLocCd: v.rackLocCd, locId: v.locId, remk: blank(v.remk) };
}
export function toRackUpdate(v: RackFormValues): UpdateRackRequest {
  return { rackLocCd: v.rackLocCd, locId: v.locId, remk: blank(v.remk) };
}
