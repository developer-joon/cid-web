import { z } from 'zod';
import type { RegisterSubnetRequest, UpdateSubnetRequest } from '@/api/generated/schemas';

const CIDR_REGEX = /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/;

export const subnetFormSchema = z.object({
  subnetCidrAddr: z.string().min(1, '필수입니다.').regex(CIDR_REGEX, 'CIDR 형식 (예: 10.1.0.0/24)'),
  subnetDescp: z.string().max(500).optional().or(z.literal('')),
  vlanId: z.string().max(20).optional().or(z.literal('')),
  vrfNm: z.string().max(50).optional().or(z.literal('')),
  upperSubnetId: z.number().int().optional(),
  ciId: z.number().int().optional(),
});
export type SubnetFormValues = z.infer<typeof subnetFormSchema>;

export const defaultSubnetFormValues: SubnetFormValues = {
  subnetCidrAddr: '', subnetDescp: '', vlanId: '', vrfNm: '',
  upperSubnetId: undefined, ciId: undefined,
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toSubnetCreate(v: SubnetFormValues): RegisterSubnetRequest {
  return {
    subnetCidrAddr: v.subnetCidrAddr,
    subnetDescp: blank(v.subnetDescp),
    vlanId: blank(v.vlanId),
    vrfNm: blank(v.vrfNm),
    upperSubnetId: v.upperSubnetId,
    ciId: v.ciId,
  };
}
export function toSubnetUpdate(v: SubnetFormValues): UpdateSubnetRequest {
  return toSubnetCreate(v) as UpdateSubnetRequest;
}
