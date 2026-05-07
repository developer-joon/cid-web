'use client';

import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm">
      <h2 className="mb-2 text-base font-semibold text-destructive">목록을 불러오지 못했습니다.</h2>
      <p className="text-muted-foreground">잠시 후 다시 시도해 주세요. 문제 보고 시 traceId를 함께 알려주세요.</p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground">digest: {error.digest}</p> : null}
      <Button onClick={reset} className="mt-4" variant="outline">다시 시도</Button>
    </div>
  );
}
