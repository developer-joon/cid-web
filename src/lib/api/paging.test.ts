import { describe, it, expect } from 'vitest';
import { parsePaging, toBackendPageable } from './paging';

describe('parsePaging', () => {
  it('parses page and size with 1-base UI', () => {
    const sp = new URLSearchParams({ page: '2', size: '50', sort: 'ciId,desc' });
    expect(parsePaging(sp)).toEqual({ page: 2, size: 50, sort: 'ciId,desc' });
  });

  it('uses page/size defaults when missing, sort is undefined without defaultSort', () => {
    expect(parsePaging(new URLSearchParams())).toEqual({ page: 1, size: 20, sort: undefined });
  });

  it('uses provided defaultSort when no sort in URL', () => {
    expect(parsePaging(new URLSearchParams(), 'ciId,desc')).toEqual({ page: 1, size: 20, sort: 'ciId,desc' });
  });

  it('URL sort overrides defaultSort', () => {
    const sp = new URLSearchParams({ sort: 'ciNm,asc' });
    expect(parsePaging(sp, 'ciId,desc').sort).toBe('ciNm,asc');
  });

  it('clamps invalid values', () => {
    expect(parsePaging(new URLSearchParams({ page: '0', size: '-1' }))).toMatchObject({ page: 1, size: 20 });
    expect(parsePaging(new URLSearchParams({ page: 'abc', size: 'xyz' }))).toMatchObject({ page: 1, size: 20 });
    expect(parsePaging(new URLSearchParams({ size: '500' }))).toMatchObject({ size: 100 });
  });
});

describe('toBackendPageable', () => {
  it('converts 1-base UI page to 0-base backend page', () => {
    expect(toBackendPageable({ page: 1, size: 20, sort: 'ciId,desc' })).toEqual({
      page: 0, size: 20, sort: 'ciId,desc',
    });
    expect(toBackendPageable({ page: 5, size: 50, sort: 'ciNm,asc' }).page).toBe(4);
  });

  it('preserves undefined sort', () => {
    expect(toBackendPageable({ page: 1, size: 20 }).sort).toBeUndefined();
  });
});
