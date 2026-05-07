import { describe, it, expect } from 'vitest';
import { messageForCode, formatErrorForToast } from './error-messages';
import { ApiError } from './envelope';

describe('messageForCode', () => {
  it.each([
    ['NOT_FOUND', '대상을 찾을 수 없습니다.'],
    ['VALIDATION_FAILED', '입력값이 올바르지 않습니다.'],
    ['CONFLICT_DUPLICATE', '이미 존재하는 항목입니다.'],
    ['AUTH_INVALID_CREDENTIALS', '아이디 또는 비밀번호가 올바르지 않습니다.'],
    ['AUTH_REFRESH_EXPIRED', '세션이 만료되었습니다. 다시 로그인하세요.'],
  ])('%s → %s', (code, expected) => {
    expect(messageForCode(code)).toBe(expected);
  });

  it('returns the default for unknown code', () => {
    expect(messageForCode('SOMETHING_WEIRD')).toBe('요청을 처리하지 못했습니다.');
  });
});

describe('formatErrorForToast', () => {
  it('returns mapped message and traceId for an ApiError', () => {
    const err = new ApiError('NOT_FOUND', 'srv-msg', 'abc-123');
    expect(formatErrorForToast(err)).toEqual({
      title: '대상을 찾을 수 없습니다.',
      description: 'traceId: abc-123',
    });
  });
  it('omits description when traceId is missing', () => {
    const err = new ApiError('VALIDATION_FAILED', 'x');
    expect(formatErrorForToast(err)).toEqual({
      title: '입력값이 올바르지 않습니다.',
      description: undefined,
    });
  });
  it('returns generic title for non-ApiError values', () => {
    expect(formatErrorForToast(new Error('boom'))).toEqual({ title: '요청을 처리하지 못했습니다.' });
    expect(formatErrorForToast(undefined)).toEqual({ title: '요청을 처리하지 못했습니다.' });
  });
});
