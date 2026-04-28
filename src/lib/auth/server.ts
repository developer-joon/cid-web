import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import {
  getSessionOptions,
  type SessionData,
  type TokenPayload,
} from './session';

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, getSessionOptions());
}

export async function readSession(): Promise<SessionData | null> {
  const session = await getSession();
  return session.tokens ? session : null;
}

export async function saveTokens(
  tokens: TokenPayload,
  persistent: boolean,
): Promise<void> {
  const session = await getSession();
  session.tokens = tokens;
  session.persistent = persistent;
  if (persistent) {
    session.updateConfig({
      ...getSessionOptions(),
      cookieOptions: {
        ...getSessionOptions().cookieOptions,
        maxAge: tokens.refreshTokenExpiresIn,
      },
    });
  }
  await session.save();
}

export async function rotateTokens(tokens: TokenPayload): Promise<void> {
  const session = await getSession();
  const persistent = session.persistent ?? false;
  session.tokens = tokens;
  if (persistent) {
    session.updateConfig({
      ...getSessionOptions(),
      cookieOptions: {
        ...getSessionOptions().cookieOptions,
        maxAge: tokens.refreshTokenExpiresIn,
      },
    });
  }
  await session.save();
}

export async function clearSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
