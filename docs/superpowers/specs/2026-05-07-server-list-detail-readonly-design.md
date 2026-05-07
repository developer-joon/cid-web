# cid-web 서버(SERVER CI) 목록·상세 read-only — 설계 문서

> 첫 도메인 사이클. 이 스펙은 cid-web 사이드바의 **인프라 > 서버** 메뉴를 read-only 범위까지 구현하기 위한 설계.
> 이 사이클이 끝나면 후속 사이클(서버 등록/편집/폐기, 관계 편집, 이력 타임머신, Master CRUD, IP/Subnet)에서 재사용할 횡단 기반(envelope unwrap, URL state, RBAC, master resolver, ciTpCd dispatcher)이 함께 정착된다.

- 대상 브랜치: `feat/server-list-detail-readonly`(이 스펙으로부터 분기)
- 선결 의존성: `feat/auth-mvp-bootstrap`(BFF·세션·middleware) 머지 또는 동등 상태
- 작성일: 2026-05-07
- 관련 ADR: `docs/architecture.md` §1·§3·§5

---

## 1. 목표와 범위

### 1.1 한 줄 정의
**`/servers`(SERVER 타입 CI 목록)와 `/servers/[ciId]`(SERVER 상세) 두 라우트를 read-only로 출시**한다. 데이터는 cid-api `/api/v1/cis` + `/api/v1/cis/{id}` + `/api/v1/cis/{ciId}/{ips,employees}`로부터 가져온다.

### 1.2 In Scope
- **목록 페이지** `/servers`
  - 필터: `ciNm`(텍스트 검색), `envrnGpCd`(셀렉트), `ciStatVal`(셀렉트). `ciTpCd`는 `SERVER` 고정 (UI 노출 X).
  - 정렬: `sort` 쿼리스트링(기본 `ciId,desc`)으로 백엔드 위임. 컬럼 헤더 클릭 정렬.
  - 페이징: 표준 Spring `?page=&size=&sort=`. 푸터에 총건수·페이지 번호.
  - URL state: 모든 필터/페이지/정렬은 URL 쿼리에 직렬화 (공유 가능, 새로고침 보존).
  - 행 클릭 → `/servers/[ciId]` 이동.
  - "+ 등록" 버튼은 `OPERATOR` 이상에게만 보이고, **이번 사이클은 `disabled`** (다음 사이클에서 활성).
- **상세 페이지** `/servers/[ciId]`
  - 헤더: 브레드크럼 + CI 명 + `ciStatVal` 태그 + 액션 버튼(이력/편집/폐기) — 모두 RBAC로 가시성 제어, **이번 사이클은 `disabled`**.
  - "기본 정보(CI 공통)" 카드: `ciNm/ciTpCd/envrnGpCd/ciBizwrkNm/ciRoleNm/grdCd/ciDescp` + 위치(LOCATION 이름).
  - "서버 상세(serverData)" 카드: SERVER 타입 확장 필드 전체.
  - 탭 카드 (이번 사이클): **IP 주소**, **담당자**.
  - 미래 탭(회색 비활성 표시): 관계, 이력, 연결 맵.
- **횡단 기반** (이번 사이클이 처음 도입)
  - `mutator.ts` 강화 — envelope `{data,error}` 자동 unwrap, `X-Trace-Id` 부착. 401은 `proxy/[...path]`가 single-flight refresh로 흡수(이미 auth-mvp에서 정착).
  - 응답 런타임 검증 — Zod 스키마를 도메인별로 좁게 정의(이번 사이클은 CI/IP/EMP/MASTER 일부).
  - URL state hook — `usePagedQuery`(필터+페이징+정렬을 URL 쿼리와 양방향 sync).
  - Master 이름 resolver — `useMaster('locations'|'racks'|'vendors'|'employees')` 캐시.
  - RBAC — `<RoleGuard role>` 컴포넌트와 `useMyRoles()`.
  - 에러 코드 매핑 — `code → 한국어 메시지` 사전을 단일 지점에 두고 토스트/인라인에서 사용.
  - ciTpCd 데이터 카드 dispatcher — `serverData/dbData/...` 중 해당 카드만 렌더. SERVER만 구현, 나머지는 "이 타입은 추후 지원" placeholder.

