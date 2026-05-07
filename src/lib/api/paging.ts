export interface PagingState {
  page: number;     // 1-base for the URL/UI
  size: number;
  sort: string;     // e.g. "ciId,desc"
}

const DEFAULT: PagingState = { page: 1, size: 20, sort: 'ciId,desc' };
const MAX_SIZE = 100;

export function parsePaging(sp: URLSearchParams): PagingState {
  const rawPage = Number(sp.get('page'));
  const rawSize = Number(sp.get('size'));
  const sort = sp.get('sort') || DEFAULT.sort;

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : DEFAULT.page;
  const size =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(Math.floor(rawSize), MAX_SIZE)
      : DEFAULT.size;

  return { page, size, sort };
}

export function toBackendPageable(state: PagingState): PagingState {
  return { ...state, page: state.page - 1 };
}

export const PAGING_DEFAULTS: Readonly<PagingState> = DEFAULT;
