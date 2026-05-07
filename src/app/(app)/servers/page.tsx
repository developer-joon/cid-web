import Link from 'next/link';
import type { Route } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/lib/auth/rbac';
import { getMyProfile } from '@/lib/auth/me';
import { serverFetch } from '@/lib/api/server-fetch';
import { CiListPageSchema } from '@/lib/api/schemas';
import { parsePaging, toBackendPageable } from '@/lib/api/paging';
import { getLocationsMap } from '@/lib/master/server';
import { ServerListTable } from '@/components/features/server/list/server-list-table';
import { ServerListFilters } from '@/components/features/server/list/server-list-filters';
import { ServerListPagination } from '@/components/features/server/list/server-list-pagination';

export const dynamic = 'force-dynamic';

interface SearchParams {
  ciNm?: string;
  envrnGpCd?: string;
  ciStatVal?: string;
  page?: string;
  size?: string;
  sort?: string;
}

function pickStringEntries(sp: SearchParams): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') out.push([k, v]);
  }
  return out;
}

export default async function ServersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const paging = parsePaging(new URLSearchParams(pickStringEntries(sp)));
  const back = toBackendPageable(paging);

  const backendQs = new URLSearchParams({
    ciTpCd: 'SERVER',
    page: String(back.page),
    size: String(back.size),
    sort: back.sort,
  });
  if (sp.ciNm) backendQs.set('ciNm', sp.ciNm);
  if (sp.envrnGpCd) backendQs.set('envrnGpCd', sp.envrnGpCd);
  if (sp.ciStatVal) backendQs.set('ciStatVal', sp.ciStatVal);

  const [profile, raw, locations] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>(`/api/v1/cis?${backendQs.toString()}`),
    getLocationsMap(),
  ]);

  const page = CiListPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];

  // Sort href factory: keep filters, drop page on sort change.
  const buildSortHref = (nextSort: string): string => {
    const next = new URLSearchParams();
    if (sp.ciNm) next.set('ciNm', sp.ciNm);
    if (sp.envrnGpCd) next.set('envrnGpCd', sp.envrnGpCd);
    if (sp.ciStatVal) next.set('ciStatVal', sp.ciStatVal);
    next.set('size', String(paging.size));
    next.set('sort', nextSort);
    return `/servers?${next.toString()}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">서버 목록</CardTitle>
        <RoleGuard role="OPERATOR" myRoles={myRoles}>
          <Link href={'/servers/new' as Route}>
            <Button>+ 등록</Button>
          </Link>
        </RoleGuard>
      </CardHeader>
      <ServerListFilters />
      <CardContent className="p-0">
        <ServerListTable
          rows={page.content}
          locations={locations}
          currentSort={paging.sort}
          buildSortHref={buildSortHref}
        />
      </CardContent>
      <ServerListPagination meta={page.page} />
    </Card>
  );
}