### 1.3 Out of Scope (다음 사이클로)
- 등록/편집/폐기 (쓰기 사이클)
- 위치/등급/OS 필터 (백엔드 추가 필요)
- 글로벌 헤더 검색 (다른 도메인까지 묶일 때 설계)
- 컬럼 설정 / Bulk action / Export·Import
- 관계 카드, 연결 맵 mini-topology
- 이력 타임라인 / 시점 스냅샷 UI
- DB·NETWORK·APP·CLOUD 등 다른 ciTpCd의 상세 카드 (dispatcher만 두고 placeholder)
- DNS/애플리케이션/DB 연결/라이센스 탭 — cid-api에 도메인 부재. 사이드바에서도 다음 결정사항.

### 1.4 성공 기준 (검증)
1. ADMIN/OPERATOR/USER 3개 계정으로 로그인 후 `/servers` 진입 시 동일한 목록을 보여준다.
2. 검색·필터·페이지 변경 시 URL이 바뀌고 새로고침해도 상태가 보존된다.
3. 행 클릭 → 상세 페이지가 열리고 기본정보 + serverData + IP/담당자 탭이 데이터로 채워진다.
4. ADMIN/OPERATOR에게는 "+ 등록"이, USER에게는 안 보인다 (둘 다 `disabled` 표시).
5. SERVER가 아닌 ciTpCd로 접근(직접 URL `/servers/[ciId]`이 다른 타입의 ID를 갖는 경우)하면 안내 카드("이 타입은 추후 지원")로 대체.
6. 백엔드가 `code: NOT_FOUND` 반환 시 토스트 한국어 + 목록 빈 상태 / 상세 404 페이지.
7. `pnpm typecheck && pnpm lint` 통과.
8. 단위 테스트(목록 데이터 변환·필터 직렬화·envelope unwrap·rbac 가드)와 Playwright e2e(로그인→목록→상세 클릭→IP 탭) 통과.

---

## 2. 사용자 시나리오 (RBAC 별)

| 역할 | `/servers` | `/servers/[ciId]` |
|---|---|---|
| USER | 목록·검색·필터·페이징·상세 진입 가능. 등록 버튼 X. | 모든 카드 view 가능. 액션 버튼 X. |
| OPERATOR | USER 권한 + "등록" 버튼 보임(이번 사이클 disabled). | + "편집" 버튼 보임(disabled). |
| ADMIN | OPERATOR 권한 + "폐기" 버튼 보임(disabled). | 동일. |

이번 사이클의 모든 액션 버튼은 disabled — RBAC 가시성과 disabled 상태가 동시에 정착해야 다음 사이클이 깔끔하게 활성만 켠다.

---

## 3. 라우트와 백엔드 매핑

```
GET  /servers                  → server: GET  /api/v1/cis?ciTpCd=SERVER&...
GET  /servers/[ciId]           → server: GET  /api/v1/cis/{ciId}
                                + GET  /api/v1/cis/{ciId}/ips
                                + GET  /api/v1/cis/{ciId}/employees
                                + (Master 이름 resolve용 캐시 hit)
```

모든 호출은 BFF `/api/proxy/api/v1/...` 경유 (`mutator.ts`의 base URL `/api/proxy`).

`apiTpCd=SERVER`는 `/servers` 페이지에서 항상 추가되는 고정 필터. 클라이언트 URL에는 노출하지 않는다 (`?ciNm=&envrnGpCd=&ciStatVal=&page=&size=&sort=` 만 노출).

---

## 4. 아키텍처 단면

### 4.1 데이터 페치 — 서버 컴포넌트가 1차

- `/servers/page.tsx` (서버 컴포넌트): URL searchParams를 받아 BFF mutator로 `GET /cis?...` 호출. Tanstack Query는 **클라이언트 인터랙션**(필터 변경 등)에서만 등장.
- `/servers/[ciId]/page.tsx` (서버 컴포넌트): 단건 + IP + 담당자 3개 호출을 `Promise.all`로 병렬. (Master 이름 resolve도 동일 레벨에서.)
- 클라이언트 인터랙션이 필요한 부분(필터 셀렉트, 페이지 번호 등)은 자식 클라이언트 컴포넌트로 한정.

이유: 첫 페인트가 빠르고, JS 비활성 환경에서도 read-only는 동작. 인터랙션은 URL 변경으로만 처리(초기엔 `<Link href="?page=2">` 형식, 이후 useSearchParams로 발전).

