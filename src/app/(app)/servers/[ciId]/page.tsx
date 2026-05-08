import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api/envelope';
import { serverFetch } from '@/lib/api/server-fetch';
import { CiDetailSchema } from '@/lib/api/schemas';
import { getMyProfile } from '@/lib/auth/me';
import { getLocationsMap, getRacksMap, getVendorsMap, getSubnetsList } from '@/lib/master/server';
import { hasRole } from '@/lib/auth/roles';
import { ServerDetailHeader } from '@/components/features/server/detail/server-detail-header';
import { CiCommonInfoCard } from '@/components/features/server/detail/ci-common-info-card';
import { CiDataCard } from '@/components/features/ci/data-cards/dispatcher';
import { ServerDetailTabs } from '@/components/features/server/detail/server-detail-tabs';

export const dynamic = 'force-dynamic';

interface Params { ciId: string; }

export default async function ServerDetailPage({ params }: { params: Promise<Params> }) {
  const { ciId: ciIdRaw } = await params;
  const ciId = Number(ciIdRaw);
  if (!Number.isFinite(ciId) || ciId <= 0) notFound();

  let ci, locations, racks, vendors, profile, subnets;
  try {
    [ci, locations, racks, vendors, profile, subnets] = await Promise.all([
      serverFetch<unknown>(`/api/v1/cis/${ciId}`).then((d) => CiDetailSchema.parse(d)),
      getLocationsMap(),
      getRacksMap(),
      getVendorsMap(),
      getMyProfile(),
      getSubnetsList(),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');
  const location = ci.locId !== undefined ? locations.get(ci.locId) : undefined;
  const rack = ci.serverData?.rackId !== undefined ? racks.get(ci.serverData.rackId) : undefined;
  const vendor = ci.serverData?.vendorId !== undefined ? vendors.get(ci.serverData.vendorId) : undefined;

  return (
    <div className="space-y-4">
      <ServerDetailHeader ci={ci} myRoles={myRoles} />
      <CiCommonInfoCard ci={ci} location={location} />
      <CiDataCard ci={ci} rack={rack} vendor={vendor} />
      <ServerDetailTabs ciId={ciId} subnets={subnets} canEdit={canEdit} />
    </div>
  );
}
