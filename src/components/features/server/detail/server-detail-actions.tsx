'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/lib/auth/rbac';
import { DecommissionDialog } from './decommission-dialog';
import type { CiDetail } from '@/lib/api/schemas/ci';

export function ServerDetailActions({ ci, myRoles }: { ci: CiDetail; myRoles: readonly string[] }) {
  const [decomOpen, setDecomOpen] = useState(false);
  const ciId = ci.ciId;

  return (
    <div className="flex items-center gap-2">
      <RoleGuard role="OPERATOR" myRoles={myRoles}>
        <Link href={`/servers/${ciId}/edit` as Route}>
          <Button>편집</Button>
        </Link>
      </RoleGuard>
      <RoleGuard role="ADMIN" myRoles={myRoles}>
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive"
          onClick={() => setDecomOpen(true)}
          disabled={ci.ciStatVal === 'DECOMMISSIONED'}
        >
          폐기
        </Button>
        <DecommissionDialog ciId={ciId} ciNm={ci.ciNm} open={decomOpen} onOpenChange={setDecomOpen} />
      </RoleGuard>
    </div>
  );
}