### 4.2 Mutator 강화 — 단일 unwrap 지점

`src/lib/api/mutator.ts`:
```ts
// (의사 코드)
async function apiFetch<T>(url, init) {
  const traceId = crypto.randomUUID();
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', 'X-Trace-Id': traceId, ...init?.headers },
    credentials: 'same-origin',
  });

  const body = res.status === 204 ? undefined : await res.json().catch(() => undefined);

  // 정책: 백엔드는 HTTP 코드와 envelope.error 를 둘 다 사용. 어느 쪽이든 error 가 있으면 throw.
  const envelope = body as Envelope<T> | undefined;
  if (!res.ok || envelope?.error) {
    const err = envelope?.error;
    throw new ApiError(
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? res.statusText,
      err?.traceId ?? traceId,
    );
  }

  // ✅ 여기서 unwrap — 호출부는 inner data 만 받음
  return (envelope?.data ?? null) as T;
}
```

- Orval은 응답을 `void`로 추론하므로(스펙 한계), 호출부는 직접 `apiFetch<MyShape>(...)`로 타입을 좁히거나 도메인 hook 레이어에서 Zod 파싱 결과를 반환한다.
- `X-Trace-Id` 클라이언트 발급 → 응답 헤더 또는 envelope.error.traceId 와 비교해 디버깅에 사용.

### 4.3 응답 런타임 검증 — 좁은 Zod 스키마

OpenAPI에 응답 본문이 없으므로 **이번 사이클에서 사용하는 응답만** Zod 스키마를 둔다 (`src/lib/api/schemas/`):

- `CiListItemSchema` — 목록 행에 필요한 최소 필드.
- `CiDetailSchema` — 단건 + 모든 ciTpCd 데이터(optional union).
- `CiIpItemSchema`, `CiEmployeeItemSchema`.
- `MasterLocationSchema`, `MasterRackSchema`, `MasterVendorSchema`, `MasterEmployeeSchema`.

스키마는 **백엔드 응답 형식이 확정 안 된 부분은 unknown으로 두고 실 응답을 받아 좁힌다**. 첫 호출 후 검증 실패는 dev 콘솔에 명시 (배포에선 로깅).

### 4.4 도메인 hook 레이어

Orval 출력은 그대로 두되 (재생성 시 덮어씀), 그 위에 도메인 hook을 둔다 (`src/components/features/server/hooks.ts`):

```ts
export function useServerList(params: ServerListParams) {
  return useQuery({
    queryKey: ['cis', 'list', params],
    queryFn: () => apiFetch<unknown>(buildUrl(params)).then(CiListResponseSchema.parse),
  });
}
```

목적: Orval이 재생성되어 시그니처가 바뀌어도 도메인 hook이 absorber 역할.

### 4.5 URL state — `usePagedQuery`

`src/hooks/use-paged-query.ts`:
- 입력: 필터 zod 스키마 + 기본값
- 출력: `{ params, set(partial), reset() }`. set은 `router.replace`로 URL 변경.
- 페이지 번호는 1-base UI지만 백엔드 보내기 전 0-base로 변환.

### 4.6 Master 이름 resolver

문제: CI 응답에 `locId`/`rackId`/`vendorId`만 있고 이름 X (가정). 매번 join 호출은 N+1.

해결:
- 5종 master(`locations/racks/vendors/employees/depts`) 중 **상세 페이지에서 실제 참조하는 3종(locations/racks/vendors)** 만 이번 사이클 prefetch. employees는 담당자 탭 호출이 별도라 우선 제외.
- prefetch는 `/servers/[ciId]/page.tsx` 서버 컴포넌트에서 `Promise.all` 안에 함께 (전역 provider 변경 없음).
- Map<id, name>으로 메모이즈해 `useMasterName('rack', id)` hook 노출. 메모이제이션은 React Query의 `select`로.
- 캐시 stale-time = 5분(MVP), invalidation은 추후 master CRUD 사이클에서.
- 양 추산: 렉 수십, 벤더 수십, 위치 수십. `size=200`으로 한 번에. 200 초과 시 §13 위험 항목으로 다룸.

### 4.7 RBAC — `RoleGuard` + 가시성 vs 활성

- `src/lib/auth/rbac.tsx`:
  ```tsx
  type Role = 'ADMIN' | 'OPERATOR' | 'USER';
  function RoleGuard({ role, children, fallback = null }: { role: Role; children: ReactNode; fallback?: ReactNode })
  function useMyRoles(): Role[]
  ```
