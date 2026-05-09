export interface PagingState {
  page: number;     // 1-base for the URL/UI
  size: number;
  sort?: string;    // e.g. "ciId,desc"; undefined = no sort param sent to backend
}

const PAGE_DEFAULT = 1;
const SIZE_DEFAULT = 20;
const MAX_SIZE = 100;

export function parsePaging(sp: URLSearchParams, defaultSort?: string): PagingState {
  const rawPage = Number(sp.get('page'));
  const rawSize = Number(sp.get('size'));
  const sort = sp.get('sort') || defaultSort;

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : PAGE_DEFAULT;
  const size =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(Math.floor(rawSize), MAX_SIZE)
      : SIZE_DEFAULT;

  return { page, size, sort };
}

export function toBackendPageable(state: PagingState): PagingState {
  return { ...state, page: state.page - 1 };
}

/** @deprecated Use parsePaging with an explicit defaultSort instead */
export const PAGING_DEFAULTS = { page: PAGE_DEFAULT, size: SIZE_DEFAULT } as const;
