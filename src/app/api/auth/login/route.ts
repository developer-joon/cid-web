import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loginWithBackend } from '@/lib/auth/backend';
import { saveTokens } from '@/lib/auth/server';
import { ApiError } from '@/lib/api/envelope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  persistent: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '잘못된 요청 본문입니다.' } },
      { status: 400 },
    );
  }

  try {
    const tokens = await loginWithBackend(parsed.username, parsed.password);
    await saveTokens(tokens, parsed.persistent);
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    if (e instanceof ApiError) {
      const status = e.code.startsWith('HTTP_')
        ? Number(e.code.slice(5)) || 500
        : 401;
      return NextResponse.json(
        { error: { code: e.code, message: e.message, traceId: e.traceId } },
        { status },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: 'BACKEND_UNREACHABLE',
          message: '백엔드 서버에 연결할 수 없습니다.',
        },
      },
      { status: 502 },
    );
  }
}
