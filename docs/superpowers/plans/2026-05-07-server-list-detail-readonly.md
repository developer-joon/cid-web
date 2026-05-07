# /servers Read-only (CI 목록·상세) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first domain cycle of cid-web — `/servers` (CI list, `ciTpCd=SERVER`) and `/servers/[ciId]` (CI detail) as read-only, while establishing 6 cross-cutting foundations (envelope auto-unwrap, Zod runtime validation, URL state, master resolver, RBAC guard, ciTpCd dispatcher) that later domain cycles will reuse.

**Architecture:** Server Components fetch data via a server-only `serverFetch` helper that talks to the backend directly with single-flight refresh. Client interactions (filters, pagination) drive URL state; server re-renders pick it up from `searchParams`. Generated Orval client output exists but is bypassed by domain hooks that pair `apiFetch` (mutator) with focused Zod schemas — necessary because cid-api's OpenAPI declares no 2xx response bodies.

**Tech Stack:** Next.js 15 App Router (Server Components first) · React 19 · TypeScript 5 (strict) · Tailwind CSS 3.4 · shadcn/ui (Radix) · TanStack Query 5 · Zod 3 · iron-session 8 · Orval 7 · Vitest 2 + RTL · Playwright 1.

**Spec:** `docs/superpowers/specs/2026-05-07-server-list-detail-readonly-design.md` (commit `58f9a21`).

---

## File Structure

```
src/
├── app/
│   └── (app)/
│       └── servers/
│           ├── page.tsx                       # Server Component — list
│           ├── loading.tsx
│           ├── error.tsx
│           └── [ciId]/
│               ├── page.tsx                   # Server Component — detail
│               └── not-found.tsx
├── components/
│   ├── ui/
│   │   ├── table.tsx                          # NEW shadcn primitive
│   │   ├── select.tsx                         # NEW shadcn primitive
│   │   ├── badge.tsx                          # NEW shadcn primitive
│   │   ├── tabs.tsx                           # NEW shadcn primitive
│   │   ├── skeleton.tsx                       # NEW shadcn primitive
│   │   └── tooltip.tsx                        # NEW shadcn primitive
│   ├── layout/
│   │   └── sidebar.tsx                        # MODIFY: enable 서버 menu
│   └── features/
│       ├── ci/
│       │   └── data-cards/
│       │       ├── dispatcher.tsx
│       │       └── unsupported-type-card.tsx
│       └── server/
│           ├── hooks.ts                       # client React Query hooks
│           ├── list/
│           │   ├── server-list-columns.ts
│           │   ├── server-list-table.tsx
│           │   ├── server-list-filters.tsx    # 'use client'
│           │   └── server-list-pagination.tsx # 'use client'
│           └── detail/
│               ├── server-detail-header.tsx
│               ├── ci-common-info-card.tsx
│               ├── server-data-card.tsx
│               ├── server-detail-tabs.tsx     # 'use client'
│               └── tabs/
│                   ├── ips-tab.tsx
│                   └── employees-tab.tsx
├── lib/
│   ├── api/
│   │   ├── mutator.ts                         # MODIFY: envelope unwrap + X-Trace-Id
│   │   ├── server-fetch.ts                    # NEW: server-only fetch w/ session+refresh
│   │   ├── error-messages.ts                  # NEW: code → 한국어
│   │   ├── paging.ts                          # NEW: searchParams ↔ Pageable
│   │   └── schemas/
│   │       ├── pagination.ts                  # NEW: page envelope
│   │       ├── ci.ts                          # NEW: CiListItem, CiDetail
│   │       ├── ip.ts
│   │       ├── employee.ts
│   │       └── master.ts
│   ├── auth/
│   │   ├── roles.ts                           # NEW: Role type, hasRole
│   │   └── rbac.tsx                           # NEW: <RoleGuard>, useMyRoles
│   └── master/
│       ├── server.ts                          # NEW: getMasterMap (server-only)
│       └── format.ts                          # NEW: formatLocation, formatRack
├── hooks/
│   └── use-url-filters.ts                     # NEW: client URL ↔ filters hook
└── ...

docs/
├── architecture.md                            # MODIFY: §7 변경 이력 + ciTpCd dispatcher 정책

tests/
├── unit/
│   ├── lib/api/mutator.test.ts
│   ├── lib/api/paging.test.ts
│   ├── lib/api/schemas/ci.test.ts
│   ├── lib/auth/rbac.test.tsx
│   ├── lib/master/format.test.ts
│   └── hooks/use-url-filters.test.tsx
└── e2e/
    ├── server-list.spec.ts
    └── server-detail.spec.ts
```

---

## Conventions used by every task

- **TDD where logic exists** — write failing test, run, see fail, then implement.
- **One commit per task** — Conventional Commits (`feat:`, `chore:`, `refactor:`, `test:`, `docs:`).
- **Before commit** — `pnpm typecheck && pnpm lint` must pass.
- **Mutator contract** — `apiFetch<T>(url, init)` returns the **inner unwrapped data** (not the envelope). Throws `ApiError` on `!ok` or `envelope.error`. We accept that Orval's auto-typed return for 2xx is wrong (spec has no 2xx schemas) — domain hooks supply real types via Zod.
- **Zod parse boundary** — every backend payload that crosses into our app must pass through a Zod parse (server fetch helper or domain hook). On parse failure: `console.error` in dev with traceId, throw `ApiError('SCHEMA_MISMATCH', ...)` so the page boundary handles it.
- **Server vs client components** — list and detail page entry points are Server Components. Anything that uses `useState`/`useRouter`/`onClick` is a `'use client'` leaf with a kebab-case filename.
- **Path alias** — `@/...` resolves to `src/...` (already configured in `tsconfig.json`).
- **Test fixtures** — `SESSION_SECRET = 'a'.repeat(64)` in test setup; mock the backend with `vi.fn(global.fetch)` per test, never hit `:8080`.
- **No console.log in commits** — debug prints are stripped before commit.
- **No `any` / `as any` / `@ts-ignore`** — strict TypeScript.

---

## Phase A — Cross-cutting Foundations

### Task 1: Strengthen API mutator (envelope unwrap + X-Trace-Id)

**Files:**
- Modify: `src/lib/api/mutator.ts`
- Modify: `src/lib/api/envelope.ts` (add helper export if missing)
- Test: `src/lib/api/mutator.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/api/mutator.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from './mutator';
import { ApiError } from './envelope';

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
    await expect(apiFetch('/api/proxy/foo')).rejects.toBeInstanceOf(ApiError);
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run:
```bash
pnpm test -- src/lib/api/mutator.test.ts
```
Expected: most tests FAIL (current mutator returns `{ data, status, headers }` instead of inner T, and does not inject X-Trace-Id).

- [ ] **Step 3: Rewrite mutator.ts**

Replace `src/lib/api/mutator.ts` with:
```ts
import { ApiError, type Envelope } from './envelope';

/**
 * Fetch wrapper used by Orval-generated clients and domain hooks.
 *
 * Contract:
 * - On 2xx with `{ data, error: null }` envelope → returns `data` typed as T.
 * - On any non-2xx, or 2xx with `error` present → throws ApiError.
 * - On 204 No Content → returns null cast to T.
 * - Generates an `X-Trace-Id` if caller did not supply one. The id is included
 *   in thrown ApiError.traceId for log correlation.
 *
 * Note: cid-api's OpenAPI does not declare 2xx response schemas, so Orval's
 * generated `Promise<T>` for success is `void`. Domain hooks must Zod-parse
 * the result themselves.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const callerHeaders = init?.headers as Record<string, string> | undefined;
  const traceId = callerHeaders?.['X-Trace-Id'] ?? crypto.randomUUID();

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'X-Trace-Id': traceId,
      ...(callerHeaders ?? {}),
    },
    credentials: 'same-origin',
  });

  if (response.status === 204) {
    return null as T;
  }

  let body: unknown = undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => undefined);
  }

  const envelope = body as Envelope<T> | undefined;
  if (!response.ok || envelope?.error) {
    const err = envelope?.error;
    throw new ApiError(
      err?.code ?? `HTTP_${response.status}`,
      err?.message ?? response.statusText ?? 'Request failed',
      err?.traceId ?? traceId,
    );
  }

  return (envelope?.data ?? null) as T;
}

export default apiFetch;
```

- [ ] **Step 4: Run tests, confirm green**

```bash
pnpm test -- src/lib/api/mutator.test.ts
```
Expected: all tests PASS.

- [ ] **Step 5: Run typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/mutator.ts src/lib/api/mutator.test.ts
git commit -m "refactor(api): mutator unwraps envelope + injects X-Trace-Id"
```

---

### Task 2: Server-side fetch helper (server-fetch.ts)

**Files:**
- Create: `src/lib/api/server-fetch.ts`
- Create: `src/lib/api/server-fetch.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/api/server-fetch.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from './envelope';

vi.mock('@/lib/auth/server', () => ({
  getSession: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
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

  it('throws ApiError when refresh itself fails', async () => {
    const { getSession } = await import('@/lib/auth/server');
    const { refreshAccessToken } = await import('@/lib/auth/refresh');
    const { clearSession } = await import('@/lib/auth/server');
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
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
pnpm test -- src/lib/api/server-fetch.test.ts
```
Expected: imports fail (file does not exist).

- [ ] **Step 3: Implement server-fetch.ts**

Create `src/lib/api/server-fetch.ts`:
```ts
import 'server-only';
import { ApiError, type Envelope } from './envelope';
import { getSession, setSession, clearSession } from '@/lib/auth/server';
import { refreshAccessToken } from '@/lib/auth/refresh';

const BACKEND_URL = () => process.env.BACKEND_API_URL ?? 'http://localhost:8080';

interface ServerFetchInit extends RequestInit {
  /** Override path under backend root. Path must start with `/api/...`. */
}

/**
 * Server-side fetch to cid-api. Reads Bearer from iron-session, attempts a
 * single refresh + retry on 401, and unwraps the `{ data, error }` envelope.
 *
 * Use from Server Components, Route Handlers, and other server contexts.
 * Browser client code uses `apiFetch` (Orval mutator) to go through `/api/proxy`.
 */