- 서버 컴포넌트에서 `getMyProfile()` 결과를 prop drill 또는 React 19 `cache()` 헬퍼로 페이지 트리에 전파.
- 구현 원칙: **숨김 vs 비활성 구분**. USER에게는 등록 버튼 자체 미렌더. OPERATOR에게는 렌더하되 disabled (이번 사이클).

### 4.8 ciTpCd 데이터 카드 dispatcher

- `src/components/features/ci/data-cards/dispatcher.tsx`:
  ```tsx
  function CiDataCard({ ci }: { ci: CiDetail }) {
    switch (ci.ciTpCd) {
      case 'SERVER': return <ServerDataCard data={ci.serverData} />;
      case 'APP':
      case 'DB': /* ... */
      default: return <UnsupportedTypeCard ciTpCd={ci.ciTpCd} />;
    }
  }
  ```
- 이번 사이클은 SERVER만 구현. 다른 케이스는 모두 fallback.

### 4.9 에러 매핑

`src/lib/api/error-messages.ts`:
- `Record<ErrorCode, string>` (한국어).
- 표시 채널 분기:
  - 폼 제출/액션 실패 → toast (Sonner).
  - 화면 진입 실패 → 인라인 빈 상태 카드 + traceId 표시.
- 401은 mutator 단에서 throw → 페이지 boundary가 캐치 → 로그인 리다이렉트(이미 middleware가 처리).
- 403은 토스트 + 그대로 머무름.

---

## 5. 컴포넌트 단면

```
/servers/page.tsx                         (서버 컴포넌트)
  └ <ServerListPage searchParams=... />   (이 자체)
     ├ <ServerListFilters />              (클라이언트 — 셀렉트, 검색)
     ├ <ServerListTable rows=... />       (서버 컴포넌트 가능, 행은 <Link>)
     └ <ServerListPagination meta=... />  (클라이언트 — 페이지 변경 버튼)

/servers/[ciId]/page.tsx                  (서버 컴포넌트)
  └ <ServerDetailPage ciId=... />
     ├ <ServerDetailHeader ci=... roles=... />   (액션 버튼은 disabled)
     ├ <CiCommonInfoCard ci=... />
     ├ <CiDataCardDispatcher ci=... />           → <ServerDataCard ... />
     └ <ServerDetailTabs>                        (클라이언트 — 탭 상태)
        ├ <CiIpsTab ciId=... />                  (서버 컴포넌트 또는 Suspense)
        ├ <CiEmployeesTab ciId=... />
        └ (관계/이력/연결맵: 비활성 placeholder)
```

UI 프리미티브 추가 (shadcn primitives):
- `Table` (목록·상세 IP)
- `Select` (필터)
- `Badge` (상태/등급)
- `Tabs` (상세 탭)
- `Skeleton` (로딩)
- `Tooltip` (비활성 사유 안내)

---

## 6. 파일 단위 변경

### 6.1 신규
```
src/app/(app)/servers/page.tsx
src/app/(app)/servers/[ciId]/page.tsx
src/app/(app)/servers/loading.tsx
src/app/(app)/servers/error.tsx
src/app/(app)/servers/[ciId]/not-found.tsx

src/components/features/server/
  list/server-list-table.tsx
  list/server-list-filters.tsx
  list/server-list-pagination.tsx
  list/server-list-columns.ts
  detail/server-detail-header.tsx
  detail/server-data-card.tsx
  detail/ci-common-info-card.tsx
  detail/server-detail-tabs.tsx
  detail/tabs/ips-tab.tsx
  detail/tabs/employees-tab.tsx
  hooks.ts                      # useServerList, useServerDetail, useCiIps, useCiEmployees
  schemas.ts                    # Zod schemas for SERVER-related responses

src/components/features/ci/
  data-cards/dispatcher.tsx
  data-cards/unsupported-type-card.tsx

src/components/ui/
  table.tsx select.tsx badge.tsx tabs.tsx skeleton.tsx tooltip.tsx

src/lib/api/
  schemas/                      # 공유 Zod 스키마
    pagination.ts (page envelope)
    ci.ts (CiListItem, CiDetail)
    ip.ts master.ts employee.ts
  error-messages.ts
  paging.ts                     # parseSearchParams, toBackendPageable

src/lib/auth/
  rbac.tsx                      # RoleGuard, useMyRoles
  roles.ts                      # Role type, hasRole helper

src/hooks/
  use-paged-query.ts

src/lib/master/
  client.ts                     # useMaster(name) — React Query prefetch + cache
  resolver.ts                   # useMasterName('rack', id), formatLocation, etc.

tests/unit/
  paging.test.ts
  rbac.test.tsx
  envelope.test.ts (확장)
  ci-schema.test.ts

tests/e2e/
  server-list.spec.ts
  server-detail.spec.ts
```

