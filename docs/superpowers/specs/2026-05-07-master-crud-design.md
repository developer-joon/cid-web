# Master CRUD (렉 / 벤더 / 담당자) — 설계 문서

> 세 번째 도메인 사이클. 단일 master 엔티티 3종을 같은 패턴으로 한 번에 정착시켜, 후속 master 사이클(LOCATION / DEPT — 트리 master)이 그대로 재사용할 수 있게 한다.

- 작성일: 2026-05-07
- 선결: 사이클 #2 머지된 상태 (auth, server read+write, 횡단 기반)
- 관련: ADR §5, gap §4 (master 메뉴 활성), gap §1.2 (master 이름 임베드)

---

## 1. 목표와 범위

### 1.1 한 줄 정의

cid-api `/master/{racks,vendors,employees}`를 활성 사이드바 메뉴 3개로 노출. 각 메뉴는 **목록 + 검색/필터 + 페이징 + 모달 형식의 등록·편집 + (vendor/employee의 경우) 활성화 토글**을 제공.

### 1.2 In Scope

- **3개 라우트**: `/rack`, `/vendor`, `/contact` (현 사이드바 경로 유지). 모두 `(app)` 그룹.
- **목록 페이지**: 검색·필터·페이징·테이블·"+ 등록" 버튼.
- **모달 등록/편집**: 별도 페이지 없이 `Dialog` 안에서 폼. 대상 master는 필드 수가 적음(3~6개)이라 모달이 자연스러움.
- **활성화 토글** (vendor/employee/dept만): "비활성 포함" 토글로 USE_YN=N 행도 보기. 편집 모달 안에 useYn 토글 ADMIN-only.
- **rack 비활성 토글 없음** (백엔드 UpdateRackRequest에 useYn 필드 부재 확인).
- **횡단 기반 (이번 사이클이 새로 도입)**:
  - `lib/api/schemas/` 확장: list/detail page 스키마 + Update/Register 스키마는 generated 사용.
  - Master mutation hook 패턴: `useCreateMaster`, `useUpdateMaster`, `useToggleMasterActive` (resource 별 caller).
  - `MasterListShell` — 공통 카드 + 툴바 + 테이블 + 페이지네이션 셸.
  - `MasterFormDialog` — 공통 모달 wrapper (제목/저장/취소).
  - DEPT 새 master prefetch 추가 (`getDeptsMap`).
  - `useUrlFilters` 재사용.
- **권한**: 목록·검색은 USER+. 등록·편집은 OPERATOR+. useYn 토글 (= 사실상 비활성화)은 ADMIN only.

### 1.3 Out of Scope

