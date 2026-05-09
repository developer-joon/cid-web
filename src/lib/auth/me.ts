import 'server-only';
import { ApiError, unwrapEnvelope, type Envelope } from '@/lib/api/envelope';
import { getSession, clearSession } from './server';
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
      await clearSession();
      return null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      await clearSession();
      return null;
    }
    throw new ApiError(`HTTP_${response.status}`, response.statusText || 'me failed');
  }

  const body = (await response.json()) as Envelope<MyProfileResponse>;
  return unwrapEnvelope(body);
}
