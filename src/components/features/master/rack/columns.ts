import type { MasterRack } from '@/lib/api/schemas';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RackRow extends MasterRack { /* room for derived fields */ }

export const RACK_COLUMNS = [
  { key: 'rackLocCd', header: '렉 코드', sortable: true },
  { key: 'location', header: '위치' },
  { key: 'remk', header: '메모' },
  { key: 'actions', header: '' },
] as const;
