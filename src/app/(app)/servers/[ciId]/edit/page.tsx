import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { hasRole } from '@/lib/auth/roles';
import { getMyProfile } from '@/lib/auth/me';
import { ApiError } from '@/lib/api/envelope';
import { serverFetch } from '@/lib/api/server-fetch';
import { CiDetailSchema } from '@/lib/api/schemas/ci';
import { getLocationsMap, getRacksMap, getVendorsMap } from '@/lib/master/server';
import { ServerEditForm } from '@/components/features/server/forms/server-edit-form';
import { defaultServerFormValues, type ServerFormValues } from '@/components/features/server/forms/schema';
import type { CiDetail } from '@/lib/api/schemas/ci';
import type { MasterLocation, MasterRack, MasterVendor } from '@/lib/api/schemas/master';

export const dynamic = 'force-dynamic';

interface Params { ciId: string; }

function detailToForm(ci: CiDetail): ServerFormValues {
  const sd = ci.serverData ?? {};
  return {
    ...defaultServerFormValues,
    ciNm: ci.ciNm,
    ciBizwrkNm: ci.ciBizwrkNm ?? '',
    ciRoleNm: ci.ciRoleNm ?? '',
    envrnGpCd: ci.envrnGpCd ?? '',
    grdCd: ci.grdCd ?? '',
    locId: ci.locId,
    ciDescp: ci.ciDescp ?? '',
    hostNm: sd.hostNm ?? '',
    assetId: sd.assetId ?? '',
    ossId: sd.ossId ?? '',
    sysVidId: sd.sysVidId ?? '',
    deviceNm: sd.deviceNm ?? '',
    vendorId: sd.vendorId,
    modelNm: sd.modelNm ?? '',
    serialNo: sd.serialNo ?? '',
    osTpNm: sd.osTpNm ?? '',
    osVer: sd.osVer ?? '',
    cpucoreCnt: sd.cpucoreCnt,
    memoryCapa: sd.memoryCapa,
    diskCapa: sd.diskCapa,
    virtMchnYn: sd.virtMchnYn ?? 'N',
    virtMchnPltfomNm: sd.virtMchnPltfomNm ?? '',
    rackId: sd.rackId,
    introDt: sd.introDt ?? '',
    maintEndDt: sd.maintEndDt ?? '',
    monitYn: sd.monitYn ?? 'N',
    osBackupYn: sd.osBackupYn ?? 'N',
    alarmCallYn: sd.alarmCallYn ?? 'N',
    mngYn: sd.mngYn ?? 'N',
    aciLvlGrd: sd.aciLvlGrd ?? '',
    inetFacingYn: sd.inetFacingYn ?? 'N',
    changeReason: '',
  };
}

export default async function ServerEditPage({ params }: { params: Promise<Params> }) {
  const { ciId: ciIdRaw } = await params;
  const ciId = Number(ciIdRaw);
  if (!Number.isFinite(ciId) || ciId <= 0) notFound();

  const profile = await getMyProfile();
  if (!hasRole(profile?.roles ?? [], 'OPERATOR')) {
    redirect(`/servers/${ciId}`);
  }

  let ci: CiDetail, locations: Map<number, MasterLocation>, racks: Map<number, MasterRack>, vendors: Map<number, MasterVendor>;
  try {
    [ci, locations, racks, vendors] = await Promise.all([
      serverFetch<unknown>(`/api/v1/cis/${ciId}`).then((d) => CiDetailSchema.parse(d)),
      getLocationsMap(),
      getRacksMap(),
      getVendorsMap(),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>서버 편집 — {ci.ciNm}</CardTitle>
        </CardHeader>
      </Card>
      <ServerEditForm
        ciId={ciId}
        initial={detailToForm(ci)}
        locations={locations}
        racks={racks}
        vendors={vendors}
      />
    </div>
  );
}
