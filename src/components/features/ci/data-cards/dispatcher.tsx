import type { CiDetail, MasterRack, MasterVendor } from '@/lib/api/schemas';
import { ServerDataCard } from '@/components/features/server/detail/server-data-card';
import { UnsupportedTypeCard } from './unsupported-type-card';

export interface CiDataCardProps {
  ci: CiDetail;
  rack?: MasterRack;
  vendor?: MasterVendor;
}

export function CiDataCard({ ci, rack, vendor }: CiDataCardProps) {
  if (ci.ciTpCd === 'SERVER' && ci.serverData) {
    return <ServerDataCard data={ci.serverData} rack={rack} vendor={vendor} />;
  }
  return <UnsupportedTypeCard ciTpCd={ci.ciTpCd} />;
}
