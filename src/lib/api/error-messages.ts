import { ApiError } from './envelope';

const MESSAGES: Record<string, string> = {
  NOT_FOUND: '대상을 찾을 수 없습니다.',
  VALIDATION_FAILED: '입력값이 올바르지 않습니다.',
  CONFLICT_DUPLICATE: '이미 존재하는 항목입니다.',
  AUTH_INVALID_CREDENTIALS: '아이디 또는 비밀번호가 올바르지 않습니다.',
  AUTH_REFRESH_EXPIRED: '세션이 만료되었습니다. 다시 로그인하세요.',
  AUTH_NO_SESSION: '세션이 없습니다. 다시 로그인하세요.',
  AUTH_REFRESH_FAILED: '세션이 만료되었습니다. 다시 로그인하세요.',
  FORBIDDEN: '권한이 없습니다.',
  SCHEMA_MISMATCH: '서버 응답이 예상과 다릅니다. 잠시 후 다시 시도해주세요.',
};

const DEFAULT_MESSAGE = '요청을 처리하지 못했습니다.';

export function messageForCode(code: string): string {
  return MESSAGES[code] ?? DEFAULT_MESSAGE;
}

export function formatErrorForToast(err: unknown): { title: string; description?: string } {
  if (err instanceof ApiError) {
    return {
      title: messageForCode(err.code),
      description: err.traceId ? `traceId: ${err.traceId}` : undefined,
    };
  }
  return { title: DEFAULT_MESSAGE };
}
