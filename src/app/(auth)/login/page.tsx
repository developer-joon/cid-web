import * as React from 'react';
import { LoginForm } from '@/components/features/auth/login-form';

export const metadata = {
  title: 'CMDB · 로그인',
};

export default function LoginPage() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'CMDB';
  return (
    <div className="w-full max-w-[420px]">
      <header className="text-center mb-8">
        <div className="text-5xl mb-3" aria-hidden>
          🔧
        </div>
        <h1 className="text-white text-3xl font-bold">{appName}</h1>
        <p className="text-white/60 text-sm mt-1">
          Configuration Management Database
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-modal p-9">
        <h2 className="sr-only">LDAP / AD 로그인</h2>
        <React.Suspense fallback={null}>
          <LoginForm />
        </React.Suspense>
      </div>

      <footer className="text-center text-xs text-white/40 mt-6">
        © 2026 {appName} v1.0 · Powered by Your Company
      </footer>
    </div>
  );
}
