import { getMyProfile } from '@/lib/auth/me';
import { hasRole } from '@/lib/auth/roles';
import { serverFetch } from '@/lib/api/server-fetch';
import { DeptsPageSchema } from '@/lib/api/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGuard } from '@/lib/auth/rbac';
import { DeptTree } from '@/components/features/master/dept/dept-tree';
import { DeptCreateButton } from '@/components/features/master/dept/dept-create-dialog';

export const dynamic = 'force-dynamic';

export default async function DeptListPage() {
  const [profile, raw] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>('/api/v1/master/depts?page=0&size=500&sort=deptId,asc'),
  ]);
  const page = DeptsPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">부서 관리</CardTitle>
        <RoleGuard role="OPERATOR" myRoles={myRoles}>
          <DeptCreateButton allDepts={page.content} myRoles={myRoles} />
        </RoleGuard>
      </CardHeader>
      <CardContent className="p-0">
        <DeptTree rows={page.content} canEdit={canEdit} myRoles={myRoles} />
      </CardContent>
    </Card>
  );
}
