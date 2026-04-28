'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import type { MyProfileResponse } from '@/api/generated/schemas';

interface HeaderProps {
  profile: MyProfileResponse;
}

export function Header({ profile }: HeaderProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'CMDB';

  async function handleLogout() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('로그아웃되었습니다.');
      router.replace('/login');
      router.refresh();
    } catch {
      toast.error('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setPending(false);
    }
  }

  const displayName = profile.name || profile.uid || profile.email || '사용자';

  return (
    <header className="h-14 bg-background border-b border-border flex items-center px-6 gap-4">
      <div className="font-bold text-primary text-lg">{appName}</div>
      <div className="flex-1 max-w-md">
        <Input
          type="search"
          placeholder="🔍 IP 또는 호스트명으로 검색…"
          className="h-9"
          disabled
        />
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span aria-hidden>👤</span>
        <span className="text-foreground" title={profile.email ?? undefined}>
          {displayName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={pending}
          aria-label="로그아웃"
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-1">로그아웃</span>
        </Button>
      </div>
    </header>
  );
}
