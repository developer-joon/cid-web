import 'server-only';
import { ApiError, unwrapEnvelope, type Envelope } from '@/lib/api/envelope';
import { getSession } from './server';
import { refreshAccessToken } from './refresh';
import type { MyProfileResponse } from '@/api/generated/schemas';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

async function fetchMe(accessToken: string): Promise<Response> {
  return fetch(`${BACKEND_URL}/api/v1/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
}

export async function getMyProfile(): Promise<MyProfileResponse | null> {
  const session = await getSession();
  const tokens = session.tokens;
  if (!tokens?.accessToken) return null;

  let response = await fetchMe(tokens.accessToken);

  if (response.status === 401 && tokens.refreshToken) {
    try {
      const fresh = await refreshAccessToken(tokens.refreshToken);
      response = await fetchMe(fresh.accessToken);
    } catch {
      // Refresh failed — caller (layout) will redirect to /login; the
      // stale cookie is overwritten on next successful login. We avoid
      // clearSession() here because Next.js 15 forbids cookie writes
      // from Server Components.
      return null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Stale or unauthorized — same rationale as above: don't write
      // cookies here; let layout redirect and let login overwrite.
      return null;
    }
    throw new ApiError(`HTTP_${response.status}`, response.statusText || 'me failed');
  }

  const body = (await response.json()) as Envelope<MyProfileResponse>;
  return unwrapEnvelope(body);
}
