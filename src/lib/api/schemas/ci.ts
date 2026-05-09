import { z } from 'zod';
import { pageSchema } from './pagination';

// Backend serializes empty/absent fields as JSON null. Coerce null → undefined
// so downstream form types remain `T | undefined`.
const optStr = z.string().nullish().transform((v) => v ?? undefined);
const optNum = z.number().int().nullish().transform((v) => v ?? undefined);
const optFloat = z.number().nullish().transform((v) => v ?? undefined);
const Yn = z.enum(['Y', 'N']).nullish().transform((v) => v ?? undefined);

export const CiServerDataSchema = z.object({
  hostNm: optStr,
  assetId: optStr,
  ossId: optStr,
  sysVidId: optStr,
  deviceNm: optStr,
  vendorId: optNum,
  modelNm: optStr,
  serialNo: optStr,
  osTpNm: optStr,
  osVer: optStr,
  cpucoreCnt: optNum,
  memoryCapa: optFloat,
  diskCapa: optFloat,
  virtMchnYn: Yn,
  virtMchnPltfomNm: optStr,
  rackId: optNum,
  introDt: optStr,
  maintEndDt: optStr,
  monitYn: Yn,
  osBackupYn: Yn,
  alarmCallYn: Yn,
  mngYn: Yn,
  aciLvlGrd: optStr,
  inetFacingYn: Yn,
});
export type CiServerData = z.infer<typeof CiServerDataSchema>;

export const CiListItemSchema = z.object({
  ciId: z.number().int(),
  ciNm: z.string(),
  ciTpCd: z.string(),
  ciStatVal: optStr,
  envrnGpCd: optStr,
  ciBizwrkNm: optStr,
  grdCd: optStr,
  locId: optNum,
  locName: optStr,
  rackName: optStr,
});
export type CiListItem = z.infer<typeof CiListItemSchema>;

export const CiListPageSchema = pageSchema(CiListItemSchema);
export type CiListPage = z.infer<typeof CiListPageSchema>;

export const CiDetailSchema = CiListItemSchema.extend({
  ciRoleNm: optStr,
  ciDescp: optStr,
  serverData: CiServerDataSchema.optional().nullable(),
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
