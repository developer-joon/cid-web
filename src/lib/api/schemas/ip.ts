import { z } from 'zod';

export const CiIpItemSchema = z.object({
  ipId: z.number().int(),
  ipAddr: z.string(),
  ipTpCd: z.string(),
  hostNm: z.string().optional(),
  macAddr: z.string().optional(),
  dnsNm: z.string().optional(),
  subnetId: z.number().int().optional(),
  subnetCidrAddr: z.string().optional(),
});
export type CiIpItem = z.infer<typeof CiIpItemSchema>;

export const CiIpListSchema = z.array(CiIpItemSchema);