### 6.2 수정
```
src/components/layout/sidebar.tsx        # "서버" 메뉴를 활성으로 (disabled 해제)
src/lib/api/mutator.ts                   # envelope 자동 unwrap, X-Trace-Id 주입
src/lib/api/envelope.ts                  # 정리(없으면 유지)
docs/architecture.md                     # §7 변경 이력에 추가, ciTpCd dispatcher 정책 등 결정 기록
```

---

## 7. 데이터 흐름 시퀀스

### 7.1 목록 진입
```
브라우저 GET /servers?ciNm=wms&envrnGpCd=PROD&page=1
  ↓
middleware → 세션 OK → app
  ↓
ServerListPage(searchParams) [서버 컴포넌트]
  ↓
buildBackendPath({ ciTpCd: 'SERVER', ciNm, envrnGpCd, page-1, size, sort })
  ↓
apiFetch<unknown>('/api/proxy/api/v1/cis?...')
  ↓ (BFF)
proxy/[...path]/route.ts → 백엔드 :8080 호출 (Authorization 부착, 401 단일플라이트 refresh)
  ↓
응답 envelope { data: { content[], page{...} }, error: null }
  ↓
mutator unwrap → CiListResponseSchema.parse(...)
  ↓
서버 컴포넌트가 표·페이저로 렌더 (행은 <Link href={`/servers/${ciId}`}>)
```

### 7.2 필터 변경
- 클라이언트 컴포넌트가 URL 갱신 (`router.replace('?ciNm=wms&...')`)
- Next.js 서버 라우트 재실행 → 위 흐름 반복.

### 7.3 상세 진입 (병렬)
```
ServerDetailPage(ciId)
  ↓
Promise.all([
  apiFetch(`/api/v1/cis/${ciId}`)             → CiDetailSchema
  apiFetch(`/api/v1/cis/${ciId}/ips`)         → CiIpsSchema
  apiFetch(`/api/v1/cis/${ciId}/employees`)   → CiEmployeesSchema
  prefetchMasters(['locations','racks','vendors'])
])
  ↓
ciTpCd !== 'SERVER' → <UnsupportedTypeCard /> + 탭 비활성
ciTpCd === 'SERVER' → 카드/탭 렌더
```

---

## 8. 에러 처리

| 발생 시점 | 표시 |
|---|---|
| 401 (proxy 단계 refresh 실패) | 미들웨어/proxy가 세션 정리 후 `/login?next=` redirect |
| 403 | toast "권한이 없습니다." + 페이지 그대로 |
| 404 (`/servers/[ciId]` 단건) | Next.js `not-found.tsx` |
| 500 / 네트워크 | `error.tsx` boundary — "잠시 후 다시 시도" + traceId 표시 |
| 검증 실패 (Zod parse) | dev 콘솔 warn + 사용자에겐 generic 에러. (백엔드가 응답 모양을 바꿨다는 신호) |

`code` 매핑 사전(초안):
```
NOT_FOUND                  → "대상을 찾을 수 없습니다."
VALIDATION_FAILED          → "입력값이 올바르지 않습니다."
CONFLICT_DUPLICATE         → "이미 존재하는 항목입니다."
AUTH_INVALID_CREDENTIALS   → "아이디 또는 비밀번호가 올바르지 않습니다."
AUTH_REFRESH_EXPIRED       → "세션이 만료되었습니다. 다시 로그인하세요."
(default)                  → "요청을 처리하지 못했습니다." + traceId
```

---

## 9. 테스트

- **unit (Vitest)**
  - `paging.ts`: searchParams ↔ Pageable 양방향 변환, 1-base ↔ 0-base.
  - `rbac.tsx`: `<RoleGuard>` 가시성, `hasRole`.
  - `mutator.ts` envelope unwrap (성공/실패/네트워크/204).
  - Zod 스키마 (대표 케이스: 누락 필드 / 미상 ciTpCd / 빈 배열).