export async function serverFetch<T>(path: string, init?: ServerFetchInit): Promise<T> {
  const session = await getSession();
  const tokens = session.tokens;
  if (!tokens?.accessToken) {
    throw new ApiError('AUTH_NO_SESSION', '세션이 없습니다.');
  }

  const traceId = (init?.headers as Record<string, string> | undefined)?.['X-Trace-Id'] ??
    crypto.randomUUID();

  const callOnce = (token: string) =>
    fetch(`${BACKEND_URL()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Trace-Id': traceId,
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });

  let response = await callOnce(tokens.accessToken);

  if (response.status === 401 && tokens.refreshToken) {
    try {
      const fresh = await refreshAccessToken(tokens.refreshToken);
      await setSession({ tokens: fresh });
      response = await callOnce(fresh.accessToken);
    } catch (e) {
      await clearSession();
      throw e instanceof ApiError ? e : new ApiError('AUTH_REFRESH_FAILED', 'refresh failed');
    }
  }

  if (response.status === 204) return null as T;

  let body: unknown;
  const ct = response.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) body = await response.json().catch(() => undefined);

  const envelope = body as Envelope<T> | undefined;
  if (!response.ok || envelope?.error) {
    const err = envelope?.error;
    throw new ApiError(
      err?.code ?? `HTTP_${response.status}`,
      err?.message ?? response.statusText ?? 'Request failed',
      err?.traceId ?? traceId,
    );
  }
  return (envelope?.data ?? null) as T;
}
```

- [ ] **Step 4: Confirm `setSession` exists in `lib/auth/server.ts`**

If `setSession` is not exported from `src/lib/auth/server.ts`, add it. Read the file first.

If missing, add (edit the file):
```ts
export async function setSession(value: SessionData) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  Object.assign(session, value);
  await session.save();
}
```

- [ ] **Step 5: Run tests, confirm green**

```bash
pnpm test -- src/lib/api/server-fetch.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/server-fetch.ts src/lib/api/server-fetch.test.ts src/lib/auth/server.ts
git commit -m "feat(api): server-side fetch helper with single-flight refresh"
```

---

### Task 3: Error code → 한국어 매핑

**Files:**
- Create: `src/lib/api/error-messages.ts`
- Create: `src/lib/api/error-messages.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/api/error-messages.test.ts`:
```ts
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
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
pnpm test -- src/lib/api/error-messages.test.ts
```

- [ ] **Step 3: Implement**

Create `src/lib/api/error-messages.ts`:
```ts
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

const DEFAULT = '요청을 처리하지 못했습니다.';

export function messageForCode(code: string): string {
  return MESSAGES[code] ?? DEFAULT;
}

export function formatErrorForToast(err: unknown): { title: string; description?: string } {
  if (err instanceof ApiError) {
    return {
      title: messageForCode(err.code),
      description: err.traceId ? `traceId: ${err.traceId}` : undefined,
    };
  }
  return { title: DEFAULT };
}
```

- [ ] **Step 4: Run tests, green**

```bash
pnpm test -- src/lib/api/error-messages.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/error-messages.ts src/lib/api/error-messages.test.ts
git commit -m "feat(api): error code to korean message mapping"
```

---

### Task 4: Zod response schemas

**Files:**
- Create: `src/lib/api/schemas/pagination.ts`
- Create: `src/lib/api/schemas/ci.ts`
- Create: `src/lib/api/schemas/ip.ts`
- Create: `src/lib/api/schemas/employee.ts`
- Create: `src/lib/api/schemas/master.ts`
- Create: `src/lib/api/schemas/index.ts`
- Create: `src/lib/api/schemas/ci.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/api/schemas/ci.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CiListPageSchema, CiDetailSchema } from './ci';

describe('CiListPageSchema', () => {
  it('parses a Spring page envelope with content array', () => {
    const input = {
      content: [
        { ciId: 1, ciNm: 'wms-web-01', ciTpCd: 'SERVER', ciStatVal: 'ACTIVE',
          envrnGpCd: 'PROD', ciBizwrkNm: 'WMS', grdCd: 'A' },
      ],
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
    };
    const parsed = CiListPageSchema.parse(input);
    expect(parsed.content[0]?.ciNm).toBe('wms-web-01');
    expect(parsed.page.totalElements).toBe(1);
  });

  it('accepts missing optional fields with sensible defaults', () => {
    const parsed = CiListPageSchema.parse({
      content: [{ ciId: 2, ciNm: 'x', ciTpCd: 'SERVER' }],
      page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
    });
    expect(parsed.content[0]?.envrnGpCd).toBeUndefined();
  });
});

describe('CiDetailSchema', () => {
  it('parses a SERVER detail with serverData', () => {
    const parsed = CiDetailSchema.parse({
      ciId: 1,
      ciNm: 'wms-web-01',
      ciTpCd: 'SERVER',
      ciStatVal: 'ACTIVE',
      envrnGpCd: 'PROD',
      grdCd: 'A',
      ciBizwrkNm: 'WMS',
      ciRoleNm: 'Frontend',
      locId: 5,
      ciDescp: '',
      serverData: {
        hostNm: 'wms-web-01',
        osTpNm: 'Rocky',
        osVer: '9.7',
        cpucoreCnt: 32,
        memoryCapa: 128,
        diskCapa: 2000,
        rackId: 11,
        vendorId: 7,
        introDt: '2024-03-15',
        maintEndDt: '2025-03-31',
        osBackupYn: 'Y',
        assetId: 'SV-00123',
        aciLvlGrd: '2',
      },
    });
    expect(parsed.serverData?.hostNm).toBe('wms-web-01');
  });

  it('parses other ciTpCd without serverData', () => {
    const parsed = CiDetailSchema.parse({
      ciId: 2, ciNm: 'app-x', ciTpCd: 'APP', ciStatVal: 'ACTIVE',
    });
    expect(parsed.serverData).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
pnpm test -- src/lib/api/schemas/ci.test.ts
```

- [ ] **Step 3: Implement schemas**

Create `src/lib/api/schemas/pagination.ts`:
```ts
import { z } from 'zod';

export const PageMetaSchema = z.object({
  number: z.number().int().nonnegative(),       // 0-base
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type PageMeta = z.infer<typeof PageMetaSchema>;

/** Spring `Page<T>` envelope (post `data` unwrap). Backend may also expose
 *  `_embedded.<resource>List` HATEOAS form — we accept either by mapping in
 *  the domain hook before parsing. */
export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item),
    page: PageMetaSchema,
  });
}
```

Create `src/lib/api/schemas/ci.ts`:
```ts
import { z } from 'zod';
import { pageSchema } from './pagination';

const Yn = z.enum(['Y', 'N']).optional();

export const CiServerDataSchema = z.object({
  hostNm: z.string().optional(),
  assetId: z.string().optional(),
  ossId: z.string().optional(),
  sysVidId: z.string().optional(),
  deviceNm: z.string().optional(),
  vendorId: z.number().int().optional(),
  modelNm: z.string().optional(),
  serialNo: z.string().optional(),
  osTpNm: z.string().optional(),
  osVer: z.string().optional(),
  cpucoreCnt: z.number().int().optional(),
  memoryCapa: z.number().optional(),
  diskCapa: z.number().optional(),
  virtMchnYn: Yn,
  virtMchnPltfomNm: z.string().optional(),
  rackId: z.number().int().optional(),
  introDt: z.string().optional(),
  maintEndDt: z.string().optional(),
  monitYn: Yn,
  osBackupYn: Yn,
  alarmCallYn: Yn,
  mngYn: Yn,
  aciLvlGrd: z.string().optional(),
  inetFacingYn: Yn,
});
export type CiServerData = z.infer<typeof CiServerDataSchema>;

export const CiListItemSchema = z.object({
  ciId: z.number().int(),
  ciNm: z.string(),
  ciTpCd: z.string(),
  ciStatVal: z.string().optional(),
  envrnGpCd: z.string().optional(),
  ciBizwrkNm: z.string().optional(),
  grdCd: z.string().optional(),
  locId: z.number().int().optional(),
  // Best-effort denormalized name fields (backend may add later — see spec §10.3).
  locName: z.string().optional(),
  rackName: z.string().optional(),
});
export type CiListItem = z.infer<typeof CiListItemSchema>;

export const CiListPageSchema = pageSchema(CiListItemSchema);
export type CiListPage = z.infer<typeof CiListPageSchema>;

export const CiDetailSchema = CiListItemSchema.extend({
  ciRoleNm: z.string().optional(),
  ciDescp: z.string().optional(),
  serverData: CiServerDataSchema.optional(),
  // Other type-specific data deliberately left untyped here (added per cycle).
  appData: z.unknown().optional(),
  cloudData: z.unknown().optional(),
  middlewareData: z.unknown().optional(),
  databaseData: z.unknown().optional(),
  networkData: z.unknown().optional(),
  securityData: z.unknown().optional(),
  storageData: z.unknown().optional(),
  pcData: z.unknown().optional(),
  vdiData: z.unknown().optional(),
});
export type CiDetail = z.infer<typeof CiDetailSchema>;
```

Create `src/lib/api/schemas/ip.ts`:
```ts
import { z } from 'zod';

export const CiIpItemSchema = z.object({
  ipId: z.number().int(),
  ipAddr: z.string(),
  ipTpCd: z.string(),                          // REAL/VIP/ADMIN/NAS/PUBLIC/PRIVATE
  hostNm: z.string().optional(),
  macAddr: z.string().optional(),
  dnsNm: z.string().optional(),
  subnetId: z.number().int().optional(),
  subnetCidrAddr: z.string().optional(),       // best-effort denormalized
});
export type CiIpItem = z.infer<typeof CiIpItemSchema>;

export const CiIpListSchema = z.array(CiIpItemSchema);
```

Create `src/lib/api/schemas/employee.ts`:
```ts
import { z } from 'zod';

export const CiEmployeeItemSchema = z.object({
  empId: z.number().int(),
  empNm: z.string(),
  emailAddr: z.string().optional(),
  telNo: z.string().optional(),
  worldId: z.string().optional(),
  deptId: z.number().int().optional(),
  deptNm: z.string().optional(),
  roleCd: z.string().optional(),               // PRIMARY/SECONDARY 등 (백엔드 제공 시)
});
export type CiEmployeeItem = z.infer<typeof CiEmployeeItemSchema>;

export const CiEmployeeListSchema = z.array(CiEmployeeItemSchema);
```

Create `src/lib/api/schemas/master.ts`:
```ts
import { z } from 'zod';
import { pageSchema } from './pagination';

export const MasterLocationSchema = z.object({
  locId: z.number().int(),
  locSiteNm: z.string(),
  locFloorNm: z.string().optional(),
  locTpCd: z.string().optional(),
});
export type MasterLocation = z.infer<typeof MasterLocationSchema>;

export const MasterRackSchema = z.object({
  rackId: z.number().int(),
  rackLocCd: z.string(),
  locId: z.number().int(),
});
export type MasterRack = z.infer<typeof MasterRackSchema>;

export const MasterVendorSchema = z.object({
  vendorId: z.number().int(),
  vendorNm: z.string(),
  vendorTpCd: z.string().optional(),
});
export type MasterVendor = z.infer<typeof MasterVendorSchema>;

export const LocationsPageSchema = pageSchema(MasterLocationSchema);
export const RacksPageSchema = pageSchema(MasterRackSchema);
export const VendorsPageSchema = pageSchema(MasterVendorSchema);
```

Create `src/lib/api/schemas/index.ts`:
```ts
export * from './pagination';
export * from './ci';
export * from './ip';
export * from './employee';
export * from './master';
```

- [ ] **Step 4: Run tests, green**

```bash
pnpm test -- src/lib/api/schemas/ci.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/schemas
git commit -m "feat(api): zod runtime schemas for ci/ip/employee/master"
```

---

### Task 5: Pagination + sort helpers (paging.ts)

**Files:**
- Create: `src/lib/api/paging.ts`
- Create: `src/lib/api/paging.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/api/paging.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parsePaging, toBackendPageable } from './paging';

describe('parsePaging', () => {
  it('parses page and size with 1-base UI', () => {
    const sp = new URLSearchParams({ page: '2', size: '50', sort: 'ciId,desc' });
    expect(parsePaging(sp)).toEqual({ page: 2, size: 50, sort: 'ciId,desc' });
  });
  it('uses defaults when missing', () => {
    expect(parsePaging(new URLSearchParams())).toEqual({ page: 1, size: 20, sort: 'ciId,desc' });
  });
  it('clamps invalid values', () => {
    expect(parsePaging(new URLSearchParams({ page: '0', size: '-1' }))).toMatchObject({ page: 1, size: 20 });
    expect(parsePaging(new URLSearchParams({ page: 'abc', size: 'xyz' }))).toMatchObject({ page: 1, size: 20 });
    expect(parsePaging(new URLSearchParams({ size: '500' }))).toMatchObject({ size: 100 });
  });
});

describe('toBackendPageable', () => {
  it('converts 1-base UI page to 0-base backend page', () => {
    expect(toBackendPageable({ page: 1, size: 20, sort: 'ciId,desc' })).toEqual({
      page: 0,
      size: 20,
      sort: 'ciId,desc',
    });
    expect(toBackendPageable({ page: 5, size: 50, sort: 'ciNm,asc' }).page).toBe(4);
  });
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
pnpm test -- src/lib/api/paging.test.ts
```

- [ ] **Step 3: Implement**

Create `src/lib/api/paging.ts`:
```ts
export interface PagingState {
  page: number;     // 1-base for the URL/UI
  size: number;
  sort: string;     // e.g. "ciId,desc"
}

const DEFAULT: PagingState = { page: 1, size: 20, sort: 'ciId,desc' };
const MAX_SIZE = 100;

export function parsePaging(sp: URLSearchParams): PagingState {
  const rawPage = Number(sp.get('page'));
  const rawSize = Number(sp.get('size'));
  const sort = sp.get('sort') || DEFAULT.sort;

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : DEFAULT.page;
  const size =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(Math.floor(rawSize), MAX_SIZE)
      : DEFAULT.size;

  return { page, size, sort };
}

export function toBackendPageable(state: PagingState): PagingState {
  return { ...state, page: state.page - 1 };
}

export const PAGING_DEFAULTS: Readonly<PagingState> = DEFAULT;
```

- [ ] **Step 4: Run tests, green**

```bash
pnpm test -- src/lib/api/paging.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/paging.ts src/lib/api/paging.test.ts
git commit -m "feat(api): pagination state helper (1-base UI <-> 0-base backend)"
```

---

### Task 6: URL filter state hook (use-url-filters.ts)

**Files:**
- Create: `src/hooks/use-url-filters.ts`
- Create: `src/hooks/use-url-filters.test.tsx`

- [ ] **Step 1: Write failing tests (RTL)**

Create `src/hooks/use-url-filters.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUrlFilters } from './use-url-filters';

const replaceMock = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/servers',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe('useUrlFilters', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    currentSearch = '';
  });

  it('reads filters with defaults', () => {
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm', 'envrnGpCd', 'ciStatVal'] }),
    );
    expect(result.current.values).toEqual({ ciNm: '', envrnGpCd: '', ciStatVal: '' });
  });

  it('reads existing values from URL', () => {
    currentSearch = 'ciNm=wms&envrnGpCd=PROD';
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm', 'envrnGpCd', 'ciStatVal'] }),
    );
    expect(result.current.values).toEqual({ ciNm: 'wms', envrnGpCd: 'PROD', ciStatVal: '' });
  });

  it('replaces URL with merged params and resets page on change', () => {
    currentSearch = 'page=3&ciNm=wms';
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm', 'envrnGpCd', 'ciStatVal'] }),
    );
    act(() => result.current.set({ envrnGpCd: 'PROD' }));
    expect(replaceMock).toHaveBeenCalledOnce();
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url.startsWith('/servers?')).toBe(true);
    expect(url).toContain('ciNm=wms');
    expect(url).toContain('envrnGpCd=PROD');
    expect(url).not.toContain('page=3');                // reset
  });

  it('removes empty-string filters from URL', () => {
    currentSearch = 'ciNm=wms&envrnGpCd=PROD';
    const { result } = renderHook(() =>
      useUrlFilters({ keys: ['ciNm', 'envrnGpCd', 'ciStatVal'] }),
    );
    act(() => result.current.set({ envrnGpCd: '' }));
    const url = replaceMock.mock.calls[0][0] as string;
    expect(url).not.toContain('envrnGpCd');
  });
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
pnpm test -- src/hooks/use-url-filters.test.tsx
```

- [ ] **Step 3: Implement**

Create `src/hooks/use-url-filters.ts`:
```ts
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export interface UrlFiltersOptions<K extends string> {
  keys: readonly K[];
  /** Whether changing a filter resets `page` to 1 (default true). */
  resetPage?: boolean;
}

export interface UrlFiltersResult<K extends string> {
  values: Record<K, string>;
  set: (next: Partial<Record<K, string>>) => void;
}

/**
 * Read/write a small set of string filters from the URL searchParams.
 * Empty strings are stripped (the URL stays clean).
 * On any change, also drops the `page` parameter so the user goes back to page 1.
 */
export function useUrlFilters<K extends string>({
  keys,
  resetPage = true,
}: UrlFiltersOptions<K>): UrlFiltersResult<K> {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams() ?? new URLSearchParams();

  const values = Object.fromEntries(keys.map((k) => [k, sp.get(k) ?? ''])) as Record<K, string>;

  const set = useCallback(
    (next: Partial<Record<K, string>>) => {
      const merged = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(next) as [K, string | undefined][]) {
        if (!v) merged.delete(k);
        else merged.set(k, v);
      }
      if (resetPage) merged.delete('page');
      const qs = merged.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, sp, resetPage],
  );

  return { values, set };
}
```

- [ ] **Step 4: Run tests, green**

```bash
pnpm test -- src/hooks/use-url-filters.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-url-filters.ts src/hooks/use-url-filters.test.tsx
git commit -m "feat(hooks): use-url-filters for URL <-> filter state"
```

---

### Task 7: RBAC primitives (Role, useMyRoles, RoleGuard)

**Files:**
- Create: `src/lib/auth/roles.ts`
- Create: `src/lib/auth/rbac.tsx`
- Create: `src/lib/auth/rbac.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/lib/auth/rbac.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { hasRole, ROLE_HIERARCHY } from './roles';
import { RoleGuard } from './rbac';

describe('hasRole hierarchy', () => {
  it('ADMIN satisfies any role', () => {
    expect(hasRole(['ADMIN'], 'USER')).toBe(true);
    expect(hasRole(['ADMIN'], 'OPERATOR')).toBe(true);
    expect(hasRole(['ADMIN'], 'ADMIN')).toBe(true);
  });
  it('OPERATOR satisfies USER but not ADMIN', () => {
    expect(hasRole(['OPERATOR'], 'USER')).toBe(true);
    expect(hasRole(['OPERATOR'], 'OPERATOR')).toBe(true);
    expect(hasRole(['OPERATOR'], 'ADMIN')).toBe(false);
  });
  it('USER does not satisfy higher roles', () => {
    expect(hasRole(['USER'], 'OPERATOR')).toBe(false);
    expect(hasRole(['USER'], 'ADMIN')).toBe(false);
  });
  it('handles unknown roles gracefully', () => {
    expect(hasRole(['WHAT'], 'USER')).toBe(false);
    expect(ROLE_HIERARCHY).toBeDefined();
  });
});

describe('<RoleGuard>', () => {
  it('renders children when role is satisfied', () => {
    const { getByText } = render(
      <RoleGuard role="OPERATOR" myRoles={['ADMIN']}>
        <span>visible</span>
      </RoleGuard>,
    );
    expect(getByText('visible')).toBeInTheDocument();
  });
  it('renders fallback when role is not satisfied', () => {
    const { queryByText, getByText } = render(
      <RoleGuard role="ADMIN" myRoles={['USER']} fallback={<span>denied</span>}>
        <span>secret</span>
      </RoleGuard>,
    );
    expect(queryByText('secret')).not.toBeInTheDocument();
    expect(getByText('denied')).toBeInTheDocument();
  });
  it('renders nothing by default when no fallback', () => {
    const { container } = render(
      <RoleGuard role="ADMIN" myRoles={['USER']}>
        <span>x</span>
      </RoleGuard>,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
pnpm test -- src/lib/auth/rbac.test.tsx
```

- [ ] **Step 3: Implement roles.ts**

Create `src/lib/auth/roles.ts`:
```ts
export type Role = 'USER' | 'OPERATOR' | 'ADMIN';

export const ROLE_HIERARCHY: Record<Role, number> = {
  USER: 1,
  OPERATOR: 2,
  ADMIN: 3,
};

function rank(roleName: string): number {
  return (ROLE_HIERARCHY as Record<string, number | undefined>)[roleName] ?? 0;
}

/** True if the user holds at least one role at-or-above `required`. */
export function hasRole(myRoles: readonly string[], required: Role): boolean {
  const need = ROLE_HIERARCHY[required];
  return myRoles.some((r) => rank(r) >= need);
}
```

- [ ] **Step 4: Implement rbac.tsx**

Create `src/lib/auth/rbac.tsx`:
```tsx
import type { ReactNode } from 'react';
import { hasRole, type Role } from './roles';

export interface RoleGuardProps {
  role: Role;
  myRoles: readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Server-friendly role guard. Renders `children` when at least one of `myRoles`
 * meets `role`; otherwise renders `fallback` (default: nothing).
 *
 * `myRoles` is passed in explicitly (rather than read from a context) so this
 * component is safe in Server Components — no client-only hooks.
 */
export function RoleGuard({ role, myRoles, children, fallback = null }: RoleGuardProps) {
  return hasRole(myRoles, role) ? <>{children}</> : <>{fallback}</>;
}
```

- [ ] **Step 5: Run tests, green**

```bash
pnpm test -- src/lib/auth/rbac.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/roles.ts src/lib/auth/rbac.tsx src/lib/auth/rbac.test.tsx
git commit -m "feat(auth): RBAC primitives — hasRole, RoleGuard"
```

---

### Task 8: Master prefetch + format helpers

**Files:**
- Create: `src/lib/master/server.ts`
- Create: `src/lib/master/format.ts`
- Create: `src/lib/master/format.test.ts`

- [ ] **Step 1: Write failing tests for format**

Create `src/lib/master/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatLocation, formatRack, formatVendor } from './format';

describe('formatLocation', () => {
  it('joins site name and floor when both present', () => {
    expect(formatLocation({ locId: 1, locSiteNm: '송도 IDC', locFloorNm: '2층' })).toBe(
      '송도 IDC · 2층',
    );
  });
  it('falls back to site name only', () => {
    expect(formatLocation({ locId: 1, locSiteNm: '분당 IDC' })).toBe('분당 IDC');
  });
  it('returns dash for undefined', () => {
    expect(formatLocation(undefined)).toBe('—');
  });
});

describe('formatRack', () => {
  it('returns the rack code', () => {
    expect(formatRack({ rackId: 1, rackLocCd: 'A-01', locId: 1 })).toBe('A-01');
  });
  it('returns dash for undefined', () => {
    expect(formatRack(undefined)).toBe('—');
  });
});

describe('formatVendor', () => {
  it('returns the vendor name', () => {
    expect(formatVendor({ vendorId: 1, vendorNm: 'Dell' })).toBe('Dell');
  });
  it('returns dash for undefined', () => {
    expect(formatVendor(undefined)).toBe('—');
  });
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
pnpm test -- src/lib/master/format.test.ts
```

- [ ] **Step 3: Implement format.ts**

Create `src/lib/master/format.ts`:
```ts
import type { MasterLocation, MasterRack, MasterVendor } from '@/lib/api/schemas';

export const DASH = '—';

export function formatLocation(loc: MasterLocation | undefined): string {
  if (!loc) return DASH;
  return loc.locFloorNm ? `${loc.locSiteNm} · ${loc.locFloorNm}` : loc.locSiteNm;
}

export function formatRack(rack: MasterRack | undefined): string {
  return rack ? rack.rackLocCd : DASH;
}

export function formatVendor(v: MasterVendor | undefined): string {
  return v ? v.vendorNm : DASH;
}
```

- [ ] **Step 4: Implement server.ts**

Create `src/lib/master/server.ts`:
```ts
import 'server-only';
import { cache } from 'react';
import { serverFetch } from '@/lib/api/server-fetch';
import {
  LocationsPageSchema,
  RacksPageSchema,
  VendorsPageSchema,
  type MasterLocation,
  type MasterRack,
  type MasterVendor,
} from '@/lib/api/schemas';

const LARGE_PAGE = '?page=0&size=200';

/** Loads all locations into a Map keyed by locId. Per-request cached. */
export const getLocationsMap = cache(async (): Promise<Map<number, MasterLocation>> => {
  const data = await serverFetch<unknown>(`/api/v1/master/locations${LARGE_PAGE}`);
  const parsed = LocationsPageSchema.parse(data);
  return new Map(parsed.content.map((l) => [l.locId, l]));
});

export const getRacksMap = cache(async (): Promise<Map<number, MasterRack>> => {
  const data = await serverFetch<unknown>(`/api/v1/master/racks${LARGE_PAGE}`);
  const parsed = RacksPageSchema.parse(data);
  return new Map(parsed.content.map((r) => [r.rackId, r]));
});

export const getVendorsMap = cache(async (): Promise<Map<number, MasterVendor>> => {
  const data = await serverFetch<unknown>(`/api/v1/master/vendors${LARGE_PAGE}`);
  const parsed = VendorsPageSchema.parse(data);
  return new Map(parsed.content.map((v) => [v.vendorId, v]));
});
```

- [ ] **Step 5: Run tests, green**

```bash
pnpm test -- src/lib/master/format.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/master
git commit -m "feat(master): server-side master prefetch + format helpers"
```

---

### Task 9: Add shadcn primitives (table, select, badge, tabs, skeleton, tooltip)

**Files:**
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/tooltip.tsx`

- [ ] **Step 1: Add Radix dependencies**

Run:
```bash
pnpm add @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-select
```

- [ ] **Step 2: Create `table.tsx`** (no Radix — shadcn pure styled `<table>`)

Create `src/components/ui/table.tsx`:
```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn('bg-muted/30', className)} {...props} />,
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn('', className)} {...props} />,
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('border-b border-border/60 transition-colors hover:bg-muted/50', className)} {...props} />
  ),
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-10 px-3 text-left align-middle font-semibold text-muted-foreground text-xs uppercase tracking-wide',
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('p-3 align-middle', className)} {...props} />
  ),
);
TableCell.displayName = 'TableCell';
```

- [ ] **Step 3: Create `badge.tsx`**

Create `src/components/ui/badge.tsx`:
```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted text-foreground',
        success: 'border-green-300 bg-green-50 text-green-700',
        warning: 'border-amber-300 bg-amber-50 text-amber-700',
        destructive: 'border-red-300 bg-red-50 text-red-700',
        info: 'border-blue-300 bg-blue-50 text-blue-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

