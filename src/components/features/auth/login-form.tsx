'use client';

import * as React from 'react';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert } from '@/components/ui/alert';
import { loginSchema, type LoginFormValues } from './schema';

interface LoginErrorBody {
  error?: { code?: string; message?: string };
}

const SAFE_NEXT_REGEX = /^\/(?!\/)/;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  // Disable submit until React hydrates; prevents pre-hydration native GET
  // submission (would expose credentials in the URL) and lets Playwright's
  // auto-wait for `enabled` synchronize with hydration.
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', persistent: false },
  });

  const next = params.get('next');
  const safeNext = next && SAFE_NEXT_REGEX.test(next) ? next : '/';

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as LoginErrorBody;
        const message = body.error?.message || '로그인에 실패했습니다.';
        setServerError(message);
        return;
      }
      toast.success('로그인되었습니다.');
      router.replace(safeNext as Route);
      router.refresh();
    } catch {
      setServerError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도하세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Alert variant="info" className="text-xs">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-foreground/80">
            회사 LDAP / Active Directory 계정으로 로그인합니다.
            <br />
            최초 로그인 시 자동으로 계정이 생성됩니다.
          </div>
        </Alert>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="username">아이디 (사번 또는 이메일)</FormLabel>
              <FormControl>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="hong@company.com 또는 E12345"
                  disabled={submitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="password">비밀번호</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="LDAP 비밀번호 입력"
                  disabled={submitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="persistent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  id="persistent"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  disabled={submitting}
                />
              </FormControl>
              <FormLabel htmlFor="persistent" className="text-xs cursor-pointer">
                로그인 상태 유지
              </FormLabel>
            </FormItem>
          )}
        />

        {serverError ? (
          <Alert variant="destructive" className="text-xs">
            <span>{serverError}</span>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full h-11" disabled={!hydrated || submitting}>
          {submitting ? '로그인 중…' : 'LDAP 로그인'}
        </Button>
      </form>
    </Form>
  );
}
