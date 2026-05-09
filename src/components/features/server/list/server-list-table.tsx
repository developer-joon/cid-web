import Link from 'next/link';
import type { Route } from 'next';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CiListItem, MasterLocation } from '@/lib/api/schemas';
import { formatLocation } from '@/lib/master/format';
import { SERVER_COLUMNS, type ColumnDef } from './server-list-columns';

interface Props {
  rows: CiListItem[];
  locations: Map<number, MasterLocation>;
  /** Current sort string e.g. "ciId,desc". Undefined means no active sort. */
  currentSort?: string;
  /** Builds an `?sort=...` href that retains other params; receives full sort string. */
  buildSortHref: (nextSort: string) => string;
}

function sortIndicator(currentSort: string | undefined, key: string): string {
  if (!currentSort) return '';
  const [k, dir] = currentSort.split(',');
  if (k !== key) return '';
  return dir === 'asc' ? ' ▲' : ' ▼';
}

function nextSortFor(currentSort: string | undefined, key: string): string {
  if (!currentSort) return `${key},asc`;
  const [k, dir] = currentSort.split(',');
  if (k !== key) return `${key},asc`;
  return dir === 'asc' ? `${key},desc` : `${key},asc`;
}

function statusBadge(stat: string | undefined) {
  if (stat === 'ACTIVE') return <Badge variant="success">운영중</Badge>;
  if (stat === 'DECOMMISSIONED') return <Badge variant="destructive">폐기</Badge>;
  return <Badge>{stat ?? '—'}</Badge>;
}

function gradeBadge(grd: string | undefined) {
  if (!grd) return '—';
  const variant = grd === 'A' ? 'success' : grd === 'B' ? 'info' : 'warning';
  return <Badge variant={variant}>{grd}</Badge>;
}

export function ServerListTable({ rows, locations, currentSort, buildSortHref }: Props) {
  if (rows.length === 0) {
    return <div className="p-10 text-center text-sm text-muted-foreground">조회된 서버가 없습니다.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {SERVER_COLUMNS.map((c: ColumnDef) =>
            c.sortable ? (
              <TableHead key={c.key}>
                <Link
                  href={buildSortHref(nextSortFor(currentSort, c.key)) as Route}
                  className="hover:text-foreground"
                >
                  {c.header}
                  <span className="text-primary">{sortIndicator(currentSort, c.key)}</span>
                </Link>
              </TableHead>
            ) : (
              <TableHead key={c.key}>{c.header}</TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ciId} className="cursor-pointer">
            <TableCell>{statusBadge(row.ciStatVal)}</TableCell>
            <TableCell>
              <Link
                href={`/servers/${row.ciId}` as Route}
                className="font-semibold text-foreground hover:text-primary"
              >
                {row.ciNm}
              </Link>
            </TableCell>
            <TableCell>{row.ciBizwrkNm ?? '—'}</TableCell>
            <TableCell>{row.envrnGpCd ?? '—'}</TableCell>
            <TableCell>
              {formatLocation(row.locId !== undefined ? locations.get(row.locId) : undefined)}
            </TableCell>
            <TableCell>{gradeBadge(row.grdCd)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
