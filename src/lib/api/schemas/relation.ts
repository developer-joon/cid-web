import { z } from 'zod';
import { pageSchema } from './pagination';

export const RelationItemSchema = z.object({
  relId: z.number().int(),
  sourcCiId: z.number().int(),
  trgtCiId: z.number().int(),
  relTpId: z.number().int(),
  fwdLblNm: z.string().optional(),
  bwdLblNm: z.string().optional(),
  sourcCiNm: z.string().optional(),
  trgtCiNm: z.string().optional(),
  remk: z.string().optional(),
});
export type RelationItem = z.infer<typeof RelationItemSchema>;

/**
 * Backend may return:
 *   1. `{forward, backward}` — pre-grouped
 *   2. a flat array
 *   3. HAL/Spring Page envelope `{_embedded?: {...List: T[]}, page: ...}`
 *      (current backend shape)
 */
export const CiRelationsResponseSchema = z.union([
  z.object({
    forward: z.array(RelationItemSchema),
    backward: z.array(RelationItemSchema),
  }),
  z.array(RelationItemSchema),
  pageSchema(RelationItemSchema).transform((p) => p.content),
]);
export type CiRelationsResponse = z.infer<typeof CiRelationsResponseSchema>;

export interface CiRelationsGrouped {
  forward: RelationItem[];
  backward: RelationItem[];
}

/** Normalize either backend shape into {forward, backward} given the focal ciId. */
export function groupRelations(raw: CiRelationsResponse, ciId: number): CiRelationsGrouped {
  if (Array.isArray(raw)) {
    const forward: RelationItem[] = [];
    const backward: RelationItem[] = [];
    for (const r of raw) {
      if (r.sourcCiId === ciId) forward.push(r);
      else if (r.trgtCiId === ciId) backward.push(r);
    }
    return { forward, backward };
  }
  return { forward: raw.forward, backward: raw.backward };
}
