'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { PageMeta } from '@/lib/api/schemas';
import { cn } from '@/lib/utils';

interface Props { meta: PageMeta; }

const SIBLINGS = 1;

function pageList(currentUi: number, totalPages: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) out.push(i);
    return out;
  }
  out.push(1);
  if (currentUi - SIBLINGS > 2) out.push('…');
  for (let i = Math.max(2, currentUi - SIBLINGS); i <= Math.min(totalPages - 1, currentUi + SIBLINGS); i++) {
    out.push(i);
  }
  if (currentUi + SIBLINGS < totalPages - 1) out.push('…');
  out.push(totalPages);
  return out;
}

export function ServerListPagination({ meta }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams() ?? new URLSearchParams();
  const currentUi = meta.number + 1;
  const totalPages = Math.max(1, meta.totalPages);

  function go(target: number) {
    if (target < 1 || target > totalPages || target === currentUi) return;
    const next = new URLSearchParams(sp.toString());
    next.set('page', String(target));
    router.replace(`${pathname}?${next.toString()}` as Parameters<typeof router.replace>[0]);
  }

  return (
    <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
      <div>총 {meta.totalElements.toLocaleString()}건</div>
      <div className="flex gap-1">
        {pageList(currentUi, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-2 text-muted-foreground/70">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded border text-[12px]',
                p === currentUi
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {p}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
