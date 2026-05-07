import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from './envelope';

vi.mock('@/lib/auth/server', () => ({
  getSession: vi.fn(),
  clearSession: vi.fn(),
  rotateTokens: vi.fn(),
}));
vi.mock('@/lib/auth/refresh', () => ({
  refreshAccessToken: vi.fn(),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('BACKEND_API_URL', 'http://backend');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
  vi.clearAllMocks();
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
}

describe('serverFetch', () => {
  it('attaches Bearer token from session and returns unwrapped data', async () => {
    const { getSession } = await import('@/lib/auth/server');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      tokens: { accessToken: 'access-1', refreshToken: 'refresh-1' },
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 1 }, error: null }));

    const { serverFetch } = await import('./server-fetch');
    const result = await serverFetch<{ id: number }>('/api/v1/cis/1');

    expect(result).toEqual({ id: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe('http://backend/api/v1/cis/1');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer access-1');
  });

  it('refreshes once on 401, then retries with new token', async () => {
    const { getSession } = await import('@/lib/auth/server');
    const { refreshAccessToken } = await import('@/lib/auth/refresh');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      tokens: { accessToken: 'old', refreshToken: 'r1' },
    });
    (refreshAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken: 'new',
      refreshToken: 'r2',
      tokenType: 'Bearer',
      accessTokenExpiresIn: 1800,
      refreshTokenExpiresIn: 1209600,
    });
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 2 }, error: null }));

    const { serverFetch } = await import('./server-fetch');
    const result = await serverFetch<{ id: number }>('/api/v1/cis/2');

    expect(result).toEqual({ id: 2 });
    expect(refreshAccessToken).toHaveBeenCalledOnce();
    const second = fetchMock.mock.calls[1][1] as RequestInit;
    expect((second.headers as Record<string, string>)['Authorization']).toBe('Bearer new');
  });

  it('clears session and rethrows when refresh fails', async () => {
    const { getSession, clearSession } = await import('@/lib/auth/server');
    const { refreshAccessToken } = await import('@/lib/auth/refresh');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      tokens: { accessToken: 'old', refreshToken: 'r1' },
    });
    (refreshAccessToken as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError('AUTH_REFRESH_EXPIRED', 'expired'),
    );
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));

    const { serverFetch } = await import('./server-fetch');
    await expect(serverFetch('/api/v1/cis/3')).rejects.toMatchObject({
      code: 'AUTH_REFRESH_EXPIRED',
    });
    expect(clearSession).toHaveBeenCalled();
  });

  it('throws AUTH_NO_SESSION when there is no access token', async () => {
    const { getSession } = await import('@/lib/auth/server');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ tokens: undefined });

    const { serverFetch } = await import('./server-fetch');
    await expect(serverFetch('/api/v1/cis')).rejects.toMatchObject({
      code: 'AUTH_NO_SESSION',
    });
  });

  it('returns null for 204 No Content', async () => {
    const { getSession } = await import('@/lib/auth/server');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { serverFetch } = await import('./server-fetch');
    expect(await serverFetch('/api/v1/foo')).toBeNull();
  });

  it('throws ApiError when envelope.error present on success status', async () => {
    const { getSession } = await import('@/lib/auth/server');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: null, error: { code: 'VALIDATION_FAILED', message: 'bad', traceId: 't1' } }),
    );

    const { serverFetch } = await import('./server-fetch');
    await expect(serverFetch('/api/v1/foo')).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      traceId: 't1',
    });
  });

  it('attaches X-Change-Reason when changeReason option provided', async () => {
    const { getSession } = await import('@/lib/auth/server');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: null }));

    const { serverFetch } = await import('./server-fetch');
    await serverFetch('/api/v1/foo', { method: 'POST', changeReason: 'IDC migration' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Change-Reason']).toBe('IDC migration');
  });
});
