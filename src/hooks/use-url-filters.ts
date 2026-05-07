'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface UrlFiltersOptions<K extends string> {
  keys: readonly K[];
  resetPage?: boolean;
}

export interface UrlFiltersResult<K extends string> {
  values: Record<K, string>;
  set: (next: Partial<Record<K, string>>) => void;
}

/**
 * Read/write a small set of string filters from the URL searchParams.
 * Empty strings are stripped (the URL stays clean).
 * On any change, also drops the `page` parameter so the user goes back to page 1.
 */
export function useUrlFilters<K extends string>({
  keys,
  resetPage = true,
}: UrlFiltersOptions<K>): UrlFiltersResult<K> {
  const router = useRouter();
  const pathname = usePathname();
  const rawSp = useSearchParams();
  // Stable reference: if useSearchParams returns null (outside Suspense boundary), fall back to empty.
  const sp = useMemo(() => rawSp ?? new URLSearchParams(), [rawSp]);

  const values = Object.fromEntries(keys.map((k) => [k, sp.get(k) ?? ''])) as Record<K, string>;

  const set = useCallback(
    (next: Partial<Record<K, string>>) => {
      const merged = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(next) as [K, string | undefined][]) {
        if (!v) merged.delete(k);
        else merged.set(k, v);
      }
      if (resetPage) merged.delete('page');
      const qs = merged.toString();
      // Cast needed: Next.js typed router expects RouteImpl<string>, plain string requires assertion.
      router.replace((qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0]);
    },
    [router, pathname, sp, resetPage],
  );

  return { values, set };
}
