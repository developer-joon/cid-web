'use client';

import { useUrlFilters } from '@/hooks/use-url-filters';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const FILTER_KEYS = ['useYn'] as const;

/** Checkbox: when checked → include inactive (no useYn filter). When unchecked → useYn=Y (active only). */
export function ActiveToggle() {
  const { values, set } = useUrlFilters({ keys: FILTER_KEYS });
  // Default UX: no useYn in URL → backend returns all → checkbox checked (include inactive).
  // Unchecking → set useYn=Y → active only.
  const includeInactive = values.useYn !== 'Y';
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="include-inactive"
        checked={includeInactive}
        onCheckedChange={(c) => set({ useYn: c ? '' : 'Y' })}
      />
      <Label htmlFor="include-inactive" className="cursor-pointer text-sm text-muted-foreground">비활성 포함</Label>
    </div>
  );
}
