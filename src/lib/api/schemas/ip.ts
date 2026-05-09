import { z } from 'zod';

const optStr = z.string().nullish().transform((v) => v ?? undefined);
const optNum = z.number().int().nullish().transform((v) => v ?? undefined);

export const CiIpItemSchema = z.object({
  ipId: z.number().int(),
  ipAddr: z.string(),
  ipTpCd: z.string(),
  hostNm: optStr,
  macAddr: optStr,
  dnsNm: optStr,
  subnetId: optNum,
  subnetCidrAddr: optStr,
});
export type CiIpItem = z.infer<typeof CiIpItemSchema>;

/**
 * Tolerate three response shapes for a CI's IP list:
 *   1. plain array `[...]`
 *   2. HATEOAS envelope `{ _embedded: { ipDtoList: [...] }, page, _links }`
 *      (`_embedded` is omitted when empty)
 *   3. plain Spring page `{ content: [...], totalElements, ... }`
 */
export const CiIpListSchema = z.unknown().transform((raw, ctx): CiIpItem[] => {
  if (Array.isArray(raw)) {
    const parsed = z.array(CiIpItemSchema).safeParse(raw);
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: `IP 항목 파싱 실패: ${parsed.error.message}` });
      return z.NEVER;
    }
    return parsed.data;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    let items: unknown[] = [];
    if (Array.isArray(obj.content)) {
      items = obj.content;
    } else if (obj._embedded && typeof obj._embedded === 'object') {
      const emb = obj._embedded as Record<string, unknown>;
      const key = Object.keys(emb).find((k) => Array.isArray(emb[k]));
      if (key) items = emb[key] as unknown[];
    } else if (obj.page && typeof obj.page === 'object') {
      // HATEOAS with empty list — `_embedded` is absent.
      items = [];
    } else {
      ctx.addIssue({ code: 'custom', message: '알 수 없는 IP 목록 응답 형식입니다.' });
      return z.NEVER;
    }
    const parsed = z.array(CiIpItemSchema).safeParse(items);
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: `IP 항목 파싱 실패: ${parsed.error.message}` });
      return z.NEVER;
    }
    return parsed.data;
  }
  ctx.addIssue({ code: 'custom', message: 'IP 목록이 객체가 아닙니다.' });
  return z.NEVER;
});
