export interface ColumnDef {
  /** Spring sort field for sortable; pseudo-key for non-sortable */
  key: string;
  header: string;
  sortable?: boolean;
}

export const SERVER_COLUMNS: ColumnDef[] = [
  { key: 'ciStatVal', header: '상태', sortable: true },
  { key: 'ciNm', header: '호스트명', sortable: true },
  { key: 'ciBizwrkNm', header: '업무영역', sortable: true },
  { key: 'envrnGpCd', header: '환경', sortable: true },
  { key: 'location', header: '위치' },
  { key: 'grdCd', header: '등급', sortable: true },
];
