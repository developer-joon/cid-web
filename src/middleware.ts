import { NextResponse, type NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import { SESSION_COOKIE_NAME, type SessionData } from '@/lib/auth/session';

const PUBLIC_PATHS = ['/login'];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  let authenticated = false;

  if (cookie?.value) {
    const password = process.env.SESSION_SECRET;
    if (password) {
      try {
        const data = await unsealData<SessionData>(cookie.value, { password });
        authenticated = !!data?.tokens?.accessToken;
      } catch {
        authenticated = false;
      }
    }
  }

  if (!authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     *  - /api/*           (handled by route handlers themselves)
     *  - /_next/*         (Next internals)
     *  - /favicon.ico, public assets
     *  - /login (already in PUBLIC_PATHS but excluded here too for clarity)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
