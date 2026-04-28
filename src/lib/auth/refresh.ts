import 'server-only';
import { refreshWithBackend } from './backend';
import { rotateTokens } from './server';
import type { TokenPayload } from './session';

const inflight = new Map<string, Promise<TokenPayload>>();

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenPayload> {
  const existing = inflight.get(refreshToken);
  if (existing) return existing;

  const promise = (async () => {
    const tokens = await refreshWithBackend(refreshToken);
    await rotateTokens(tokens);
    return tokens;
  })().finally(() => {
    inflight.delete(refreshToken);
  });

  inflight.set(refreshToken, promise);
  return promise;
}
