# cid-web Architecture Decision Record (ADR)

> 이 문서는 `cid-web` (CMDB Next.js 프론트엔드) 의 핵심 아키텍처 결정을 기록한다.
> CLAUDE.md 와 충돌 시 **이 문서가 우선**한다 (CLAUDE.md §11 참조).
> 변경 시 `## 변경 이력` 섹션에 추가하고, 영향받는 ADR 항목을 갱신한다.

---

## 0. 배포 컨텍스트

- **노출 범위**: 인터넷에 공개되는 사내 도구 (재택/외부에서 접근 가능). 임직원만 LDAP 로그인으로 진입.
- **이중화**: 다중 인스턴스(HA) 배포 전제. 인스턴스별 메모리/디스크 세션 금지 — **stateless 세션 인코딩** 필수.
- **TLS**: 프로덕션 필수.
- **백엔드 리포**: 별도. 본 프론트엔드 리포에서 수정하지 않음.
- **백엔드 API**: Spring Boot, `cid-api` v1, base URL `http://localhost:8080` (개발 시).

---

## 1. 인증 아키텍처

### 결정
**Full BFF (Backend-for-Frontend) 패턴**. 모든 API 호출은 Next.js Route Handler 를 거쳐 Spring 으로 프록시되며, 토큰은 `iron-session` 으로 암호화된 **httpOnly + Secure + SameSite=Lax 쿠키 (`cid_session`)** 에만 보관된다. 브라우저 JavaScript 에는 access/refresh 토큰이 절대 노출되지 않는다.

### 백엔드 인증 계약 (불변)

| 엔드포인트 | 메서드 | 요청 | 응답 |
|---|---|---|---|
| `/api/v1/auth/login` | POST | `{ username, password }` | `TokenResponse` |
| `/api/v1/auth/refresh` | POST | `{ refreshToken }` | `TokenResponse` |
| `/api/v1/me` | GET | `Authorization: Bearer <access>` | `MyProfileResponse` |

> **로그아웃 엔드포인트 부재 (2026-04-26 확인)**: 백엔드 OpenAPI v1 스펙에 `/api/v1/auth/logout` 가 없다. 프론트 `POST /api/auth/logout` 은 **백엔드 호출 없이 `cid_session` 쿠키 제거만** 수행한다. refresh 토큰 서버측 무효화는 백엔드가 엔드포인트를 추가하면 §8 TBD 항목으로 갱신.

```ts
TokenResponse = {
  accessToken: string;
  accessTokenExpiresIn: number;   // seconds (백엔드 정책, TBD)
  refreshToken: string;
  refreshTokenExpiresIn: number;  // seconds (백엔드 정책, TBD)
  tokenType: 'Bearer';
}
```

모든 응답은 envelope `{ data: T, error: { code, message, traceId } | null }` 로 감싸짐.

### 프론트엔드 BFF 라우트

| 경로 | 역할 |
|---|---|
| `POST /api/auth/login` | 백엔드 `/auth/login` 호출 → `TokenResponse` 받아 `cid_session` 쿠키로 암호화/발행. 응답 body 에 토큰 미포함. |
| `POST /api/auth/logout` | `cid_session` 쿠키 제거. (백엔드 logout 엔드포인트 부재 — 위 §1 참고) |
| `ALL  /api/proxy/[...path]` | 임의의 백엔드 호출 프록시. 쿠키에서 access 꺼내 `Authorization` 헤더 부착. 백엔드 401 시 서버측 single-flight refresh 1회 시도 → 재호출 + 쿠키 회전. refresh 실패 시 쿠키 제거 후 401 반환. |
| `GET  /api/health` | 로드밸런서 헬스체크 (단순 200). |

### 세션 쿠키 정책

