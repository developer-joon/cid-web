import { describe, it, expect } from 'vitest';
import { CiListPageSchema, CiDetailSchema } from './ci';

describe('CiListPageSchema', () => {
  it('parses a Spring page envelope with content array', () => {
    const input = {
      content: [
        { ciId: 1, ciNm: 'wms-web-01', ciTpCd: 'SERVER', ciStatVal: 'ACTIVE',
          envrnGpCd: 'PROD', ciBizwrkNm: 'WMS', grdCd: 'A' },
      ],
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
    };
    const parsed = CiListPageSchema.parse(input);
    expect(parsed.content[0]?.ciNm).toBe('wms-web-01');
    expect(parsed.page.totalElements).toBe(1);
  });

  it('accepts missing optional fields', () => {
    const parsed = CiListPageSchema.parse({
      content: [{ ciId: 2, ciNm: 'x', ciTpCd: 'SERVER' }],
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
    });
    expect(parsed.content[0]?.envrnGpCd).toBeUndefined();
  });

  it('rejects when content is missing', () => {
    expect(() =>
      CiListPageSchema.parse({ page: { number: 0, size: 20, totalElements: 0, totalPages: 0 } }),
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
