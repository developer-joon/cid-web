import { z } from 'zod';

export const PageMetaSchema = z.object({
  number: z.number().int().nonnegative(),       // 0-base from backend
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type PageMeta = z.infer<typeof PageMetaSchema>;

export interface PagedResult<T> {
  content: T[];
  page: PageMeta;
}

/**
 * Tolerate two backend page envelope shapes:
 * 1. HATEOAS: `{ _embedded?: { <key>: T[] }, page: PageMeta }`
 *    (`_embedded` is omitted when the list is empty)
 * 2. Plain Spring PageImpl: `{ content: T[], number, size, totalElements, totalPages, ... }`
 */
export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.unknown().transform((raw, ctx): PagedResult<z.infer<T>> => {
    if (raw === null || typeof raw !== 'object') {
      ctx.addIssue({ code: 'custom', message: '페이지 응답이 객체가 아닙니다.' });
      return z.NEVER;
    }
    const obj = raw as Record<string, unknown>;

    // Plain Page shape — has top-level `content` array
    if (Array.isArray(obj.content) && typeof obj.totalElements === 'number') {
      const itemsParse = z.array(item).safeParse(obj.content);
      if (!itemsParse.success) {
        ctx.addIssue({ code: 'custom', message: `페이지 항목 파싱 실패: ${itemsParse.error.message}` });
        return z.NEVER;
      }
      return {
        content: itemsParse.data,
        page: {
          number: typeof obj.number === 'number' ? obj.number : 0,
          size: typeof obj.size === 'number' ? obj.size : itemsParse.data.length,
          totalElements: obj.totalElements,
          totalPages: typeof obj.totalPages === 'number' ? obj.totalPages : 0,
        },
      };
    }

    // HATEOAS shape — has nested `page` and optional `_embedded.<resourceList>`
    const meta = obj.page as Record<string, unknown> | undefined;
    if (meta && typeof meta.totalElements === 'number') {
      const embedded = obj._embedded as Record<string, unknown> | undefined;
      let rawItems: unknown[] = [];
      if (embedded) {
        const firstKey = Object.keys(embedded).find((k) => Array.isArray((embedded as Record<string, unknown>)[k]));
        if (firstKey) rawItems = embedded[firstKey] as unknown[];
      }
      const itemsParse = z.array(item).safeParse(rawItems);
      if (!itemsParse.success) {
        ctx.addIssue({ code: 'custom', message: `_embedded 항목 파싱 실패: ${itemsParse.error.message}` });
        return z.NEVER;
      }
      return {
        content: itemsParse.data,
        page: {
          number: typeof meta.number === 'number' ? meta.number : 0,
          size: typeof meta.size === 'number' ? meta.size : itemsParse.data.length,
          totalElements: meta.totalElements,
          totalPages: typeof meta.totalPages === 'number' ? meta.totalPages : 0,
        },
      };
    }

    ctx.addIssue({ code: 'custom', message: '알 수 없는 페이지 envelope 형식입니다.' });
    return z.NEVER;
  });
}
