import { getMyProfile } from '@/lib/auth/me';
import { hasRole } from '@/lib/auth/roles';
import { serverFetch } from '@/lib/api/server-fetch';
import { EmployeesPageSchema } from '@/lib/api/schemas';
import { parsePaging, toBackendPageable } from '@/lib/api/paging';
import { getDeptsMap } from '@/lib/master/server';
import { MasterListShell } from '@/components/features/master/shared/master-list-shell';
import { EmployeeTable } from '@/components/features/master/employee/employee-table';
import { EmployeeFilters } from '@/components/features/master/employee/employee-filters';
import { EmployeeCreateButton } from '@/components/features/master/employee/employee-create-dialog';
import { ServerListPagination } from '@/components/features/server/list/server-list-pagination';
import { RoleGuard } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

interface SearchParams {
  empNmLike?: string;
  worldIdLike?: string;
  deptId?: string;
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

export default async function ContactListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const paging = parsePaging(new URLSearchParams(pickEntries(sp)));
  const back = toBackendPageable(paging);

  const qs = new URLSearchParams({
    page: String(back.page),
    size: String(back.size),
    sort: back.sort,
  });
  if (sp.empNmLike) qs.set('empNmLike', sp.empNmLike);
  if (sp.worldIdLike) qs.set('worldIdLike', sp.worldIdLike);
  if (sp.deptId) qs.set('deptId', sp.deptId);
  if (sp.useYn) qs.set('useYn', sp.useYn);

  const [profile, raw, depts] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>(`/api/v1/master/employees?${qs.toString()}`),
    getDeptsMap(),
  ]);

  const page = EmployeesPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');

  return (
    <MasterListShell
      title="담당자 관리"
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <EmployeeFilters depts={depts} />
          <RoleGuard role="OPERATOR" myRoles={myRoles}>
            <EmployeeCreateButton depts={depts} myRoles={myRoles} />
          </RoleGuard>
        </div>
      }
      pagination={<ServerListPagination meta={page.page} />}
    >
      <EmployeeTable rows={page.content} depts={depts} canEdit={canEdit} myRoles={myRoles} />
    </MasterListShell>
  );
}
