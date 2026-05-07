import { z } from 'zod';
import type { RegisterVendorRequest, UpdateVendorRequest } from '@/api/generated/schemas';

const Yn = z.enum(['Y', 'N']);

export const vendorFormSchema = z.object({
  vendorNm: z.string().min(1, '필수입니다.').max(100),
  vendorTpCd: z.string().optional().or(z.literal('')),
  chgrNm: z.string().optional().or(z.literal('')),
  chgrEmailAddr: z.string().email('이메일 형식이 아닙니다.').optional().or(z.literal('')),
  chgrTelNo: z.string().optional().or(z.literal('')),
  remk: z.string().max(500).optional().or(z.literal('')),
  useYn: Yn.default('Y'),
});
export type VendorFormValues = z.infer<typeof vendorFormSchema>;

export const defaultVendorFormValues: VendorFormValues = {
  vendorNm: '', vendorTpCd: '', chgrNm: '', chgrEmailAddr: '', chgrTelNo: '', remk: '', useYn: 'Y',
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toVendorCreate(v: VendorFormValues): RegisterVendorRequest {
  return {
    vendorNm: v.vendorNm,
    vendorTpCd: blank(v.vendorTpCd),
    chgrNm: blank(v.chgrNm),
    chgrEmailAddr: blank(v.chgrEmailAddr),
    chgrTelNo: blank(v.chgrTelNo),
    remk: blank(v.remk),
  };
}
export function toVendorUpdate(v: VendorFormValues): UpdateVendorRequest {
  return { ...toVendorCreate(v), useYn: v.useYn };
}
