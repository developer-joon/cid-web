import { ApiError } from './envelope';

export interface OrvalResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'same-origin',
  });

  let body: unknown = undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status !== 204 && contentType.includes('application/json')) {
    body = await response.json();
  }

  if (!response.ok) {
    const envelopeError =
      body && typeof body === 'object' && 'error' in body
        ? (body as { error?: { code?: string; message?: string; traceId?: string } }).error
        : undefined;
    if (envelopeError) {
      throw new ApiError(
        envelopeError.code ?? `HTTP_${response.status}`,
        envelopeError.message ?? response.statusText,
        envelopeError.traceId,
      );
    }
    throw new ApiError(`HTTP_${response.status}`, response.statusText || 'Request failed');
  }

  return {
    data: body as never,
    status: response.status,
    headers: response.headers,
  } as T;
}

export default apiFetch;
