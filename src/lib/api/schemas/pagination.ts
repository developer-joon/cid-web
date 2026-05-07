import { z } from 'zod';

export const PageMetaSchema = z.object({
  number: z.number().int().nonnegative(),       // 0-base from backend
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type PageMeta = z.infer<typeof PageMetaSchema>;

/** Spring `Page<T>` envelope (post `data` unwrap). */
export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item),
    page: PageMetaSchema,
  });
}
