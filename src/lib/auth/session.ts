import type { SessionOptions } from 'iron-session';

export interface TokenPayload {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  tokenType: string;
}

export interface SessionData {
  tokens?: TokenPayload;
  persistent?: boolean;
}

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || 'cid_session';

export function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_SECRET 환경변수가 비어있거나 32자 미만입니다. .env.local 을 확인하세요.',
    );
  }
  return {
    password,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  };
}