| 항목 | 값 |
|---|---|
| 이름 | `cid_session` (env 로 오버라이드 가능) |
| 속성 | `HttpOnly; Secure; SameSite=Lax; Path=/` |
| 페이로드 | `iron-session` 으로 암호화된 `TokenResponse` 전체 |
| `Max-Age` | "로그인 상태 유지" **체크 시** = `refreshTokenExpiresIn`, **체크 해제 시** = 미설정(세션 쿠키, 브라우저 종료 시 소멸) |
| 갱신 | 프록시가 refresh 회전 성공 시 동일 쿠키 다시 set (Max-Age 정책 유지) |

### 미들웨어 (`src/middleware.ts`)

- `(app)` 그룹 라우트 진입 시 `cid_session` 쿠키를 읽어 **iron-session 으로 복호화 시도** (Edge runtime, 백엔드 호출 없음, 매우 가벼움).
- 쿠키 미존재 / 복호화 실패 / 빈 세션 → `/login?next=<원래경로>` 로 302.
- **토큰 만료/리프레시 검사는 하지 않음**. access 토큰의 실제 유효성은 다음 API 호출 시 백엔드 응답(401)을 보고 프록시가 single-flight refresh 로 처리. 미들웨어가 백엔드 왕복을 일으키지 않는 것이 HA 와 응답성에 중요.

### HA 고려사항

- `SESSION_SECRET` 은 모든 Next.js 인스턴스가 동일 값 공유 (env 주입).
- `iron-session` 의 multi-secret 배열 형식으로 무중단 시크릿 회전 가능 (MVP 엔 단일 시크릿).
- Refresh single-flight 는 인스턴스 내 메모리 promise 캐시. 인스턴스 간 동시 refresh 발생 가능하지만 백엔드가 각각 새 토큰을 발급 → 마지막에 쓰여진 쿠키가 유효 (last-write-wins). 양성(benign).
- BFF 코드 어디에도 사용자별 in-memory 캐시를 두지 않는다.

### 거부된 대안

- **Hybrid (access in JS memory, refresh in cookie)**: access 토큰이 XSS 노출 윈도우를 가짐. 외부 노출 환경에서 부적합.
- **No BFF (모두 브라우저 보관)**: localStorage/메모리 토큰. 외부 노출 + 사내 인프라 데이터에 보안 부적합.

### 영향
- 모든 클라이언트 API 호출은 **상대 경로**로 `/api/proxy/...` 만 사용. 직접 `:8080` 호출 금지.
- 서버 컴포넌트는 `cookies()` 로 세션 읽어 직접 백엔드 호출 가능 (또는 같은 프록시 사용).
- 응답 envelope unwrap 은 단일 지점(Orval mutator) 에서 처리.

---

## 2. 로그인 폼 스코프 (MVP)

### 결정
- **LDAP 단일 폼만** 노출. 프로토타입의 "로컬 계정" 탭은 **MVP 에서 제거** (백엔드에 대응 엔드포인트 없음).
- 프로토타입의 "LDAP 서버" 드롭다운은 **숨김** (백엔드 `LoginRequest` 스키마에 슬롯 없음).
- "로그인 상태 유지" 체크박스는 **유지** (위 §1 쿠키 maxAge 정책과 연결).

### 프로토타입과의 차이 (의도된 deviation)
| 프로토타입 | MVP 구현 | 사유 |
|---|---|---|
| 두 탭 (로컬/LDAP) | LDAP 단일 폼 | 로컬 로그인 백엔드 미구현 — 동작 안 하는 UI 노출 금지 |
| LDAP 서버 드롭다운 | 숨김 | API 스키마에 서버 선택 필드 없음 |
| 폼 디자인 (그라디언트 배경, 카드, 한국어 라벨) | 그대로 유지 | 비주얼 진실 공급원 |

향후 백엔드가 로컬 로그인/서버 선택을 지원하면 본 ADR 갱신 후 UI 복원.

---

## 3. API 타입 생성

