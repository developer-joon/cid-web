import 'server-only';
import { ApiError, type Envelope } from './envelope';
import { getSession, clearSession } from '@/lib/auth/server';
import { refreshAccessToken } from '@/lib/auth/refresh';

const BACKEND_URL = () => process.env.BACKEND_API_URL ?? 'http://localhost:8080';

/** Extended RequestInit for server-side fetch with optional audit header. */
export interface ServerFetchInit extends RequestInit {
  /** When set, forwarded as the `X-Change-Reason` request header. Empty/undefined is ignored. */
  changeReason?: string;
}

/**
 * Server-side fetch to cid-api. Reads Bearer from iron-session, attempts a
 * single refresh + retry on 401, and unwraps the `{ data, error }` envelope.
 *
 * Use from Server Components, Route Handlers, and other server contexts.
 * Browser client code uses `apiFetch` (Orval mutator) to go through `/api/proxy`.
 */
export async function serverFetch<T>(path: string, init?: ServerFetchInit): Promise<T> {
  const { changeReason, ...rest } = init ?? {};
  const session = await getSession();
  const tokens = session.tokens;
  if (!tokens?.accessToken) {
    throw new ApiError('AUTH_NO_SESSION', '세션이 없습니다.');
  }

  const callerHeaders = (rest.headers as Record<string, string> | undefined) ?? {};
  const traceId = callerHeaders['X-Trace-Id'] ?? crypto.randomUUID();

  const callOnce = (token: string) =>
    fetch(`${BACKEND_URL()}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...callerHeaders,
        ...(changeReason ? { 'X-Change-Reason': changeReason } : {}),
        Authorization: `Bearer ${token}`,
        'X-Trace-Id': traceId,
      },
      cache: 'no-store',
    });

  let response = await callOnce(tokens.accessToken);

  if (response.status === 401 && tokens.refreshToken) {
    try {
      const fresh = await refreshAccessToken(tokens.refreshToken);
      response = await callOnce(fresh.accessToken);
    } catch (e) {
      await clearSession();
      throw e instanceof ApiError ? e : new ApiError('AUTH_REFRESH_FAILED', 'refresh failed');
    }
  }

  if (response.status === 204) return null as T;

  let body: unknown;
  const ct = response.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) body = await response.json().catch(() => undefined);

  const envelope = body as Envelope<T> | undefined;
  if (!response.ok || envelope?.error) {
    const err = envelope?.error;
    throw new ApiError(
      err?.code ?? `HTTP_${response.status}`,
      err?.message ?? response.statusText ?? 'Request failed',
      err?.traceId ?? traceId,
    );
  }
  return (envelope?.data ?? null) as T;
}
