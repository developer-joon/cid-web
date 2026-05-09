import { getMyProfile } from '@/lib/auth/me';
import { hasRole } from '@/lib/auth/roles';
import { serverFetch } from '@/lib/api/server-fetch';
import { RacksPageSchema } from '@/lib/api/schemas';
import { parsePaging, toBackendPageable } from '@/lib/api/paging';
import { getLocationsMap } from '@/lib/master/server';
import { MasterListShell } from '@/components/features/master/shared/master-list-shell';
import { RackTable } from '@/components/features/master/rack/rack-table';
import { RackFilters } from '@/components/features/master/rack/rack-filters';
import { RackCreateButton } from '@/components/features/master/rack/rack-create-dialog';
import { ServerListPagination } from '@/components/features/server/list/server-list-pagination';
import { RoleGuard } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

interface SearchParams {
  rackLocCdLike?: string;
  locId?: string;
  page?: string;
  size?: string;
  sort?: string;
}

function pickEntries(sp: SearchParams): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') out.push([k, v]);
  return out;
}

export default async function RackListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const paging = parsePaging(new URLSearchParams(pickEntries(sp)));
  const back = toBackendPageable(paging);

  const qs = new URLSearchParams({
    page: String(back.page),
    size: String(back.size),
  });
  if (back.sort) qs.set('sort', back.sort);
  if (sp.rackLocCdLike) qs.set('rackLocCdLike', sp.rackLocCdLike);
  if (sp.locId) qs.set('locId', sp.locId);

  const [profile, raw, locations] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>(`/api/v1/master/racks?${qs.toString()}`),
    getLocationsMap(),
  ]);

  const page = RacksPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');

  return (
    <MasterListShell
      title="렉 관리"
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RackFilters locations={locations} />
          <RoleGuard role="OPERATOR" myRoles={myRoles}>
            <RackCreateButton locations={locations} />
          </RoleGuard>
        </div>
      }
      pagination={<ServerListPagination meta={page.page} />}
    >
      <RackTable rows={page.content} locations={locations} canEdit={canEdit} />
    </MasterListShell>
  );
}
