import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { RoleGuard } from '@/lib/auth/rbac';
import { ServerDetailActions } from './server-detail-actions';
import type { CiDetail } from '@/lib/api/schemas';

interface Props {
  ci: CiDetail;
  myRoles: readonly string[];
}

function statusBadge(stat: string | undefined) {
  if (stat === 'ACTIVE') return <Badge variant="success">운영중</Badge>;
  if (stat === 'DECOMMISSIONED') return <Badge variant="destructive">폐기</Badge>;
  return <Badge>{stat ?? '—'}</Badge>;
}

export function ServerDetailHeader({ ci, myRoles }: Props) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-3 text-xl font-semibold">
        <Link href={'/servers' as Route} className="text-primary hover:underline">
          ← 서버 목록
        </Link>
        <span className="text-border">/</span>
        {ci.ciNm}
        {statusBadge(ci.ciStatVal)}
      </h2>

      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={200}>
          <RoleGuard role="USER" myRoles={myRoles}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled aria-disabled>📝 이력</Button>
              </TooltipTrigger>
              <TooltipContent>다음 사이클에서 활성화됩니다.</TooltipContent>
            </Tooltip>
          </RoleGuard>
        </TooltipProvider>
        <ServerDetailActions ci={ci} myRoles={myRoles} />
      </div>
    </div>
  );
}
