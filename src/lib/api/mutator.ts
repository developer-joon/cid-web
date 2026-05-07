import { ApiError, type Envelope } from './envelope';

/**
 * Fetch wrapper used by Orval-generated clients and domain hooks.
 *
 * Contract:
 * - On 2xx with `{ data, error: null }` envelope → returns `data` typed as T.
 * - On any non-2xx, or 2xx with `error` present → throws ApiError.
 * - On 204 No Content → returns null cast to T.
 * - Generates an `X-Trace-Id` if caller did not supply one. The id is included
 *   in thrown ApiError.traceId for log correlation.
 *
 * Note: cid-api's OpenAPI does not declare 2xx response schemas, so Orval's
 * generated `Promise<T>` for success is `void`. Domain hooks must Zod-parse
 * the result themselves.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const callerHeaders = init?.headers as Record<string, string> | undefined;
  const traceId = callerHeaders?.['X-Trace-Id'] ?? crypto.randomUUID();

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'X-Trace-Id': traceId,
      ...(callerHeaders ?? {}),
    },
    credentials: 'same-origin',
  });

  if (response.status === 204) {
    return null as T;
  }

  let body: unknown = undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => undefined);
  }

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

export default apiFetch;
