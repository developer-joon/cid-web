import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CiServerData, MasterRack, MasterVendor } from '@/lib/api/schemas';
import { formatRack, formatVendor } from '@/lib/master/format';

interface Props {
  data: CiServerData;
  rack?: MasterRack;
  vendor?: MasterVendor;
}

const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex gap-3 px-5 py-3">
    <div className="w-24 shrink-0 text-xs text-muted-foreground">{label}</div>
    <div className="text-sm">{children}</div>
  </div>
);

function formatSpec(d: CiServerData): string {
  const cores = d.cpucoreCnt;
  const mem = d.memoryCapa;
  const disk = d.diskCapa;
  const parts = [
    cores != null ? `${cores}C` : null,
    mem != null ? `${mem}GB` : null,
    disk != null ? `${disk}GB` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
}

export function ServerDataCard({ data, rack, vendor }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">서버 상세 (serverData)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-0 p-0 md:grid-cols-3">
        <Item label="호스트명">{data.hostNm ?? '—'}</Item>
        <Item label="OS">{[data.osTpNm, data.osVer].filter(Boolean).join(' ') || '—'}</Item>
        <Item label="CPU/MEM/DISK">{formatSpec(data)}</Item>
        <Item label="벤더">{formatVendor(vendor)}</Item>
        <Item label="렉">{formatRack(rack)}</Item>
        <Item label="실사 ID">{data.assetId ?? '—'}</Item>
        <Item label="도입일">{data.introDt ?? '—'}</Item>
        <Item label="유지보수 만료">{data.maintEndDt ?? '—'}</Item>
        <Item label="백업">{data.osBackupYn === 'Y' ? '✅ 예' : data.osBackupYn === 'N' ? '아니오' : '—'}</Item>
        <Item label="보안등급">{data.aciLvlGrd ?? '—'}</Item>
        <Item label="모니터링">{data.monitYn === 'Y' ? '✅' : '—'}</Item>
        <Item label="가상화">{data.virtMchnYn === 'Y' ? `${data.virtMchnPltfomNm ?? 'VM'}` : '—'}</Item>
      </CardContent>
    </Card>
  );
}
