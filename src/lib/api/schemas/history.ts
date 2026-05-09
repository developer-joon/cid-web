import { z } from 'zod';
import { pageSchema } from './pagination';
import { CiDetailSchema } from './ci';

/** Revision type: backend may return enum string or numeric code. Tolerate both. */
const RevType = z.union([
  z.enum(['ADD', 'MODIFY', 'DELETE']),
  z.number().int().min(0).max(2).transform((n) => (['ADD', 'MODIFY', 'DELETE'][n] ?? 'MODIFY') as 'ADD' | 'MODIFY' | 'DELETE'),
]);

export const HistoryEntrySchema = z.object({
  rev: z.number().int(),
  revDt: z.string().nullish(),                    // ISO datetime
  revType: RevType.nullish(),
  username: z.string().nullish(),
  changeReason: z.string().nullish(),             // backend returns null for absent reason
});
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const HistoryPageSchema = pageSchema(HistoryEntrySchema);

/** Snapshot at a given rev — assumed to mirror CiDetailSchema. Tolerate unknown fields. */
export const HistoryCiSnapshotSchema = CiDetailSchema.partial().passthrough();
export type HistoryCiSnapshot = z.infer<typeof HistoryCiSnapshotSchema>;