- 트리 master (LOCATION / DEPT — 사이클 #8) — 이번 사이클은 DEPT의 read-only 셀렉트만 (employee form에서 사용).
- master history (이력 — 사이클 #7).
- master에 연결된 CI 목록 보기 (역참조) — 후일.
- bulk 등록.
- inline edit (테이블 셀 직접 수정) — 모달이 일관성 있음.

### 1.4 성공 기준

1. USER가 `/rack`/`/vendor`/`/contact` 진입 → 목록·검색·페이징 정상.
2. OPERATOR가 "+ 등록" 클릭 → 모달 → 저장 → 목록 갱신, 토스트.
3. OPERATOR가 행 클릭(또는 "편집" 액션) → 편집 모달 → 저장 → 목록 갱신.
4. ADMIN이 vendor/employee 편집 모달에서 "활성" 체크 해제 → 저장 → 목록의 useYn 표시 갱신.
5. USER에게는 "+ 등록" 버튼 미표시. OPERATOR에게는 useYn 토글 미표시.
6. 모든 사이드바 메뉴 활성화: 인프라 > 렉, 자산 > 벤더, 자산 > 담당자.
7. lint · typecheck · test · build 통과.

---

## 2. 라우트 ↔ 백엔드 매핑

| 라우트 | 백엔드 endpoints |
|---|---|
| `GET /rack` | `GET /api/v1/master/racks?locId=&rackLocCdLike=&page=&size=&sort=` |
| modal create | `POST /api/v1/master/racks` |
| modal edit | `PATCH /api/v1/master/racks/{rackId}` |
| `GET /vendor` | `GET /api/v1/master/vendors?vendorNmLike=&vendorTpCd=&useYn=&page=&size=&sort=` |
| modal | `POST /api/v1/master/vendors`, `PATCH /api/v1/master/vendors/{vendorId}` |
| `GET /contact` | `GET /api/v1/master/employees?empNmLike=&worldIdLike=&deptId=&useYn=&page=&size=&sort=` |
| modal | `POST /api/v1/master/employees`, `PATCH /api/v1/master/employees/{empId}` |
| dept select | `GET /api/v1/master/depts?page=0&size=200` (서버 컴포넌트 prefetch) |

---

## 3. 아키텍처 단면

### 3.1 Master config 패턴

각 master 도메인은 동일한 모양의 "config + components + hooks"를 가진다. 통일을 위해 config 객체를 두기보다는, **각 master 폴더가 같은 모듈 이름을 export**하는 *컨벤션* 으로 강제한다 (다형성 abstraction이 어려운 zod schema 때문).

```
components/features/master/
├ shared/
│  ├ master-list-shell.tsx          # CardHeader + Toolbar slot + TableSlot + Pagination
│  ├ master-form-dialog.tsx         # Dialog 래퍼 (title, footer Save/Cancel)
│  ├ use-master-mutations.ts        # generic factory: useCreate/useUpdate hooks per resource
│  └ active-toggle-filter.tsx       # "비활성 포함" 토글 (UrlFilters 'useYn' driving)
├ rack/
│  ├ schema.ts                      # zod: Rack list item, form schema, payload converters
│  ├ columns.ts                     # ColumnDef[]
│  ├ rack-table.tsx                 # 테이블 (server component)
│  ├ rack-filters.tsx               # 'use client'
│  ├ rack-form-fields.tsx           # 'use client' — 모달 안에 들어가는 RHF 필드
│  ├ rack-create-dialog.tsx         # 'use client'
│  └ rack-edit-dialog.tsx           # 'use client'
├ vendor/                           # 동상
└ employee/                         # 동상
```

각 도메인의 `*-create-dialog.tsx`/`*-edit-dialog.tsx` 안쪽에서 form 상태를 관리하고 mutation hook 호출.

### 3.2 비활성 토글 정책

- Vendor / Employee 목록의 기본 필터: `useYn=Y`.
- 사용자가 "비활성 포함" 체크 → URL에 `useYn` 파라미터 제거 → 백엔드는 모두 반환.
- 편집 모달에 `useYn` 토글 (ADMIN gated) — Y/N 변경 가능.
- Rack는 활성/비활성 개념 자체가 없음 — 토글 비표시.

### 3.3 등록·편집 모달 vs 별도 페이지

- 모달 — master는 필드 적음(3~6개), 행 클릭으로 즉시 편집이 자연스러움.
- 별도 페이지 — server (CI)처럼 필드 많을 때.

이번 사이클은 모달. 모달 열림 상태는 클라이언트 컴포넌트가 관리, 행 클릭이 trigger.

### 3.4 Mutation 캐시 무효화

각 master mutation 후 `['master', resource, 'list']`만 invalidate. 다른 master 캐시는 영향 없음. 단, **렉 추가 후 server form의 rack select가 새 값을 반영하려면** `['master', 'racks']` invalidate 필요 — 우선 server form 진입 시 재조회되므로 무시 가능 (server component prefetch).

### 3.5 Form 패턴

cycle #2의 `components/forms/` wrapper 그대로 재사용:
- `<TextField>`, `<SelectField>`, `<MasterSelectField>` (employee의 deptId), `<YnField>` (활성 토글).

---

## 4. 컴포넌트 단면 — Rack 예시 (vendor/employee 동일 패턴)

```
/(app)/rack/page.tsx                    # Server Component
  ↓ master prefetch (locations for filter + form select), profile
  └ <RackListShell ...>
     ├ <RackFilters />                  # 'use client' (locId select + name search)
     ├ <RackTable rows={...} />          # server-rendered rows + edit-action button (client)
     └ <RackPagination meta={...} />    # reuse from server-list (or generic version)

components/features/master/rack/
├ rack-edit-action.tsx                  # 'use client' — table 안 행마다 노출되는 작은 버튼이 모달 trigger
└ rack-create-dialog.tsx, rack-edit-dialog.tsx — 모달
```

---

## 5. 파일 변경 (요약)

신규:
```
src/lib/master/server.ts                # ADD: getDeptsMap (이미 패턴 있음)
src/lib/api/schemas/master.ts           # EXTEND: Dept, RacksPage(이미), Vendors(이미), Employees + page schemas
src/components/features/master/shared/  # 4 files
src/components/features/master/rack/    # 7 files
src/components/features/master/vendor/  # 7 files
src/components/features/master/employee/# 7 files
src/app/(app)/rack/page.tsx
src/app/(app)/vendor/page.tsx
src/app/(app)/contact/page.tsx
tests/unit/lib/api/schemas/master.test.ts
tests/e2e/master.spec.ts
docs/architecture.md                    # MODIFY §7
docs/api-gaps-and-improvements.md       # MODIFY
```

수정:
```
src/components/layout/sidebar.tsx       # 인프라>렉, 자산>벤더, 자산>담당자 활성
```

---

## 6. 의도된 deviation

| 프로토타입 | 구현 | 사유 |
|---|---|---|
| 별도 등록 페이지 (vendor.html 등) | 모달 | 필드 적음 — 모달이 자연스러움 |
| 행 hard delete | 비활성 토글 (vendor/employee) / 미지원 (rack) | 백엔드 정책 — 마스터는 USE_YN=N. rack는 useYn 자체 없음 (CI 참조 무결성 위해 hard reference) |

---

## 7. 위험과 완화

| 위험 | 완화 |
|---|---|
| Rack hard reference (CI가 참조 중인 rack 삭제 시도) | UI에선 삭제 자체 미제공 — 안전 |
| Employee의 deptId가 트리 구조 — 평면 select로 깊이 표현 어려움 | DEPT를 평면화해 표시 (dept name only). 트리 select는 사이클 #8 |
| Vendor "비활성"이 useYn=N으로 soft delete — 검색에서 누락되는 사용자 혼란 | 기본 활성만, 토글로 모두 보기 + UI 표시(badge "비활성") |

---

## 8. 변경 이력

- 2026-05-07: 초안
