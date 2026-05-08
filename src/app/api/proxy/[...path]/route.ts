import { NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/envelope';
import { getSession, clearSession } from '@/lib/auth/server';
import { refreshAccessToken } from '@/lib/auth/refresh';
import type { TokenPayload } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'cookie',
]);

interface ProxyContext {
  params: Promise<{ path: string[] }>;
}

async function callBackend(
  path: string,
  search: string,
  method: string,
  headers: Headers,
  body: ArrayBuffer | undefined,
  accessToken: string,
): Promise<Response> {
  const outgoing = new Headers();
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) outgoing.set(key, value);
  });
  outgoing.set('Authorization', `Bearer ${accessToken}`);

  return fetch(`${BACKEND_URL}/${path}${search}`, {
    method,
    headers: outgoing,
    body: body && body.byteLength ? body : undefined,
    cache: 'no-store',
    redirect: 'manual',
  });
}

async function handle(
  req: Request,
  ctx: ProxyContext,
): Promise<Response> {
  const { path } = await ctx.params;
  const subpath = path.join('/');
  const search = new URL(req.url).search;
  const method = req.method;

  const session = await getSession();
  const tokens = session.tokens as TokenPayload | undefined;

  if (!tokens?.accessToken) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' } },
      { status: 401 },
    );
  }

  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  let upstream = await callBackend(
    subpath,
    search,
    method,
    req.headers,
    body,
    tokens.accessToken,
  );

  if (upstream.status === 401 && tokens.refreshToken) {
    try {
      const fresh = await refreshAccessToken(tokens.refreshToken);
      upstream = await callBackend(
        subpath,
        search,
        method,
        req.headers,
        body,
        fresh.accessToken,
      );
    } catch (e) {
      void e;
      await clearSession();
      return NextResponse.json(
        { error: { code: 'SESSION_EXPIRED', message: '세션이 만료되었습니다.' } },
        { status: 401 },
      );
    }
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(req: Request, ctx: ProxyContext) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: ProxyContext) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request, ctx: ProxyContext) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: ProxyContext) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: ProxyContext) {
  try {
    return await handle(req, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}

function errorResponse(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, traceId: e.traceId } },
      { status: 502 },
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
