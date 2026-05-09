import { getMyProfile } from '@/lib/auth/me';
import { hasRole } from '@/lib/auth/roles';
import { serverFetch } from '@/lib/api/server-fetch';
import { VendorsPageSchema } from '@/lib/api/schemas';
import { parsePaging, toBackendPageable } from '@/lib/api/paging';
import { MasterListShell } from '@/components/features/master/shared/master-list-shell';
import { VendorTable } from '@/components/features/master/vendor/vendor-table';
import { VendorFilters } from '@/components/features/master/vendor/vendor-filters';
import { VendorCreateButton } from '@/components/features/master/vendor/vendor-create-dialog';
import { ServerListPagination } from '@/components/features/server/list/server-list-pagination';
import { RoleGuard } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

interface SearchParams {
  vendorNmLike?: string;
  vendorTpCd?: string;
  useYn?: string;
  page?: string;
  size?: string;
  sort?: string;
}

function pickEntries(sp: SearchParams): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') out.push([k, v]);
  return out;
}

export default async function VendorListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const paging = parsePaging(new URLSearchParams(pickEntries(sp)), 'vendorId,desc');
  const back = toBackendPageable(paging);

  const qs = new URLSearchParams({
    page: String(back.page),
    size: String(back.size),
  });
  if (back.sort) qs.set('sort', back.sort);
  if (sp.vendorNmLike) qs.set('vendorNmLike', sp.vendorNmLike);
  if (sp.vendorTpCd) qs.set('vendorTpCd', sp.vendorTpCd);
  if (sp.useYn) qs.set('useYn', sp.useYn);

  const [profile, raw] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>(`/api/v1/master/vendors?${qs.toString()}`),
  ]);

  const page = VendorsPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');

  return (
    <MasterListShell
      title="벤더 관리"
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <VendorFilters />
          <RoleGuard role="OPERATOR" myRoles={myRoles}>
            <VendorCreateButton myRoles={myRoles} />
          </RoleGuard>
        </div>
      }
      pagination={<ServerListPagination meta={page.page} />}
    >
      <VendorTable rows={page.content} canEdit={canEdit} myRoles={myRoles} />
    </MasterListShell>
  );
}
