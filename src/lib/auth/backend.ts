import 'server-only';
import { ApiError, unwrapEnvelope, type Envelope } from '@/lib/api/envelope';
import type { TokenPayload } from './session';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

async function backendFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });

  let parsed: Envelope<T> | null = null;
  if (response.headers.get('content-type')?.includes('application/json')) {
    parsed = (await response.json()) as Envelope<T>;
  }

  if (!response.ok) {
    if (parsed?.error) {
      throw new ApiError(parsed.error.code, parsed.error.message, parsed.error.traceId);
    }
    throw new ApiError(
      `HTTP_${response.status}`,
      `Backend returned ${response.status}`,
    );
  }

  return unwrapEnvelope(parsed ?? ({ data: undefined } as Envelope<T>));
}

export function loginWithBackend(username: string, password: string) {
  return backendFetch<TokenPayload>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function refreshWithBackend(refreshToken: string) {
  return backendFetch<TokenPayload>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}
