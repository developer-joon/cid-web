import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CiDetail, MasterLocation } from '@/lib/api/schemas';
import { formatLocation } from '@/lib/master/format';

interface Props {
  ci: CiDetail;
  location?: MasterLocation;
}

const InfoItem = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex gap-3 px-5 py-3">
    <div className="w-20 shrink-0 text-xs text-muted-foreground">{label}</div>
    <div className="text-sm">{children}</div>
  </div>
);

export function CiCommonInfoCard({ ci, location }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">기본 정보 (CI 공통)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-0 p-0 md:grid-cols-3">
        <InfoItem label="CI 명"><b>{ci.ciNm}</b></InfoItem>
        <InfoItem label="타입">{ci.ciTpCd}</InfoItem>
        <InfoItem label="환경">{ci.envrnGpCd ?? '—'}</InfoItem>
        <InfoItem label="업무">{ci.ciBizwrkNm ?? '—'}</InfoItem>
        <InfoItem label="역할">{ci.ciRoleNm ?? '—'}</InfoItem>
        <InfoItem label="등급">{ci.grdCd ? <Badge>{ci.grdCd}</Badge> : '—'}</InfoItem>
        <div className="md:col-span-3">
          <InfoItem label="위치">{formatLocation(location)}</InfoItem>
        </div>
      </CardContent>
    </Card>
  );
}
