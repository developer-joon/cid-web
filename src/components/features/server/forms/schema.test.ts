import { describe, it, expect } from 'vitest';
import { serverFormSchema, toCreatePayload, defaultServerFormValues } from './schema';

describe('serverFormSchema', () => {
  it('rejects empty ciNm', () => {
    const r = serverFormSchema.safeParse({ ...defaultServerFormValues, ciNm: '' });
    expect(r.success).toBe(false);
  });
  it('accepts minimal valid form', () => {
    const r = serverFormSchema.safeParse({ ...defaultServerFormValues, ciNm: 'wms-web-99' });
    expect(r.success).toBe(true);
  });
  it('coerces number fields from strings', () => {
    const r = serverFormSchema.safeParse({
      ...defaultServerFormValues,
      ciNm: 'x', cpucoreCnt: 8, memoryCapa: 32, diskCapa: 500,
    });
    expect(r.success).toBe(true);
  });
});

describe('toCreatePayload', () => {
  it('produces a CreateCiRequest with ciTpCd=SERVER and serverData populated', () => {
    const payload = toCreatePayload({
      ...defaultServerFormValues,
      ciNm: 'wms-web-99',
      ciBizwrkNm: 'WMS',
      envrnGpCd: 'PROD',
      grdCd: 'A',
      locId: 1,
      hostNm: 'wms-web-99',
      cpucoreCnt: 8,
      vendorId: 7,
      osBackupYn: 'Y',
    });
    expect(payload.ciTpCd).toBe('SERVER');
    expect(payload.ciNm).toBe('wms-web-99');
    expect(payload.serverData?.hostNm).toBe('wms-web-99');
    expect(payload.serverData?.osBackupYn).toBe('Y');
  });
  it('strips empty-string fields from output', () => {
    const payload = toCreatePayload({
      ...defaultServerFormValues,
      ciNm: 'x',
      ciBizwrkNm: '',
      ciDescp: '',
    });
    expect(payload.ciBizwrkNm).toBeUndefined();
    expect(payload.ciDescp).toBeUndefined();
  });
});