- [ ] **Step 4: Create `skeleton.tsx`**

Create `src/components/ui/skeleton.tsx`:
```tsx
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded bg-muted/60', className)} {...props} />;
}
```

- [ ] **Step 5: Create `tabs.tsx` (Radix)**

Create `src/components/ui/tabs.tsx`:
```tsx
'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex border-b-2 border-border/60 px-4', className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'px-4 py-2.5 text-sm text-muted-foreground -mb-0.5 border-b-2 border-transparent',
      'data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:font-medium',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('p-0', className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
```

- [ ] **Step 6: Create `tooltip.tsx` (Radix)**

Create `src/components/ui/tooltip.tsx`:
```tsx
'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
```

- [ ] **Step 7: Create `select.tsx` (Radix)**

Create `src/components/ui/select.tsx`:
```tsx
'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm',
      'focus:outline-none focus:ring-2 focus:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-dropdown',
        position === 'popper' && 'data-[side=bottom]:translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
      'focus:bg-accent focus:text-accent-foreground',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;
```

- [ ] **Step 8: Verify typecheck**

```bash
pnpm typecheck
```
Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/ui
git commit -m "feat(ui): shadcn primitives — table, select, badge, tabs, skeleton, tooltip"
```

---

### Task 10: ciTpCd dispatcher + UnsupportedTypeCard

**Files:**
- Create: `src/components/features/ci/data-cards/dispatcher.tsx`
- Create: `src/components/features/ci/data-cards/unsupported-type-card.tsx`

- [ ] **Step 1: Implement UnsupportedTypeCard**

Create `src/components/features/ci/data-cards/unsupported-type-card.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UnsupportedTypeCard({ ciTpCd }: { ciTpCd: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">상세 카드 미지원 (ciTpCd: {ciTpCd})</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        이 CI 타입의 상세 카드는 다음 사이클에서 지원됩니다.
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Implement dispatcher**

Create `src/components/features/ci/data-cards/dispatcher.tsx`:
```tsx
import type { CiDetail } from '@/lib/api/schemas';
import type { MasterRack, MasterVendor } from '@/lib/api/schemas';
import { ServerDataCard } from '@/components/features/server/detail/server-data-card';
import { UnsupportedTypeCard } from './unsupported-type-card';

export interface CiDataCardProps {
  ci: CiDetail;
  rack?: MasterRack;
  vendor?: MasterVendor;
}

/** Renders the type-specific data card for a CI. SERVER is the only type
 *  implemented in this cycle; everything else gets the placeholder card. */
export function CiDataCard({ ci, rack, vendor }: CiDataCardProps) {
  if (ci.ciTpCd === 'SERVER' && ci.serverData) {
    return <ServerDataCard data={ci.serverData} rack={rack} vendor={vendor} />;
  }
  return <UnsupportedTypeCard ciTpCd={ci.ciTpCd} />;
}
```

(`ServerDataCard` is created in Task 16 — typecheck will not pass until then. Since dispatcher imports it eagerly, finalize the commit only after Task 16. For now, comment out the import + create a stub that returns null, or skip Task 10 and merge into Task 16 if your engineer prefers strict commit-by-commit green. We'll keep this as a stub commit.)

- [ ] **Step 3: Stub for transient compile**

Replace dispatcher.tsx temporarily:
```tsx
import type { CiDetail } from '@/lib/api/schemas';
import { UnsupportedTypeCard } from './unsupported-type-card';

export interface CiDataCardProps { ci: CiDetail; rack?: unknown; vendor?: unknown; }

export function CiDataCard({ ci }: CiDataCardProps) {
  // Server card wired in Task 16.
  return <UnsupportedTypeCard ciTpCd={ci.ciTpCd} />;
}
```

- [ ] **Step 4: typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/features/ci
git commit -m "feat(ci): ciTpCd data-card dispatcher + unsupported placeholder"
```

---

## Phase B — Domain UI Components

### Task 11: Server domain query hooks (client)

**Files:**
- Create: `src/components/features/server/hooks.ts`

- [ ] **Step 1: Implement domain hooks**

Create `src/components/features/server/hooks.ts`:
```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/mutator';
import {
  CiListPageSchema, CiDetailSchema, CiIpListSchema, CiEmployeeListSchema,
  type CiListPage, type CiDetail, type CiIpItem, type CiEmployeeItem,
} from '@/lib/api/schemas';
import { toBackendPageable, type PagingState } from '@/lib/api/paging';

export interface ServerListParams extends PagingState {
  ciNm?: string;
  envrnGpCd?: string;
  ciStatVal?: string;
}

function buildListUrl(p: ServerListParams): string {
  const back = toBackendPageable(p);
  const sp = new URLSearchParams({
    ciTpCd: 'SERVER',
    page: String(back.page),
    size: String(back.size),
    sort: back.sort,
  });
  if (p.ciNm) sp.set('ciNm', p.ciNm);
  if (p.envrnGpCd) sp.set('envrnGpCd', p.envrnGpCd);
  if (p.ciStatVal) sp.set('ciStatVal', p.ciStatVal);
  return `/api/proxy/api/v1/cis?${sp.toString()}`;
}

export function useServerList(params: ServerListParams) {
  return useQuery<CiListPage>({
    queryKey: ['cis', 'list', { ...params, ciTpCd: 'SERVER' }],
    queryFn: async () => CiListPageSchema.parse(await apiFetch<unknown>(buildListUrl(params))),
  });
}

export function useServerDetail(ciId: number) {
  return useQuery<CiDetail>({
    queryKey: ['cis', 'detail', ciId],
    queryFn: async () =>
      CiDetailSchema.parse(await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}`)),
  });
}

export function useCiIps(ciId: number) {
  return useQuery<CiIpItem[]>({
    queryKey: ['cis', 'ips', ciId],
    queryFn: async () =>
      CiIpListSchema.parse(await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/ips`)),
  });
}

export function useCiEmployees(ciId: number) {
  return useQuery<CiEmployeeItem[]>({
    queryKey: ['cis', 'employees', ciId],
    queryFn: async () =>
      CiEmployeeListSchema.parse(await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/employees`)),
  });
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/server/hooks.ts
git commit -m "feat(server): domain react-query hooks (list, detail, ips, employees)"
```

---

### Task 12: Server list table + columns + sort headers

**Files:**
- Create: `src/components/features/server/list/server-list-columns.ts`
- Create: `src/components/features/server/list/server-list-table.tsx`

Sort clicking is implemented as **server-side** Link navigation: each sortable header is a `<Link href="?sort=ciNm,asc">` that flips direction on repeat clicks. No client JS required.

- [ ] **Step 1: Implement columns spec**

Create `src/components/features/server/list/server-list-columns.ts`:
```ts
import type { CiListItem } from '@/lib/api/schemas';

export interface ColumnDef {
  key: keyof CiListItem | 'status' | 'location';
  header: string;
  /** Width hint as Tailwind class (optional). */
  width?: string;
  /** When `true`, header is clickable and emits a `sort` change. */
  sortable?: boolean;
  /** Maps the row to the cell text/JSX. Receives optional resolvers. */
}

export const SERVER_COLUMNS: ColumnDef[] = [
  { key: 'status', header: '상태' },
  { key: 'ciNm', header: '호스트명', sortable: true },
  { key: 'ciBizwrkNm', header: '업무영역' },
  { key: 'envrnGpCd', header: '환경' },
  { key: 'location', header: '위치' },
  { key: 'grdCd', header: '등급' },
];
```

- [ ] **Step 2: Implement table (server component) — sort headers as Links**

Create `src/components/features/server/list/server-list-table.tsx`:
```tsx
import Link from 'next/link';
import type { Route } from 'next';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CiListItem } from '@/lib/api/schemas';
import type { MasterLocation, MasterRack } from '@/lib/api/schemas';
import { formatLocation } from '@/lib/master/format';
import { SERVER_COLUMNS, type ColumnDef } from './server-list-columns';

interface Props {
  rows: CiListItem[];
  locations: Map<number, MasterLocation>;
  racks: Map<number, MasterRack>;
  /** Current `sort` query string e.g. "ciId,desc" */
  currentSort: string;
  /** Builds `?sort=key,dir&...` keeping other params */
  buildSortHref: (key: string) => string;
}

function sortIndicator(currentSort: string, key: string): string {
  const [k, dir] = currentSort.split(',');
  if (k !== key) return '';
  return dir === 'asc' ? ' ▲' : ' ▼';
}

function nextSortFor(currentSort: string, key: string): string {
  const [k, dir] = currentSort.split(',');
  if (k !== key) return `${key},asc`;
  return dir === 'asc' ? `${key},desc` : `${key},asc`;
}

function statusBadge(stat: string | undefined) {
  if (stat === 'ACTIVE') return <Badge variant="success">운영중</Badge>;
  if (stat === 'DECOMMISSIONED') return <Badge variant="destructive">폐기</Badge>;
  return <Badge>{stat ?? '—'}</Badge>;
}

function gradeBadge(grd: string | undefined) {
  if (!grd) return '—';
  const variant = grd === 'A' ? 'success' : grd === 'B' ? 'info' : 'warning';
  return <Badge variant={variant}>{grd}</Badge>;
}

export function ServerListTable({ rows, locations, racks }: Props) {
  if (rows.length === 0) {
    return <div className="p-10 text-center text-sm text-muted-foreground">조회된 서버가 없습니다.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {SERVER_COLUMNS.map((c: ColumnDef) =>
            c.sortable ? (
              <TableHead key={c.key}>
                <Link
                  href={buildSortHref(nextSortFor(currentSort, c.key as string)) as Route}
                  className="hover:text-foreground"
                >
                  {c.header}
                  <span className="text-primary">{sortIndicator(currentSort, c.key as string)}</span>
                </Link>
              </TableHead>
            ) : (
              <TableHead key={c.key}>{c.header}</TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.ciId} className="cursor-pointer hover:bg-muted/40">
            <TableCell colSpan={1}>{statusBadge(row.ciStatVal)}</TableCell>
            <TableCell>
              <Link
                href={`/servers/${row.ciId}` as Route}
                className="font-semibold text-foreground hover:text-primary"
              >
                {row.ciNm}
              </Link>
            </TableCell>
            <TableCell>{row.ciBizwrkNm ?? '—'}</TableCell>
            <TableCell>{row.envrnGpCd ?? '—'}</TableCell>
            <TableCell>
              {formatLocation(row.locId !== undefined ? locations.get(row.locId) : undefined)}
            </TableCell>
            <TableCell>{gradeBadge(row.grdCd)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Add `ColumnDef` export + ensure key matches Pageable sort fields**

In `server-list-columns.ts`, ensure `ColumnDef` is exported (the type is already in the previous step — verify the export keyword is present). The column `key` for sortable items must match a CI field name accepted by Spring's `?sort=` (e.g., `ciId`, `ciNm`, `ciStatVal`). Update the `key` type if needed:
```ts
export interface ColumnDef {
  key: string;          // Spring sort field for sortable; pseudo-key for non-sortable
  header: string;
  width?: string;
  sortable?: boolean;
}

export const SERVER_COLUMNS: ColumnDef[] = [
  { key: 'ciStatVal', header: '상태', sortable: true },
  { key: 'ciNm',      header: '호스트명', sortable: true },
  { key: 'ciBizwrkNm',header: '업무영역', sortable: true },
  { key: 'envrnGpCd', header: '환경', sortable: true },
  { key: 'location',  header: '위치' },                  // not directly sortable
  { key: 'grdCd',     header: '등급', sortable: true },
];
```

- [ ] **Step 4: typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/features/server/list
git commit -m "feat(server): list table with badges, master-aware location, sort header links"
```

---

### Task 13: Server list filters (client)

**Files:**
- Create: `src/components/features/server/list/server-list-filters.tsx`

- [ ] **Step 1: Implement**

Create `src/components/features/server/list/server-list-filters.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';

const ENV_OPTIONS = [
  { value: '', label: '환경 전체' },
  { value: 'PROD', label: 'PROD' },
  { value: 'STAGE', label: 'STAGE' },
  { value: 'DEV', label: 'DEV' },
];

const STATUS_OPTIONS = [
  { value: '', label: '상태 전체' },
  { value: 'ACTIVE', label: '운영중' },
  { value: 'DECOMMISSIONED', label: '폐기' },
];

const FILTER_KEYS = ['ciNm', 'envrnGpCd', 'ciStatVal'] as const;

export function ServerListFilters() {
  const { values, set } = useUrlFilters({ keys: FILTER_KEYS });
  const [draftCiNm, setDraftCiNm] = useState(values.ciNm);

  // Re-sync local draft when URL changes externally (e.g. clear filters).
  useEffect(() => setDraftCiNm(values.ciNm), [values.ciNm]);

  function commitSearch() {
    if (draftCiNm !== values.ciNm) set({ ciNm: draftCiNm });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
      <Input
        type="text"
        value={draftCiNm}
        onChange={(e) => setDraftCiNm(e.target.value)}
        onBlur={commitSearch}
        onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(); }}
        placeholder="🔍 호스트명으로 검색 (ciNm)"
        className="h-9 w-72 text-sm"
      />
      <Select
        value={values.envrnGpCd}
        onValueChange={(v) => set({ envrnGpCd: v })}
      >
        <SelectTrigger className="h-9 w-44 text-sm">
          <SelectValue placeholder="환경 전체" />
        </SelectTrigger>
        <SelectContent>
          {ENV_OPTIONS.map((o) => (
            <SelectItem key={o.value || 'all'} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={values.ciStatVal}
        onValueChange={(v) => set({ ciStatVal: v })}
      >
        <SelectTrigger className="h-9 w-44 text-sm">
          <SelectValue placeholder="상태 전체" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value || 'all'} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Note on Radix Select empty value**

`@radix-ui/react-select` rejects an empty string for `Select.Item.value`. If "전체" needs to be selectable as a clear-filter, use a sentinel like `'__ALL__'` and translate to `''` on `onValueChange`. If you hit this at runtime, refactor:
```tsx
<SelectItem value="__ALL__">환경 전체</SelectItem>
// onValueChange={(v) => set({ envrnGpCd: v === '__ALL__' ? '' : v })}
```

- [ ] **Step 3: typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add src/components/features/server/list/server-list-filters.tsx
git commit -m "feat(server): list filters (ciNm search, env, status) wired to URL state"
```

---

### Task 14: Server list pagination (client)

**Files:**
- Create: `src/components/features/server/list/server-list-pagination.tsx`

- [ ] **Step 1: Implement**

Create `src/components/features/server/list/server-list-pagination.tsx`:
```tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { PageMeta } from '@/lib/api/schemas';
import { cn } from '@/lib/utils';

interface Props {
  meta: PageMeta;       // backend page (0-base)
}

const SIBLINGS = 1;

function pageList(currentUi: number, totalPages: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) out.push(i);
    return out;
  }
  out.push(1);
  if (currentUi - SIBLINGS > 2) out.push('…');
  for (let i = Math.max(2, currentUi - SIBLINGS); i <= Math.min(totalPages - 1, currentUi + SIBLINGS); i++) {
    out.push(i);
  }
  if (currentUi + SIBLINGS < totalPages - 1) out.push('…');
  out.push(totalPages);
  return out;
}

export function ServerListPagination({ meta }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams() ?? new URLSearchParams();
  const currentUi = meta.number + 1;
  const totalPages = Math.max(1, meta.totalPages);

  function go(target: number) {
    if (target < 1 || target > totalPages || target === currentUi) return;
    const next = new URLSearchParams(sp.toString());
    next.set('page', String(target));
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
      <div>총 {meta.totalElements.toLocaleString()}건</div>
      <div className="flex gap-1">
        {pageList(currentUi, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-2 text-muted-foreground/70">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded border text-[12px]',
                p === currentUi
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {p}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/server/list/server-list-pagination.tsx
git commit -m "feat(server): list pagination footer with elided page numbers"
```

---

### Task 15: Server detail header

**Files:**
- Create: `src/components/features/server/detail/server-detail-header.tsx`

- [ ] **Step 1: Implement**

Create `src/components/features/server/detail/server-detail-header.tsx`:
```tsx
import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { RoleGuard } from '@/lib/auth/rbac';
import type { CiDetail } from '@/lib/api/schemas';

interface Props {
  ci: CiDetail;
  myRoles: readonly string[];
}

function statusBadge(stat: string | undefined) {
  if (stat === 'ACTIVE') return <Badge variant="success">운영중</Badge>;
  if (stat === 'DECOMMISSIONED') return <Badge variant="destructive">폐기</Badge>;
  return <Badge>{stat ?? '—'}</Badge>;
}

export function ServerDetailHeader({ ci, myRoles }: Props) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-3 text-xl font-semibold">
        <Link href={'/servers' as Route} className="text-primary hover:underline">
          ← 서버 목록
        </Link>
        <span className="text-border">/</span>
        {ci.ciNm}
        {statusBadge(ci.ciStatVal)}
      </h2>

      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={200}>
          <RoleGuard role="USER" myRoles={myRoles}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled aria-disabled>📝 이력</Button>
              </TooltipTrigger>
              <TooltipContent>다음 사이클에서 활성화됩니다.</TooltipContent>
            </Tooltip>
          </RoleGuard>

          <RoleGuard role="OPERATOR" myRoles={myRoles}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled aria-disabled>편집</Button>
              </TooltipTrigger>
              <TooltipContent>다음 사이클에서 활성화됩니다.</TooltipContent>
            </Tooltip>
          </RoleGuard>

          <RoleGuard role="ADMIN" myRoles={myRoles}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled aria-disabled className="border-destructive/40 text-destructive">
                  폐기
                </Button>
              </TooltipTrigger>
              <TooltipContent>다음 사이클에서 활성화됩니다.</TooltipContent>
            </Tooltip>
          </RoleGuard>
        </TooltipProvider>
      </div>
    </div>
  );
}
```

(Verify `Button` accepts `variant="outline"`. If not, replace with the closest existing variant from `src/components/ui/button.tsx`. Read that file first to confirm.)

- [ ] **Step 2: Read existing Button to confirm variants**

```bash
cat src/components/ui/button.tsx | head -40
```
Expected: see `cva` variants. Map to actual names. If `outline` doesn't exist, use `secondary` or whichever is closest.

- [ ] **Step 3: typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/components/features/server/detail/server-detail-header.tsx
git commit -m "feat(server): detail header with role-gated, disabled action buttons"
```

---

### Task 16: CI common info card + Server data card

**Files:**
- Create: `src/components/features/server/detail/ci-common-info-card.tsx`
- Create: `src/components/features/server/detail/server-data-card.tsx`
- Modify: `src/components/features/ci/data-cards/dispatcher.tsx` (re-import the real ServerDataCard)

- [ ] **Step 1: Implement CI common info card**

Create `src/components/features/server/detail/ci-common-info-card.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CiDetail } from '@/lib/api/schemas';
import type { MasterLocation } from '@/lib/api/schemas';
import { formatLocation } from '@/lib/master/format';

interface Props {
  ci: CiDetail;
  location?: MasterLocation;
}

const InfoItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-3 px-5 py-3">
    <div className="w-20 shrink-0 text-xs text-muted-foreground">{label}</div>
    <div className="text-sm">{children}</div>
  </div>
);

export function CiCommonInfoCard({ ci, location }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">기본 정보 (CI 공통)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-0 p-0 md:grid-cols-3">
        <InfoItem label="CI 명"><b>{ci.ciNm}</b></InfoItem>
        <InfoItem label="타입">{ci.ciTpCd}</InfoItem>
        <InfoItem label="환경">{ci.envrnGpCd ?? '—'}</InfoItem>
        <InfoItem label="업무">{ci.ciBizwrkNm ?? '—'}</InfoItem>
        <InfoItem label="역할">{ci.ciRoleNm ?? '—'}</InfoItem>
        <InfoItem label="등급">{ci.grdCd ? <Badge>{ci.grdCd}</Badge> : '—'}</InfoItem>
        <div className="md:col-span-3">
          <InfoItem label="위치">{formatLocation(location)}</InfoItem>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Implement Server data card**

Create `src/components/features/server/detail/server-data-card.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CiServerData, MasterRack, MasterVendor } from '@/lib/api/schemas';
import { formatRack, formatVendor } from '@/lib/master/format';

interface Props {
  data: CiServerData;
  rack?: MasterRack;
  vendor?: MasterVendor;
}

const Item = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex gap-3 px-5 py-3">
    <div className="w-24 shrink-0 text-xs text-muted-foreground">{label}</div>
    <div className="text-sm">{children}</div>
  </div>
);

function formatSpec(d: CiServerData): string {
  const cores = d.cpucoreCnt;
  const mem = d.memoryCapa;
  const disk = d.diskCapa;
  const parts = [
    cores != null ? `${cores}C` : null,
    mem != null ? `${mem}GB` : null,
    disk != null ? `${disk}GB` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
}

export function ServerDataCard({ data, rack, vendor }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">서버 상세 (serverData)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-0 p-0 md:grid-cols-3">
        <Item label="호스트명">{data.hostNm ?? '—'}</Item>
        <Item label="OS">{[data.osTpNm, data.osVer].filter(Boolean).join(' ') || '—'}</Item>
        <Item label="CPU/MEM/DISK">{formatSpec(data)}</Item>
        <Item label="벤더">{formatVendor(vendor)}</Item>
        <Item label="렉">{formatRack(rack)}</Item>
        <Item label="실사 ID">{data.assetId ?? '—'}</Item>
        <Item label="도입일">{data.introDt ?? '—'}</Item>
        <Item label="유지보수 만료">{data.maintEndDt ?? '—'}</Item>
        <Item label="백업">{data.osBackupYn === 'Y' ? '✅ 예' : data.osBackupYn === 'N' ? '아니오' : '—'}</Item>
        <Item label="보안등급">{data.aciLvlGrd ?? '—'}</Item>
        <Item label="모니터링">{data.monitYn === 'Y' ? '✅' : '—'}</Item>
        <Item label="가상화">{data.virtMchnYn === 'Y' ? `${data.virtMchnPltfomNm ?? 'VM'}` : '—'}</Item>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Wire dispatcher to real ServerDataCard**

Replace `src/components/features/ci/data-cards/dispatcher.tsx` with:
```tsx
import type { CiDetail, MasterRack, MasterVendor } from '@/lib/api/schemas';
import { ServerDataCard } from '@/components/features/server/detail/server-data-card';
import { UnsupportedTypeCard } from './unsupported-type-card';

export interface CiDataCardProps {
  ci: CiDetail;
  rack?: MasterRack;
  vendor?: MasterVendor;
}

export function CiDataCard({ ci, rack, vendor }: CiDataCardProps) {
  if (ci.ciTpCd === 'SERVER' && ci.serverData) {
    return <ServerDataCard data={ci.serverData} rack={rack} vendor={vendor} />;
  }
  return <UnsupportedTypeCard ciTpCd={ci.ciTpCd} />;
}
```

- [ ] **Step 4: typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/features/server/detail src/components/features/ci/data-cards/dispatcher.tsx
git commit -m "feat(server): common info + serverData detail cards (master-aware)"
```

---

### Task 17: Server detail tabs (client) + IPs tab + Employees tab

**Files:**
- Create: `src/components/features/server/detail/server-detail-tabs.tsx`
- Create: `src/components/features/server/detail/tabs/ips-tab.tsx`
- Create: `src/components/features/server/detail/tabs/employees-tab.tsx`

- [ ] **Step 1: Implement IPs tab**

Create `src/components/features/server/detail/tabs/ips-tab.tsx`:
```tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCiIps } from '@/components/features/server/hooks';

const IP_TYPE_VARIANT = {
  VIP: 'warning',
  REAL: 'info',
  ADMIN: 'success',
  NAS: 'default',
  PUBLIC: 'default',
  PRIVATE: 'default',
} as const;

export function IpsTab({ ciId }: { ciId: number }) {
  const { data, isLoading, isError } = useCiIps(ciId);

  if (isLoading) return <div className="p-4"><Skeleton className="h-24 w-full" /></div>;
  if (isError) return <div className="p-6 text-sm text-muted-foreground">IP 정보를 불러오지 못했습니다.</div>;
  if (!data || data.length === 0) return <div className="p-6 text-sm text-muted-foreground">할당된 IP가 없습니다.</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>타입</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>대역</TableHead>
          <TableHead>MAC</TableHead>
          <TableHead>DNS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((ip) => {
          const variant = IP_TYPE_VARIANT[ip.ipTpCd as keyof typeof IP_TYPE_VARIANT] ?? 'default';
          return (
            <TableRow key={ip.ipId}>
              <TableCell><Badge variant={variant}>{ip.ipTpCd}</Badge></TableCell>
              <TableCell className="font-medium">{ip.ipAddr}</TableCell>
              <TableCell>{ip.subnetCidrAddr ?? '—'}</TableCell>
              <TableCell>{ip.macAddr ?? '—'}</TableCell>
              <TableCell>{ip.dnsNm ?? '—'}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Implement Employees tab**

Create `src/components/features/server/detail/tabs/employees-tab.tsx`:
```tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCiEmployees } from '@/components/features/server/hooks';

export function EmployeesTab({ ciId }: { ciId: number }) {
  const { data, isLoading, isError } = useCiEmployees(ciId);
  if (isLoading) return <div className="p-4"><Skeleton className="h-24 w-full" /></div>;
  if (isError) return <div className="p-6 text-sm text-muted-foreground">담당자 정보를 불러오지 못했습니다.</div>;
  if (!data || data.length === 0) return <div className="p-6 text-sm text-muted-foreground">지정된 담당자가 없습니다.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이름</TableHead>
          <TableHead>역할</TableHead>
          <TableHead>이메일</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead>부서</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((e) => (
          <TableRow key={e.empId}>
            <TableCell className="font-medium">{e.empNm}</TableCell>
            <TableCell>{e.roleCd ?? '—'}</TableCell>
            <TableCell>{e.emailAddr ?? '—'}</TableCell>
            <TableCell>{e.telNo ?? '—'}</TableCell>
            <TableCell>{e.deptNm ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Implement tabs container**

Create `src/components/features/server/detail/server-detail-tabs.tsx`:
```tsx
'use client';

import { Card } from '@/components/ui/card';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { IpsTab } from './tabs/ips-tab';
import { EmployeesTab } from './tabs/employees-tab';

interface Props { ciId: number; }

export function ServerDetailTabs({ ciId }: Props) {
  return (
    <Card>
      <Tabs defaultValue="ips">
        <TooltipProvider delayDuration={200}>
          <TabsList>
            <TabsTrigger value="ips">IP 주소</TabsTrigger>
            <TabsTrigger value="employees">담당자</TabsTrigger>

            {(['relations', 'history', 'connection-map'] as const).map((k) => (
              <Tooltip key={k}>
                <TooltipTrigger asChild>
                  <TabsTrigger value={k} disabled className="cursor-not-allowed opacity-60">
                    {k === 'relations' ? '관계' : k === 'history' ? '이력' : '연결 맵'}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>다음 사이클에서 지원됩니다.</TooltipContent>
              </Tooltip>
            ))}
          </TabsList>
        </TooltipProvider>
        <TabsContent value="ips"><IpsTab ciId={ciId} /></TabsContent>
        <TabsContent value="employees"><EmployeesTab ciId={ciId} /></TabsContent>
      </Tabs>
    </Card>
  );
}
```

- [ ] **Step 4: typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/components/features/server/detail/server-detail-tabs.tsx src/components/features/server/detail/tabs
git commit -m "feat(server): detail tabs (IPs, employees) with disabled placeholders"
```

---

## Phase C — Routes

### Task 18: /servers route — page, loading, error

**Files:**
- Create: `src/app/(app)/servers/page.tsx`
- Create: `src/app/(app)/servers/loading.tsx`
- Create: `src/app/(app)/servers/error.tsx`

- [ ] **Step 1: Implement loading**

Create `src/app/(app)/servers/loading.tsx`:
```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
```

- [ ] **Step 2: Implement error boundary**

Create `src/app/(app)/servers/error.tsx`:
```tsx
'use client';

import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm">
      <h2 className="mb-2 text-base font-semibold text-destructive">목록을 불러오지 못했습니다.</h2>
      <p className="text-muted-foreground">잠시 후 다시 시도해 주세요. 문제 보고 시 traceId를 함께 알려주세요.</p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground">digest: {error.digest}</p> : null}
      <Button onClick={reset} className="mt-4" variant="outline">다시 시도</Button>
    </div>
  );
}
```

(`variant="outline"` — adjust if not present.)

- [ ] **Step 3: Implement page (Server Component)**

Create `src/app/(app)/servers/page.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoleGuard } from '@/lib/auth/rbac';
import { getMyProfile } from '@/lib/auth/me';
import { serverFetch } from '@/lib/api/server-fetch';
import { CiListPageSchema } from '@/lib/api/schemas';
import { parsePaging, toBackendPageable } from '@/lib/api/paging';
import { getLocationsMap, getRacksMap } from '@/lib/master/server';
import { ServerListTable } from '@/components/features/server/list/server-list-table';
import { ServerListFilters } from '@/components/features/server/list/server-list-filters';
import { ServerListPagination } from '@/components/features/server/list/server-list-pagination';

export const dynamic = 'force-dynamic';

interface SearchParams {
  ciNm?: string; envrnGpCd?: string; ciStatVal?: string;
  page?: string; size?: string; sort?: string;
}

function buildBackendQuery(sp: SearchParams): string {
  const paging = parsePaging(new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]));
  const back = toBackendPageable(paging);
  const qs = new URLSearchParams({
    ciTpCd: 'SERVER',
    page: String(back.page),
    size: String(back.size),
    sort: back.sort,
  });
  if (sp.ciNm) qs.set('ciNm', sp.ciNm);
  if (sp.envrnGpCd) qs.set('envrnGpCd', sp.envrnGpCd);
  if (sp.ciStatVal) qs.set('ciStatVal', sp.ciStatVal);
  return qs.toString();
}

export default async function ServersPage({
  searchParams,
}: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const [profile, raw, locations, racks] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>(`/api/v1/cis?${buildBackendQuery(sp)}`),
    getLocationsMap(),
    getRacksMap(),
  ]);
  const page = CiListPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];

  // Build sort href factory: keep all current params except `sort`, drop `page`.
  const paging = parsePaging(new URLSearchParams(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][]));
  const buildSortHref = (nextSort: string) => {
    const next = new URLSearchParams();
    if (sp.ciNm) next.set('ciNm', sp.ciNm);
    if (sp.envrnGpCd) next.set('envrnGpCd', sp.envrnGpCd);
    if (sp.ciStatVal) next.set('ciStatVal', sp.ciStatVal);
    next.set('size', String(paging.size));
    next.set('sort', nextSort);
    return `/servers?${next.toString()}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">서버 목록</CardTitle>
        <RoleGuard role="OPERATOR" myRoles={myRoles}>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled aria-disabled>+ 등록</Button>
              </TooltipTrigger>
              <TooltipContent>다음 사이클에서 활성화됩니다.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </RoleGuard>
      </CardHeader>
      <ServerListFilters />
      <CardContent className="p-0">
        <ServerListTable
          rows={page.content}
          locations={locations}
          racks={racks}
          currentSort={paging.sort}
          buildSortHref={buildSortHref}
        />
      </CardContent>
      <ServerListPagination meta={page.page} />
    </Card>
  );
}
```

- [ ] **Step 4: typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Manual smoke (dev server)**

```bash
pnpm dev
# Open http://localhost:3000/servers
# Verify: list renders, filters update URL, page numbers work, "+ 등록" appears for OPERATOR/ADMIN only.
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/servers/page.tsx src/app/\(app\)/servers/loading.tsx src/app/\(app\)/servers/error.tsx
git commit -m "feat(servers): /servers route — list page (server component) + boundaries"
```

---

### Task 19: /servers/[ciId] route — detail page + not-found

**Files:**
- Create: `src/app/(app)/servers/[ciId]/page.tsx`
- Create: `src/app/(app)/servers/[ciId]/not-found.tsx`

- [ ] **Step 1: Implement not-found**

Create `src/app/(app)/servers/[ciId]/not-found.tsx`:
```tsx
import Link from 'next/link';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="rounded-md border border-border bg-background p-8 text-center">
      <h2 className="mb-2 text-lg font-semibold">서버를 찾을 수 없습니다.</h2>
      <p className="mb-4 text-sm text-muted-foreground">존재하지 않거나 폐기된 CI 일 수 있습니다.</p>
      <Link href={'/servers' as Route}>
        <Button variant="outline">목록으로 돌아가기</Button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Implement detail page (Server Component)**

Create `src/app/(app)/servers/[ciId]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api/envelope';
import { serverFetch } from '@/lib/api/server-fetch';
import { CiDetailSchema } from '@/lib/api/schemas';
import { getMyProfile } from '@/lib/auth/me';
import { getLocationsMap, getRacksMap, getVendorsMap } from '@/lib/master/server';
import { ServerDetailHeader } from '@/components/features/server/detail/server-detail-header';
import { CiCommonInfoCard } from '@/components/features/server/detail/ci-common-info-card';
import { CiDataCard } from '@/components/features/ci/data-cards/dispatcher';
import { ServerDetailTabs } from '@/components/features/server/detail/server-detail-tabs';

export const dynamic = 'force-dynamic';

interface Params { ciId: string; }

export default async function ServerDetailPage({ params }: { params: Promise<Params> }) {
  const { ciId: ciIdRaw } = await params;
  const ciId = Number(ciIdRaw);
  if (!Number.isFinite(ciId) || ciId <= 0) notFound();

  let ci, locations, racks, vendors, profile;
  try {
    [ci, locations, racks, vendors, profile] = await Promise.all([
      serverFetch<unknown>(`/api/v1/cis/${ciId}`).then(CiDetailSchema.parse),
      getLocationsMap(),
      getRacksMap(),
      getVendorsMap(),
      getMyProfile(),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  const myRoles = profile?.roles ?? [];
  const location = ci.locId !== undefined ? locations.get(ci.locId) : undefined;
  const rack = ci.serverData?.rackId !== undefined ? racks.get(ci.serverData.rackId) : undefined;
  const vendor = ci.serverData?.vendorId !== undefined ? vendors.get(ci.serverData.vendorId) : undefined;

  return (
    <div className="space-y-4">
      <ServerDetailHeader ci={ci} myRoles={myRoles} />
      <CiCommonInfoCard ci={ci} location={location} />
      <CiDataCard ci={ci} rack={rack} vendor={vendor} />
      <ServerDetailTabs ciId={ciId} />
    </div>
  );
}
```

- [ ] **Step 3: typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Manual smoke**

```bash
pnpm dev
# Visit http://localhost:3000/servers/<some-real-ciId>
# Verify: header + common info + serverData (or unsupported placeholder) + tabs.
# Visit /servers/999999 → not-found.
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/servers/\[ciId\]
git commit -m "feat(servers): /servers/[ciId] detail page with cards + tabs"
```

---

### Task 20: Activate "서버" sidebar menu

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Toggle disabled flag**

Edit `src/components/layout/sidebar.tsx` — find the `인프라` group, change the `서버` item:
```ts
{ href: '/servers', icon: '🖥️', label: '서버' },   // remove `disabled: true`
```

(Other items in the same group remain `disabled: true` — those come in later cycles.)

- [ ] **Step 2: typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev
# Click "서버" in the sidebar → /servers loads. Other 인프라 items still appear disabled.
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(layout): activate 서버 sidebar menu"
```

---

## Phase D — E2E + Verification

### Task 21: Playwright e2e — list + detail (3 RBAC scenarios)

**Files:**
- Create: `tests/e2e/server-list.spec.ts`
- Create: `tests/e2e/server-detail.spec.ts`

- [ ] **Step 1: Verify there are working test accounts**

Confirm with backend or `.env.local`:
- `LDAP_TEST_USER_USER` / `LDAP_TEST_USER_USER_PASS` (USER role)
- `LDAP_TEST_USER_OPERATOR` / `LDAP_TEST_USER_OPERATOR_PASS` (OPERATOR role)
- `LDAP_TEST_USER_ADMIN` / `LDAP_TEST_USER_ADMIN_PASS` (ADMIN role)

If unavailable, document a mock plan and gate these tests behind `test.skip(!process.env.LDAP_TEST_USER_USER)`.

- [ ] **Step 2: Add a login helper if not present**

Look at existing `tests/e2e/login.spec.ts` (from auth MVP). If it has a `loginAs(page, username, password)` helper, reuse. Otherwise add to `tests/e2e/_helpers.ts`:
```ts
import type { Page } from '@playwright/test';

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('아이디').fill(username);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: /로그인/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}
```

- [ ] **Step 3: Implement server-list.spec.ts**

Create `tests/e2e/server-list.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const USER = process.env.LDAP_TEST_USER_USER ?? '';
const USER_PW = process.env.LDAP_TEST_USER_USER_PASS ?? '';
const OPER = process.env.LDAP_TEST_USER_OPERATOR ?? '';
const OPER_PW = process.env.LDAP_TEST_USER_OPERATOR_PASS ?? '';

test.describe('/servers list', () => {
  test.skip(!USER || !OPER, 'LDAP test accounts not configured');

  test('USER sees list but no register button', async ({ page }) => {
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers');
    await expect(page.getByRole('heading', { name: '서버 목록' })).toBeVisible();
    await expect(page.getByRole('button', { name: /\+ 등록/ })).toHaveCount(0);
  });

  test('OPERATOR sees disabled register button', async ({ page }) => {
    await loginAs(page, OPER, OPER_PW);
    await page.goto('/servers');
    const btn = page.getByRole('button', { name: /\+ 등록/ });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test('search input changes URL and filters list', async ({ page }) => {
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers');
    await page.getByPlaceholder(/호스트명으로 검색/).fill('zzz-no-such-host');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/ciNm=zzz-no-such-host/);
    await expect(page.getByText(/조회된 서버가 없습니다|총 0건/)).toBeVisible();
  });
});
```

- [ ] **Step 4: Implement server-detail.spec.ts**

Create `tests/e2e/server-detail.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const USER = process.env.LDAP_TEST_USER_USER ?? '';
const USER_PW = process.env.LDAP_TEST_USER_USER_PASS ?? '';

test.describe('/servers/[ciId] detail', () => {
  test.skip(!USER, 'LDAP test accounts not configured');

  test('clicking a row goes to detail and IP tab loads', async ({ page }) => {
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers');
    const firstRow = page.getByRole('link').filter({ hasText: /^[A-Z0-9-]+$/ }).first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/servers\/\d+/);
    await expect(page.getByText('기본 정보 (CI 공통)')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'IP 주소' })).toHaveAttribute('data-state', 'active');
  });

  test('non-existent ciId shows not-found UI', async ({ page }) => {
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers/9999999');
    await expect(page.getByText(/서버를 찾을 수 없습니다/)).toBeVisible();
  });
});
```

- [ ] **Step 5: Run e2e**

```bash
pnpm test:e2e -- server-list.spec.ts server-detail.spec.ts
```
Expected: tests pass (or skip if accounts not configured).

- [ ] **Step 6: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): /servers list + detail RBAC and search scenarios"
```

---

### Task 22: ADR update + final verification

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Append §7 변경 이력**

Edit `docs/architecture.md` — find `## 7. 변경 이력` and append:
```md
- **2026-05-07**: 첫 도메인 사이클 — `/servers` 목록·상세 read-only 출시. 횡단 기반 정착: mutator envelope auto-unwrap + X-Trace-Id, server-side fetch helper, error code → 한국어 매핑, paging/url-filter hooks, RBAC primitives (`hasRole`, `RoleGuard`), master prefetch + format helpers, ciTpCd 데이터 카드 dispatcher. 의도된 deviation 5건 (필터 5종 → 3종, 상태 의미 차이, 상세 탭 6종 → 2종 + 비활성 placeholder, 연결 맵/Export 다음 사이클로) 기록.
```

- [ ] **Step 2: Add §9 if not present (ciTpCd dispatcher policy)**

If §9 doesn't exist in the file, append a new section:
```md
## 9. ciTpCd 데이터 카드 정책 (2026-05-07)

CI 상세 페이지는 `ciTpCd` 별로 **다른 확장 데이터 카드**를 렌더한다. 디스패치 컴포넌트(`src/components/features/ci/data-cards/dispatcher.tsx`)가 단일 진입점이며, 새로운 ciTpCd 지원은 새 카드 추가 + dispatcher case 한 줄로 끝난다. 미지원 타입은 `<UnsupportedTypeCard />`로 폴백한다 — 빈 화면 노출 금지.
```

- [ ] **Step 3: Final lint/typecheck**

```bash
pnpm lint && pnpm typecheck
```

- [ ] **Step 4: Final unit tests**

```bash
pnpm test
```
Expected: all green.

- [ ] **Step 5: Build (production confidence)**

```bash
pnpm build
```
Expected: build succeeds.

- [ ] **Step 6: Verify backend asks captured**

Confirm 5 backend requests are documented in spec §10 (already there); cross-check by re-reading `docs/superpowers/specs/2026-05-07-server-list-detail-readonly-design.md` §10. Open follow-up tickets externally — **not** in this commit.

- [ ] **Step 7: Commit**

```bash
git add docs/architecture.md
git commit -m "docs(adr): record server read-only cycle decisions and dispatcher policy"
```

---

## Verification Checklist (post-implementation)

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` (Vitest) passes — mutator, server-fetch, error-messages, schemas/ci, paging, use-url-filters, rbac, master/format
- [ ] `pnpm build` produces no errors
- [ ] `pnpm test:e2e` passes (or skipped with documented reason)
- [ ] Manual: USER, OPERATOR, ADMIN — register button visibility/state matches spec §2
- [ ] Manual: `/servers?ciNm=foo&envrnGpCd=PROD&page=2` survives reload
- [ ] Manual: `/servers/<unknown>` → not-found page
- [ ] Manual: `/servers/<non-SERVER ciTpCd>` → unsupported placeholder card
- [ ] Sidebar: 서버 menu active, others still disabled

---

## Notes for the Implementing Engineer

- **Server vs client component split** — pages are server components by default. Add `'use client'` only at leaf interactive components (filters, pagination, tabs, hooks consumers).
- **Path quoting in commits** — paths with parentheses (`(app)`) and brackets (`[ciId]`) need escaping in shell. Examples in tasks use `\(`/`\)`/`\[`/`\]`.
- **Generated Orval client** — exists in `src/api/generated/` but **is not used directly**. Domain hooks call `apiFetch` with manual URLs and Zod-parse the result. This is intentional (spec §3, plan conventions).
- **Master ID resolution** — only locations/racks/vendors are prefetched in this cycle; if `locId`/`rackId`/`vendorId` exists but is missing from the map (rare), the formatter returns `—`. Don't treat as an error.
- **Tooltip wrapping disabled buttons** — Radix Tooltip needs a non-disabled element to attach pointer events. The pattern used (`<TooltipTrigger asChild><Button disabled>...`) works because `asChild` forwards events to the Button; but if you see "tooltip never appears", wrap the disabled `Button` in a `<span tabIndex={0}>` and put the trigger on that span.
- **DON'T** introduce a global state store for filters or pagination — URL is the source of truth.
- **DON'T** modify `src/api/generated/` — re-run `pnpm gen:api` if you need fresh types.

---

## Variables and Conventions (single source)

| Concern | Convention |
|---|---|
| URL paging | 1-base in URL, 0-base for backend (handled in `paging.ts`) |
| Default sort | `ciId,desc` |
| Master page size for prefetch | 200 |
| Role hierarchy | USER (1) < OPERATOR (2) < ADMIN (3) |
| Empty filter representation | empty string in state, removed from URL by `useUrlFilters.set` |
| Error toast | `formatErrorForToast(err)` from `lib/api/error-messages` |
| ApiError code unknown | falls back to "요청을 처리하지 못했습니다." + traceId |
