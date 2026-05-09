import { getMyProfile } from '@/lib/auth/me';
import { hasRole } from '@/lib/auth/roles';
import { serverFetch } from '@/lib/api/server-fetch';
import { LocationsPageSchema } from '@/lib/api/schemas';
import { parsePaging, toBackendPageable } from '@/lib/api/paging';
import { MasterListShell } from '@/components/features/master/shared/master-list-shell';
import { LocationTable } from '@/components/features/master/location/location-table';
import { LocationFilters } from '@/components/features/master/location/location-filters';
import { LocationCreateButton } from '@/components/features/master/location/location-create-dialog';
import { ServerListPagination } from '@/components/features/server/list/server-list-pagination';
import { RoleGuard } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

interface SearchParams {
  siteNmLike?: string;
  floorNmLike?: string;
  tpCd?: string;
  page?: string;
  size?: string;
  sort?: string;
}

function pickEntries(sp: SearchParams): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') out.push([k, v]);
  return out;
}

export default async function LocationListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const paging = parsePaging(new URLSearchParams(pickEntries(sp)));
  const back = toBackendPageable(paging);

  const qs = new URLSearchParams({
    page: String(back.page),
    size: String(back.size),
  });
  if (back.sort) qs.set('sort', back.sort);
  if (sp.siteNmLike) qs.set('siteNmLike', sp.siteNmLike);
  if (sp.floorNmLike) qs.set('floorNmLike', sp.floorNmLike);
  if (sp.tpCd) qs.set('tpCd', sp.tpCd);

  const [profile, raw] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>(`/api/v1/master/locations?${qs.toString()}`),
  ]);

  const page = LocationsPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');

  return (
    <MasterListShell
      title="위치 관리"
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LocationFilters />
          <RoleGuard role="OPERATOR" myRoles={myRoles}>
            <LocationCreateButton />
          </RoleGuard>
        </div>
      }
      pagination={<ServerListPagination meta={page.page} />}
    >
      <LocationTable rows={page.content} canEdit={canEdit} />
    </MasterListShell>
  );
}
