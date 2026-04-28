import { describe, expect, it } from 'vitest';
import { ApiError, unwrapEnvelope } from './envelope';

describe('unwrapEnvelope', () => {
  it('returns data when error is null', () => {
    expect(unwrapEnvelope({ data: { name: 'Alice' }, error: null })).toEqual({ name: 'Alice' });
  });

  it('returns data when error is missing', () => {
    expect(unwrapEnvelope({ data: 42 })).toBe(42);
  });

  it('throws ApiError when error is present', () => {
    const envelope = { data: null, error: { code: 'AUTH_FAILED', message: 'wrong password', traceId: 'abc' } };
    expect(() => unwrapEnvelope(envelope)).toThrow(ApiError);
    try {
      unwrapEnvelope(envelope);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.code).toBe('AUTH_FAILED');
      expect(err.message).toBe('wrong password');
      expect(err.traceId).toBe('abc');
    }
  });
});

describe('ApiError', () => {
  it('preserves code, message, traceId', () => {
    const e = new ApiError('CODE', 'msg', 'trace');
    expect(e.name).toBe('ApiError');
    expect(e.code).toBe('CODE');
    expect(e.message).toBe('msg');
    expect(e.traceId).toBe('trace');
  });
});
