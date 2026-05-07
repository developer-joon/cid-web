import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from './mutator';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => 'trace-fixed' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
}

describe('apiFetch', () => {
  it('returns the inner data on a successful envelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { hello: 'world' }, error: null }));
    const result = await apiFetch<{ hello: string }>('/api/proxy/foo');
    expect(result).toEqual({ hello: 'world' });
  });

  it('attaches X-Trace-Id header (generated when caller does not supply one)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: null }));
    await apiFetch('/api/proxy/foo');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Trace-Id']).toBe('trace-fixed');
  });

  it('respects a caller-provided X-Trace-Id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: null }));
    await apiFetch('/api/proxy/foo', { headers: { 'X-Trace-Id': 'caller-id' } });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Trace-Id']).toBe('caller-id');
  });

  it('throws ApiError when HTTP status is not ok and envelope has error', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { data: null, error: { code: 'NOT_FOUND', message: 'gone', traceId: 't1' } },
        { status: 404, statusText: 'Not Found' },
      ),
    );
    await expect(apiFetch('/api/proxy/foo')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NOT_FOUND',
      message: 'gone',
      traceId: 't1',
    });
  });

  it('throws ApiError when HTTP is 200 but envelope.error is present', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: null, error: { code: 'VALIDATION_FAILED', message: 'bad' } }),
    );
    await expect(apiFetch('/api/proxy/foo')).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'bad',
    });
  });

  it('respects caller X-Trace-Id supplied as a Headers instance', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: null }));
    await apiFetch('/api/proxy/foo', { headers: new Headers({ 'X-Trace-Id': 'h-id' }) });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const sent = init.headers as Record<string, string>;
    expect(sent['X-Trace-Id']).toBe('h-id');
  });

  it('falls back to HTTP_<status> code when envelope is missing on error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Internal' }));
    await expect(apiFetch('/api/proxy/foo')).rejects.toMatchObject({
      code: 'HTTP_500',
      traceId: 'trace-fixed',
    });
  });

  it('returns null for 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await apiFetch<unknown>('/api/proxy/foo');
    expect(result).toBeNull();
  });
});
