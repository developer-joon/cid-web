import type { MasterVendor } from '@/lib/api/schemas';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VendorRow extends MasterVendor { /* room for derived fields */ }

export const VENDOR_COLUMNS = [
  { key: 'useYn', header: '활성' },
  { key: 'vendorNm', header: '벤더 명', sortable: true },
  { key: 'vendorTpCd', header: '유형' },
  { key: 'chgrNm', header: '담당자' },
  { key: 'chgrEmailAddr', header: '이메일' },
  { key: 'chgrTelNo', header: '연락처' },
  { key: 'actions', header: '' },
] as const;
