import { z } from 'zod';
import type { CreateCiRequest, UpdateCiRequest, CiServerData } from '@/api/generated/schemas';

const Yn = z.enum(['Y', 'N']);

export const serverFormSchema = z.object({
  // CI common
  ciNm: z.string().min(1, '필수입니다.').max(100),
  ciBizwrkNm: z.string().max(200).optional().or(z.literal('')),
  ciRoleNm: z.string().max(200).optional().or(z.literal('')),
  envrnGpCd: z.string().optional().or(z.literal('')),
  grdCd: z.string().optional().or(z.literal('')),
  locId: z.number().int().optional(),
  ciDescp: z.string().max(2000).optional().or(z.literal('')),
  // serverData
  hostNm: z.string().max(100).optional().or(z.literal('')),
  assetId: z.string().max(100).optional().or(z.literal('')),
  ossId: z.string().max(100).optional().or(z.literal('')),
  sysVidId: z.string().max(100).optional().or(z.literal('')),
  deviceNm: z.string().max(100).optional().or(z.literal('')),
  vendorId: z.number().int().optional(),
  modelNm: z.string().max(100).optional().or(z.literal('')),
  serialNo: z.string().max(100).optional().or(z.literal('')),
  osTpNm: z.string().max(100).optional().or(z.literal('')),
  osVer: z.string().max(50).optional().or(z.literal('')),
  cpucoreCnt: z.number().int().min(0).optional(),
  memoryCapa: z.number().min(0).optional(),
  diskCapa: z.number().min(0).optional(),
  virtMchnYn: Yn.default('N'),
  virtMchnPltfomNm: z.string().max(100).optional().or(z.literal('')),
  rackId: z.number().int().optional(),
  introDt: z.string().optional().or(z.literal('')),
  maintEndDt: z.string().optional().or(z.literal('')),
  monitYn: Yn.default('N'),
  osBackupYn: Yn.default('N'),
  alarmCallYn: Yn.default('N'),
  mngYn: Yn.default('N'),
  aciLvlGrd: z.string().optional().or(z.literal('')),
  inetFacingYn: Yn.default('N'),
  // change reason (UI-only, not in payload)
  changeReason: z.string().max(500).optional().or(z.literal('')),
});

export type ServerFormValues = z.infer<typeof serverFormSchema>;

export const defaultServerFormValues: ServerFormValues = {
  ciNm: '',
  ciBizwrkNm: '',
  ciRoleNm: '',
  envrnGpCd: '',
  grdCd: '',
  locId: undefined,
  ciDescp: '',
  hostNm: '',
  assetId: '',
  ossId: '',
  sysVidId: '',
  deviceNm: '',
  vendorId: undefined,
  modelNm: '',
  serialNo: '',
  osTpNm: '',
  osVer: '',
  cpucoreCnt: undefined,
  memoryCapa: undefined,
  diskCapa: undefined,
  virtMchnYn: 'N',
  virtMchnPltfomNm: '',
  rackId: undefined,
  introDt: '',
  maintEndDt: '',
  monitYn: 'N',
  osBackupYn: 'N',
  alarmCallYn: 'N',
  mngYn: 'N',
  aciLvlGrd: '',
  inetFacingYn: 'N',
  changeReason: '',
};

const blankToUndef = (v: string | undefined): string | undefined => (v && v.length > 0 ? v : undefined);

function buildServerData(v: ServerFormValues): CiServerData {
  return {
    hostNm: blankToUndef(v.hostNm),
    assetId: blankToUndef(v.assetId),
    ossId: blankToUndef(v.ossId),
    sysVidId: blankToUndef(v.sysVidId),
    deviceNm: blankToUndef(v.deviceNm),
    vendorId: v.vendorId,
    modelNm: blankToUndef(v.modelNm),
    serialNo: blankToUndef(v.serialNo),
    osTpNm: blankToUndef(v.osTpNm),
    osVer: blankToUndef(v.osVer),
    cpucoreCnt: v.cpucoreCnt,
    memoryCapa: v.memoryCapa,
    diskCapa: v.diskCapa,
    virtMchnYn: v.virtMchnYn,
    virtMchnPltfomNm: blankToUndef(v.virtMchnPltfomNm),
    rackId: v.rackId,
    introDt: blankToUndef(v.introDt),
    maintEndDt: blankToUndef(v.maintEndDt),
    monitYn: v.monitYn,
    osBackupYn: v.osBackupYn,
    alarmCallYn: v.alarmCallYn,
    mngYn: v.mngYn,
    aciLvlGrd: blankToUndef(v.aciLvlGrd),
    inetFacingYn: v.inetFacingYn,
  };
}

export function toCreatePayload(v: ServerFormValues): CreateCiRequest {
  return {
    ciNm: v.ciNm,
    ciTpCd: 'SERVER',
    ciBizwrkNm: blankToUndef(v.ciBizwrkNm),
    ciRoleNm: blankToUndef(v.ciRoleNm),
    envrnGpCd: blankToUndef(v.envrnGpCd),
    grdCd: blankToUndef(v.grdCd),
    locId: v.locId,
    ciDescp: blankToUndef(v.ciDescp),
    serverData: buildServerData(v),
  };
}

export function toUpdatePayload(v: ServerFormValues): UpdateCiRequest {
  return {
    ciNm: v.ciNm,
    ciBizwrkNm: blankToUndef(v.ciBizwrkNm),
    ciRoleNm: blankToUndef(v.ciRoleNm),
    envrnGpCd: blankToUndef(v.envrnGpCd),
    grdCd: blankToUndef(v.grdCd),
    locId: v.locId,
    ciDescp: blankToUndef(v.ciDescp),
    serverData: buildServerData(v),
  };
}
