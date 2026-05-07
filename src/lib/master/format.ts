import type { MasterLocation, MasterRack, MasterVendor } from '@/lib/api/schemas';

export const DASH = '—';

export function formatLocation(loc: MasterLocation | undefined): string {
  if (!loc) return DASH;
  return loc.locFloorNm ? `${loc.locSiteNm} · ${loc.locFloorNm}` : loc.locSiteNm;
}

export function formatRack(rack: MasterRack | undefined): string {
  return rack ? rack.rackLocCd : DASH;
}

export function formatVendor(v: MasterVendor | undefined): string {
  return v ? v.vendorNm : DASH;
}
