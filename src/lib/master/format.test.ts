import { describe, it, expect } from 'vitest';
import { formatLocation, formatRack, formatVendor } from './format';

describe('formatLocation', () => {
  it('joins site name and floor when both present', () => {
    expect(formatLocation({ locId: 1, locSiteNm: '송도 IDC', locFloorNm: '2층' })).toBe(
      '송도 IDC · 2층',
    );
  });
  it('falls back to site name only', () => {
    expect(formatLocation({ locId: 1, locSiteNm: '분당 IDC' })).toBe('분당 IDC');
  });
  it('returns dash for undefined', () => {
    expect(formatLocation(undefined)).toBe('—');
  });
});

describe('formatRack', () => {
  it('returns the rack code', () => {
    expect(formatRack({ rackId: 1, rackLocCd: 'A-01', locId: 1 })).toBe('A-01');
  });
  it('returns dash for undefined', () => {
    expect(formatRack(undefined)).toBe('—');
  });
});

describe('formatVendor', () => {
  it('returns the vendor name', () => {
    expect(formatVendor({ vendorId: 1, vendorNm: 'Dell' })).toBe('Dell');
  });
  it('returns dash for undefined', () => {
    expect(formatVendor(undefined)).toBe('—');
  });
});
