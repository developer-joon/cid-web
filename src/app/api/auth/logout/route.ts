import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  await clearSession();
  return NextResponse.json({ data: { ok: true } });
}
