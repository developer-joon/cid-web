import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { hasRole } from '@/lib/auth/roles';
import { getMyProfile } from '@/lib/auth/me';
import { getLocationsMap, getRacksMap, getVendorsMap } from '@/lib/master/server';
import { ServerCreateForm } from '@/components/features/server/forms/server-create-form';

export const dynamic = 'force-dynamic';

export default async function ServerCreatePage() {
  const profile = await getMyProfile();
  if (!hasRole(profile?.roles ?? [], 'OPERATOR')) {
    redirect('/servers');
  }

  const [locations, racks, vendors] = await Promise.all([
    getLocationsMap(), getRacksMap(), getVendorsMap(),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>서버 등록</CardTitle>
        </CardHeader>
      </Card>
      <ServerCreateForm locations={locations} racks={racks} vendors={vendors} />
    </div>
  );
}
