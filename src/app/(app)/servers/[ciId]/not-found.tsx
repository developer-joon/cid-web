import Link from 'next/link';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="rounded-md border border-border bg-background p-8 text-center">
      <h2 className="mb-2 text-lg font-semibold">서버를 찾을 수 없습니다.</h2>
      <p className="mb-4 text-sm text-muted-foreground">존재하지 않거나 폐기된 CI 일 수 있습니다.</p>
      <Link href={'/servers' as Route}>
        <Button variant="outline">목록으로 돌아가기</Button>
      </Link>
    </div>
  );
}
