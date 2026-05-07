import { z } from 'zod';
import { pageSchema } from './pagination';

const Yn = z.enum(['Y', 'N']).optional();

export const CiServerDataSchema = z.object({
  hostNm: z.string().optional(),
  assetId: z.string().optional(),
  ossId: z.string().optional(),
  sysVidId: z.string().optional(),
  deviceNm: z.string().optional(),
  vendorId: z.number().int().optional(),
  modelNm: z.string().optional(),
  serialNo: z.string().optional(),
  osTpNm: z.string().optional(),
  osVer: z.string().optional(),
  cpucoreCnt: z.number().int().optional(),
  memoryCapa: z.number().optional(),
  diskCapa: z.number().optional(),
  virtMchnYn: Yn,
  virtMchnPltfomNm: z.string().optional(),
  rackId: z.number().int().optional(),
  introDt: z.string().optional(),
  maintEndDt: z.string().optional(),
  monitYn: Yn,
  osBackupYn: Yn,
  alarmCallYn: Yn,
  mngYn: Yn,
  aciLvlGrd: z.string().optional(),
  inetFacingYn: Yn,
});
export type CiServerData = z.infer<typeof CiServerDataSchema>;

export const CiListItemSchema = z.object({
  ciId: z.number().int(),
  ciNm: z.string(),
  ciTpCd: z.string(),
  ciStatVal: z.string().optional(),
  envrnGpCd: z.string().optional(),
  ciBizwrkNm: z.string().optional(),
  grdCd: z.string().optional(),
  locId: z.number().int().optional(),
  locName: z.string().optional(),
  rackName: z.string().optional(),
});
export type CiListItem = z.infer<typeof CiListItemSchema>;

export const CiListPageSchema = pageSchema(CiListItemSchema);
export type CiListPage = z.infer<typeof CiListPageSchema>;

export const CiDetailSchema = CiListItemSchema.extend({
  ciRoleNm: z.string().optional(),
  ciDescp: z.string().optional(),
  serverData: CiServerDataSchema.optional(),
  appData: z.unknown().optional(),
  cloudData: z.unknown().optional(),
  middlewareData: z.unknown().optional(),
  databaseData: z.unknown().optional(),
  networkData: z.unknown().optional(),
  securityData: z.unknown().optional(),
  storageData: z.unknown().optional(),
  pcData: z.unknown().optional(),
  vdiData: z.unknown().optional(),
});
export type CiDetail = z.infer<typeof CiDetailSchema>;
