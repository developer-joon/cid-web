export interface ApiErrorPayload {
  code: string;
  message: string;
  traceId?: string;
}

export interface Envelope<T> {
  data?: T | null;
  error?: ApiErrorPayload | null;
}

export class ApiError extends Error {
  readonly code: string;
  readonly traceId?: string;

  constructor(code: string, message: string, traceId?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.traceId = traceId;
  }
}

export function unwrapEnvelope<T>(envelope: Envelope<T>): T {
  if (envelope?.error) {
    const { code, message, traceId } = envelope.error;
    throw new ApiError(code, message, traceId);
  }
  return envelope.data as T;
}