### 결정
- **도구**: **Orval** (React Query 훅 + 타입 + Zod 스키마 동시 생성).
- **mutator**: 커스텀 fetcher 를 작성해 모든 호출이 `/api/proxy/...` 로 가도록 라우팅하고, 응답 envelope `{ data, error }` 를 자동 unwrap. `error` 가 non-null 이면 throw 하여 React Query 의 `onError` 로 전달.
- **출력 디렉토리**: `src/api/generated/` — **git 에 커밋**.
- **수동 수정 금지**. 변경은 백엔드 스펙 갱신 → `pnpm gen:api` 로만.

### 커밋 사유
- 백엔드 리포 분리 → CI/onboarding 시점에 백엔드 OpenAPI 스펙 접근 보장 없음. 커밋이 자족적.
- API 계약 변경이 PR diff 로 보임 → 코드 리뷰가 호환성 문제를 잡을 수 있음.
- MVP 단계엔 결정성(reproducibility)이 자동화보다 우선.

### 향후 가드 (MVP 후)
- pre-push 또는 CI 단계: `pnpm gen:api && git diff --exit-code src/api/generated` 로 stale 검증.

---

## 4. 디자인 시스템

### 결정
- **shadcn/ui + Tailwind CSS**. 컴포넌트 구조는 shadcn 채택, **테마 토큰만 Ant Design 5.x 컬러로 오버라이드**.
- 프로토타입은 antd 5.12.8 의 reset.css 를 import 하고 antd 의 표준 컬러 팔레트(primary `#1890ff`, success `#52c41a`, warning `#faad14`, error `#ff4d4f`, sidebar `#001529`)를 그대로 사용함을 확인.

### 컬러 토큰 (CSS 변수, HSL)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 15%;
  --primary: 209 100% 55%;            /* #1890ff */
  --primary-foreground: 0 0% 100%;
  --destructive: 359 100% 65%;        /* #ff4d4f */
  --success: 100 75% 44%;             /* #52c41a */
  --warning: 39 100% 53%;             /* #faad14 */
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 55%;       /* #8c8c8c */
  --border: 0 0% 85%;                 /* #d9d9d9 */
  --ring: 209 100% 55%;
  --radius: 0.5rem;                   /* 8px 기본 */

  /* sidebar 전용 */
  --sidebar-background: 209 100% 8%;  /* #001529 */
  --sidebar-foreground: 0 0% 100%;
  --sidebar-primary: 209 100% 55%;
}
```

### 기타 토큰
- **Radii**: `xs=4, sm=6, DEFAULT=8, lg=12` (Tailwind `borderRadius` 확장)
- **Shadows**: `card: 0 1px 3px rgb(0 0 0 / 0.08)`, `dropdown: 0 4px 12px rgb(0 0 0 / 0.1)`, `modal: 0 8px 32px rgb(0 0 0 / 0.2)`
- **Spacing**: Tailwind 기본 4px 단위 그대로 (프로토타입과 일치)
- **Font**: 시스템 폰트 스택만 사용. 별도 웹폰트 import 안 함.

### MVP 도입 컴포넌트 (shadcn primitives)
`Button`, `Input`, `Label`, `Form`, `Checkbox`, `Card`, `Toast` (Sonner), `Alert`. 나머지(Table, Dialog, Tabs, DataTable 등)는 화면 추가 시점에 점진 도입.

---

## 5. 프로젝트 구조

### 결정

```
src/
├── app/
│   ├── (auth)/                       # 비인증 라우트 그룹
│   │   ├── layout.tsx                # 그라디언트 풀스크린 레이아웃
│   │   └── login/page.tsx
│   ├── (app)/                        # 인증 필요 라우트 그룹
│   │   ├── layout.tsx                # AppShell (Sidebar + Header)
│   │   └── page.tsx                  # / → 대시보드 (MVP placeholder)
│   └── api/                          # BFF Route Handlers (Node runtime)
│       ├── auth/{login,logout}/route.ts
│       ├── proxy/[...path]/route.ts
│       └── health/route.ts
├── api/generated/                    # Orval 출력 (커밋)
├── components/
│   ├── ui/                           # shadcn primitives
│   ├── layout/                       # AppShell, Sidebar, Header, UserMenu
│   └── features/auth/                # LoginForm, schema.ts, useLogout
├── lib/
│   ├── api/{client,envelope,query-client}.ts
│   ├── auth/{session,server,refresh}.ts
│   └── utils.ts
├── hooks/
├── types/
└── middleware.ts
```

### 원칙
- **Feature-first** (`components/features/<domain>/`) — 각 도메인이 독립 단위.
- **Layer-first for `lib/`** (`lib/api/`, `lib/auth/`, `lib/utils.ts`) — 횡단 관심사.
- **서버 전용 코드** 는 `lib/auth/server.ts` 처럼 `server-only` import 또는 `'server-only'` 패키지로 클라이언트 번들 누설 방지.
- 새 폴더는 위 구조에 위치를 찾을 수 있는지 먼저 검증 (CLAUDE.md §3).

### 미들웨어
- `src/middleware.ts` — `(app)` 보호. 쿠키 존재만 확인. 미존재/복호화 실패 → `/login?next=<원래>`.

---

## 6. 개발 환경

### CORS
- **불필요**. 브라우저는 항상 same-origin Next.js 만 호출 (`/api/proxy/...`). 백엔드는 server-to-server 호출만 받음.
- 예외: `pnpm gen:api` 가 백엔드 `/v3/api-docs` 를 직접 fetch — 개발자 머신 1회성, 문제 없음.

### 환경변수

| 키 | 가시성 | 예시 | 용도 |
|---|---|---|---|
| `BACKEND_API_URL` | server-only | `http://localhost:8080` | BFF → 백엔드 base URL |
| `SESSION_SECRET` | server-only | `<최소 32자 랜덤; 권장 64자 hex>` | iron-session 쿠키 암호화 시크릿 (라이브러리 요구 최소 길이 32자) |
| `SESSION_COOKIE_NAME` | server-only | `cid_session` | (선택) 쿠키 이름 |
| `NEXT_PUBLIC_APP_NAME` | client-bundle 노출 | `CMDB` | 브랜딩 등 비민감값만 |

