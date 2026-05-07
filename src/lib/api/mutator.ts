import { ApiError, type Envelope } from './envelope';

function normalizeHeaders(input: HeadersInit | undefined): Record<string, string> {
  if (!input) return {};
  if (input instanceof Headers) {
    const out: Record<string, string> = {};
    // Headers.forEach delivers keys in lowercase (HTTP spec); preserve as-is.
    input.forEach((v, k) => { out[k] = v; });
    return out;
  }
  if (Array.isArray(input)) {
    return Object.fromEntries(input);
  }
  return { ...input };
}

/** Case-insensitive header lookup. */
function getHeader(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
}

/** Extended RequestInit that allows an optional audit header. */
export interface ApiFetchInit extends RequestInit {
  /** When set, forwarded as the `X-Change-Reason` request header. Empty/undefined is ignored. */
  changeReason?: string;
}

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
export async function apiFetch<T>(url: string, init?: ApiFetchInit): Promise<T> {
  const { changeReason, ...rest } = init ?? {};
  const callerHeaders = normalizeHeaders(rest.headers);
  const traceId = getHeader(callerHeaders, 'X-Trace-Id') ?? crypto.randomUUID();

  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...callerHeaders,
      ...(changeReason ? { 'X-Change-Reason': changeReason } : {}),
      'X-Trace-Id': traceId,
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
