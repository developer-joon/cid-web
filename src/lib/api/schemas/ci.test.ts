import { describe, it, expect } from 'vitest';
import { CiListPageSchema, CiDetailSchema } from './ci';

describe('CiListPageSchema', () => {
  it('parses HATEOAS shape with _embedded', () => {
    const r = CiListPageSchema.parse({
      _embedded: { ciDtoList: [{ ciId: 1, ciNm: 'wms-web-01', ciTpCd: 'SERVER' }] },
      _links: { self: { href: '...' } },
      page: { number: 0, size: 5, totalElements: 1, totalPages: 1 },
    });
    expect(r.content).toHaveLength(1);
    expect(r.content[0]?.ciNm).toBe('wms-web-01');
    expect(r.page.totalElements).toBe(1);
  });

  it('parses HATEOAS shape with no _embedded (empty page)', () => {
    const r = CiListPageSchema.parse({
      _links: { self: { href: '...' } },
      page: { number: 0, size: 5, totalElements: 0, totalPages: 0 },
    });
    expect(r.content).toEqual([]);
    expect(r.page.totalElements).toBe(0);
  });

  it('parses HATEOAS shape with optional CI fields', () => {
    const parsed = CiListPageSchema.parse({
      _embedded: { ciDtoList: [{ ciId: 2, ciNm: 'x', ciTpCd: 'SERVER' }] },
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
    });
    expect(parsed.content[0]?.envrnGpCd).toBeUndefined();
  });

  it('rejects unknown envelope shape', () => {
    expect(() =>
      CiListPageSchema.parse({ something: 'wrong' }),
    ).toThrow();
  });
});

describe('CiDetailSchema', () => {
  it('parses a SERVER detail with serverData', () => {
    const parsed = CiDetailSchema.parse({
      ciId: 1, ciNm: 'wms-web-01', ciTpCd: 'SERVER', ciStatVal: 'ACTIVE',
      envrnGpCd: 'PROD', grdCd: 'A', ciBizwrkNm: 'WMS', ciRoleNm: 'Frontend',
      locId: 5, ciDescp: '',
      serverData: {
        hostNm: 'wms-web-01', osTpNm: 'Rocky', osVer: '9.7',
        cpucoreCnt: 32, memoryCapa: 128, diskCapa: 2000,
        rackId: 11, vendorId: 7, introDt: '2024-03-15', maintEndDt: '2025-03-31',
        osBackupYn: 'Y', assetId: 'SV-00123', aciLvlGrd: '2',
      },
    });
    expect(parsed.serverData?.hostNm).toBe('wms-web-01');
    expect(parsed.serverData?.osBackupYn).toBe('Y');
  });

  it('parses other ciTpCd without serverData', () => {
    const parsed = CiDetailSchema.parse({
      ciId: 2, ciNm: 'app-x', ciTpCd: 'APP', ciStatVal: 'ACTIVE',
    });
    expect(parsed.serverData).toBeUndefined();
  });
});