- **integration (RTL)**
  - `<ServerListTable>` 렌더 — 빈 상태 / 데이터 / 페이지네이션 클릭이 URL 변경 콜백 호출.
  - `<ServerDetailTabs>` 비활성 탭 클릭 무반응 + tooltip "추후 지원".
- **e2e (Playwright)**
  - 로그인 → `/servers` → 검색어 입력 → URL 변경 → 결과 표시.
  - 행 클릭 → 상세 → IP 탭 데이터 확인.
  - USER 계정으로 진입 시 "+ 등록" 버튼 미존재.
- **수동 RBAC 점검** (3 계정으로 한 번씩)

---

## 10. 백엔드 협의 필요사항

후속 사이클을 위해 별도 티켓으로 정리해 백엔드 팀에 전달:
1. **CI 목록 필터 추가**: `locId`(또는 `locSiteNm`), `grdCd`, `ciBizwrkNm` like 검색.
2. **OpenAPI 응답 schema 명시**: 현재 2xx 응답이 모두 정의되지 않아 클라이언트가 Zod로 보강 중. 응답 DTO를 OpenAPI에 노출하면 Orval 타입이 채워진다.
3. **CI 상세 응답에 master 이름 임베드 여부**: `locNm`, `rackLocCd` 같은 비정규화 필드를 응답에 포함하면 클라이언트의 master prefetch 부담이 줄어든다. 미포함이면 현재 설계의 prefetch 캐시로 흡수.
4. **DNS / App / DB 연결 / License 도메인**: 프로토타입의 상세 탭 5종 중 cid-api에 없는 도메인이 다수. 신규 도메인 추가 vs 사이드바에서 제거 결정.
5. **헬스체크/마지막 체크**: cid-api에 없는 라이브니스. 별도 모니터링 시스템 연동 vs 표시 안 함.

---

## 11. 의도된 deviation (프로토타입 ↔ 구현)

| 프로토타입 | 구현 | 사유 |
|---|---|---|
| 필터 5종 (업무영역/위치/OS/등급/상태) | 검색(ciNm)·환경·상태 | 백엔드 필터 미지원 — §10 으로 이관 |
| 상태(온라인/오프라인) | `ciStatVal`(운영중/폐기 등) | cid-api에 라이브니스 없음. 의미 다름 명시. |
| 상세 탭 6종 | IP·담당자만 (이번) + 비활성 탭 표시 | 도메인 부재(DNS/App/DB/License) 또는 다음 사이클 |
| 연결 맵 mini-topology | 다음 사이클 | 관계 카드와 함께 |
| Export/Import | 다음 사이클 이후 | 백엔드 엔드포인트 부재 |

이번 사이클에서 발생하는 결정은 `docs/architecture.md` §7에 변경 이력으로 추가.

---

## 12. 환경/의존성 변화

- 신규 dependency 후보: `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `@radix-ui/react-select` (shadcn primitives 추가 시).
- 신규 환경변수 없음.
- `pnpm gen:api`는 본 스펙 작성 시점에 한 번 실행되어 `src/api/generated/`에 endpoints 추가(ci/ip/master/relations/subnet/history).

---

## 13. 위험과 완화

| 위험 | 완화 |
|---|---|
| 응답 스키마가 OpenAPI에 없어 추측 | Zod 스키마를 좁게, 첫 호출에 검증 실패 로깅. 빠르게 갱신. |
| Master prefetch 양 추산 실패 | 1차에 size=200으로 받아보고 큰 master는 나중에 search-as-you-type로 전환. |
| URL state hook의 stringify/parse 일관성 | Zod로 양방향 직렬화 테스트 강제. |
| RBAC 분기 누락 | unit + e2e USER 계정 테스트로 안전망. |

---

## 14. 다음 사이클로 넘어갈 산출물 (이 사이클이 끝났을 때)

- 횡단 기반(mutator/Zod/URL state/RoleGuard/master resolver/dispatcher)이 정착되어 다음 도메인은 거의 그대로 재사용.
- 사이드바의 "서버" 활성화 1번 등록.
- 백엔드 협의 티켓 5종(§10).

---

## 15. 변경 이력

- 2026-05-07: 초안 (브레인스토밍 세션 #2 산출물)
