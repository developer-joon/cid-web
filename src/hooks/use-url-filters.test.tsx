import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlFilters } from './use-url-filters';

const replaceMock = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/servers',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe('useUrlFilters', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    currentSearch = '';
  });

  it('reads filters with defaults', () => {
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm', 'envrnGpCd', 'ciStatVal'] }),
    );
    expect(result.current.values).toEqual({ ciNm: '', envrnGpCd: '', ciStatVal: '' });
  });

  it('reads existing values from URL', () => {
    currentSearch = 'ciNm=wms&envrnGpCd=PROD';
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm', 'envrnGpCd', 'ciStatVal'] }),
    );
    expect(result.current.values).toEqual({ ciNm: 'wms', envrnGpCd: 'PROD', ciStatVal: '' });
  });

  it('replaces URL with merged params and resets page on change', () => {
    currentSearch = 'page=3&ciNm=wms';
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm', 'envrnGpCd', 'ciStatVal'] }),
    );
    act(() => result.current.set({ envrnGpCd: 'PROD' }));
    expect(replaceMock).toHaveBeenCalledOnce();
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url.startsWith('/servers?')).toBe(true);
    expect(url).toContain('ciNm=wms');
    expect(url).toContain('envrnGpCd=PROD');
    expect(url).not.toContain('page=3');                // reset
  });

  it('removes empty-string filters from URL', () => {
    currentSearch = 'ciNm=wms&envrnGpCd=PROD';
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm', 'envrnGpCd', 'ciStatVal'] }),
    );
    act(() => result.current.set({ envrnGpCd: '' }));
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url).not.toContain('envrnGpCd');
  });

  it('returns just the path when all params cleared', () => {
    currentSearch = 'ciNm=wms';
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm'] }),
    );
    act(() => result.current.set({ ciNm: '' }));
    expect(replaceMock.mock.calls[0][0]).toBe('/servers');
  });
});
