import type { MasterEmployee } from '@/lib/api/schemas';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EmployeeRow extends MasterEmployee { /* room for derived fields */ }

export const EMPLOYEE_COLUMNS = [
  { key: 'useYn', header: '활성' },
  { key: 'empNm', header: '성명', sortable: true },
  { key: 'worldId', header: '사내 ID' },
  { key: 'emailAddr', header: '이메일' },
  { key: 'telNo', header: '연락처' },
  { key: 'dept', header: '부서' },
  { key: 'actions', header: '' },
] as const;
