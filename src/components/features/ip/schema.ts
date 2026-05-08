import { z } from 'zod';
import type { RegisterIpRequest, UpdateIpRequest } from '@/api/generated/schemas';

const IPV4_REGEX = /^\d{1,3}(\.\d{1,3}){3}$/;
const IP_TYPES = ['REAL', 'VIP', 'ADMIN', 'NAS', 'PUBLIC', 'PRIVATE'] as const;

export const ipFormSchema = z.object({
  ipAddr: z.string().min(1, '필수입니다.').regex(IPV4_REGEX, 'IPv4 형식이 아닙니다.'),
  ipTpCd: z.enum(IP_TYPES),
  hostNm: z.string().max(100).optional().or(z.literal('')),
  ipDescp: z.string().max(500).optional().or(z.literal('')),
  macAddr: z.string().max(50).optional().or(z.literal('')),
  dnsNm: z.string().max(255).optional().or(z.literal('')),
  subnetId: z.number().int().optional(),
});
export type IpFormValues = z.infer<typeof ipFormSchema>;

export const defaultIpFormValues: IpFormValues = {
  ipAddr: '', ipTpCd: 'REAL', hostNm: '', ipDescp: '', macAddr: '', dnsNm: '', subnetId: undefined,
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toIpCreate(v: IpFormValues, ciId: number): RegisterIpRequest {
  return {
    ipAddr: v.ipAddr,
    ipTpCd: v.ipTpCd,
    hostNm: blank(v.hostNm),
    ipDescp: blank(v.ipDescp),
    macAddr: blank(v.macAddr),
    dnsNm: blank(v.dnsNm),
    ciId,
    subnetId: v.subnetId,
  };
}

export function toIpUpdate(v: IpFormValues): UpdateIpRequest {
  return {
    ipAddr: v.ipAddr,
    ipTpCd: v.ipTpCd,
    hostNm: blank(v.hostNm),
    ipDescp: blank(v.ipDescp),
    macAddr: blank(v.macAddr),
    dnsNm: blank(v.dnsNm),
    subnetId: v.subnetId,
  };
}