### 원칙
- **`NEXT_PUBLIC_*` 에 토큰/시크릿/내부 URL 절대 금지**. 클라이언트 번들에 포함됨 (CLAUDE.md §9).
- `.env.local` 은 커밋 금지, `.env.example` 은 키 목록만 (실제 값 없이) 커밋.

### 헬스체크
- `GET /api/health` — 단순 `200 OK` (DB/외부 의존성 검사 없음). 로드밸런서가 인스턴스 스왑 판단용으로 사용.

---

## 7. 변경 이력

- **2026-04-25**: 초안. §0~§6 결정 (브레인스토밍 세션 1).
- **2026-04-26**: 백엔드 OpenAPI 스펙에 `/api/v1/auth/logout` 부재 확인. §1 의 백엔드 인증 계약 표 및 BFF 라우트 표 갱신 — 프론트 logout 은 쿠키 제거만 수행.
- **2026-05-07**: 첫 도메인 사이클 — `/servers` 목록·상세 read-only 출시. 횡단 기반 정착: mutator envelope auto-unwrap + X-Trace-Id, server-side fetch helper, error code → 한국어 매핑, paging/url-filter hooks, RBAC primitives (`hasRole`, `RoleGuard`), master prefetch + format helpers, ciTpCd 데이터 카드 dispatcher. 의도된 deviation 5건 (필터 5종 → 3종, 상태 의미 차이, 상세 탭 6종 → 2종 + 비활성 placeholder, 연결 맵/Export 다음 사이클로) 기록.
- **2026-05-07 (cycle #2)**: 서버 쓰기 사이클 — 등록·편집·폐기 출시. X-Change-Reason 헤더 옵션을 mutator/serverFetch에 추가. RHF + zodResolver 기반 폼 패턴 정착(`components/forms/*` 일반 wrapper, `features/server/forms/sections/*` 5개 섹션). DecommissionDialog로 폐기 사유(reason) 5자 이상 강제. RBAC: 등록·편집은 OPERATOR+, 폐기는 ADMIN-only. USER가 URL로 우회 진입 시 페이지 단에서 redirect.
- **2026-05-08 (cycle #3)**: Master CRUD 3종 — 렉/벤더/담당자. 모달 기반 등록/편집 패턴 정착(`features/master/shared/master-form-dialog.tsx`). vendor·employee의 useYn 활성 토글 (ADMIN-only 편집, 모든 사용자 "비활성 포함" 토글). 렉은 비활성 개념 자체 없음 (백엔드 UpdateRackRequest에 useYn 부재). DEPT prefetch 추가 (`getDeptsMap`).
- **2026-05-08**: RBAC 완화 — 서버 폐기 / 벤더·담당자 활성 토글을 ADMIN-only → OPERATOR+로 변경. 운영 정책상 OPERATOR도 일상 폐기/활성화를 수행하는 것이 더 자연스러움. ADMIN 전용은 (현재 시점) 없음.
- **2026-05-08 (cycle #8)**: 트리 master 패턴 정착 — `<TreeView>` + `<TreeSelectField>` + `buildTree()` 신규. 위치(평탄) + 부서(자기참조 트리) CRUD. DEPT 편집 시 자기 자신·자손은 부모로 선택 불가 (사이클 방지). 사이클 #4 (Subnet 트리)가 동일 컴포넌트 그대로 재사용 예정.
- **2026-05-08 (cycle #4)**: IP 대역 (Subnet) 트리 — DEPT (#8)의 트리 패턴을 그대로 재사용. 클라이언트 측 CIDR/설명 검색 (백엔드 GET /subnets는 필터 파라미터 부재). CIDR Zod regex 간단 검증.
- **2026-05-08 (cycle #5)**: IP CRUD — CI 상세의 IP 탭에 등록/편집/회수 액션 추가. cid-api에 `GET /ips` 부재로 글로벌 `/ip` 페이지는 보류. Subnet은 TreeSelectField로 선택. PATCH `unassignCi=true` 로 회수.
- **2026-05-08 (cycle #6)**: 서버 관계 — read + 단건 추가/삭제. 양방향 표시(forward/backward 두 섹션). Diff sync PUT은 follow-up 사이클에서 (전체 일괄 편집 UI). 백엔드 응답 형태 미상이라 Zod union으로 두 모양(`{forward,backward}` vs flat array) 모두 수용.
- **2026-05-08 (cycle #7)**: CI 이력 — Envers 기반 revision timeline + 클릭 시 시점 스냅샷. revType 응답이 enum string 또는 0/1/2 정수 두 형태일 가능성 → Zod union으로 모두 수용. snapshot 응답은 CiDetail의 부분집합 가정 + passthrough.

---

## 8. TBD (백엔드 팀에 확인 필요)

- `accessTokenExpiresIn`, `refreshTokenExpiresIn` 의 실제 값 (분 vs 시간 vs 일).
- "로컬 계정" 로그인 엔드포인트 향후 추가 일정.
- LDAP 서버 다중화 지원 일정.
- 로그아웃 시 refresh 토큰 서버측 무효화 엔드포인트 추가 일정. (현재 프론트는 쿠키 제거만 — refresh 토큰이 만료 전까지 백엔드에서 재사용 가능)

---

## 9. ciTpCd 데이터 카드 정책 (2026-05-07)

CI 상세 페이지는 `ciTpCd` 별로 **다른 확장 데이터 카드**를 렌더한다. 디스패치 컴포넌트(`src/components/features/ci/data-cards/dispatcher.tsx`)가 단일 진입점이며, 새로운 ciTpCd 지원은 새 카드 추가 + dispatcher case 한 줄로 끝난다. 미지원 타입은 `<UnsupportedTypeCard />`로 폴백한다 — 빈 화면 노출 금지.
