import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGuard } from '@/lib/auth/rbac';
import { hasRole } from '@/lib/auth/roles';
import { getMyProfile } from '@/lib/auth/me';
import { serverFetch } from '@/lib/api/server-fetch';
import { SubnetsPageSchema } from '@/lib/api/schemas';
import { SubnetTree } from '@/components/features/master/subnet/subnet-tree';
import { SubnetCreateButton } from '@/components/features/master/subnet/subnet-create-dialog';

export const dynamic = 'force-dynamic';

export default async function SubnetListPage() {
  const [profile, raw] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>('/api/v1/subnets?page=0&size=500&sort=subnetId,asc'),
  ]);
  const page = SubnetsPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">IP 대역 (Subnet)</CardTitle>
        <RoleGuard role="OPERATOR" myRoles={myRoles}>
          <SubnetCreateButton allSubnets={page.content} />
        </RoleGuard>
      </CardHeader>
      <CardContent className="p-0">
        <SubnetTree rows={page.content} canEdit={canEdit} myRoles={myRoles} />
      </CardContent>
    </Card>
  );
}
