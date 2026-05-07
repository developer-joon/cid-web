# cid-web 서버(SERVER CI) 등록·편집·폐기 — 설계 문서

> 두 번째 도메인 사이클. 사이클 #1(서버 read-only)이 깔아둔 횡단 기반을 그대로 재사용하면서 **쓰기 경로**(등록 / 편집 / 폐기)를 추가한다. 이 사이클이 끝나면 후속 도메인의 쓰기 사이클은 같은 폼 패턴 + Master 셀렉트 + X-Change-Reason 패턴을 그대로 가져다 쓴다.

- 대상 브랜치: 현 `feat/auth-mvp-bootstrap` 위에 직접 (또는 user 결정으로 분기)
- 선결: 사이클 #1 완료 (이미 머지된 상태)
- 작성일: 2026-05-07
- 관련: ADR §1·§3·§5·§9, gap 문서 §9.1·§9.2

---

## 1. 목표와 범위

### 1.1 한 줄 정의

`/servers/new` (등록), `/servers/[ciId]/edit` (편집), 그리고 상세 헤더의 "폐기" 버튼(다이얼로그)을 출시한다. cid-api `POST /cis`, `PATCH /cis/{id}`, `POST /cis/{id}/decommission` 호출. 모든 요청에 `X-Change-Reason` 헤더 부착.

### 1.2 In Scope

- **등록 페이지** `/servers/new` — `ciTpCd=SERVER` 고정. CI 공통 필드 + serverData 필드 폼.
- **편집 페이지** `/servers/[ciId]/edit` — 단건 prefetch → 폼 prefill → PATCH 전송 시 변경된 필드만 (또는 PATCH는 전체 보내도 무방).
- **폐기 다이얼로그** — 상세 헤더의 "폐기" 버튼이 활성. 클릭 → 확인 다이얼로그(reason 텍스트박스 + 경고). 확인 시 POST decommission.
- **변경 사유 입력** — 모든 쓰기 폼 하단에 "변경 사유" 텍스트박스. 입력 시 `X-Change-Reason` 헤더로 백엔드에 전달. 미입력 허용(헤더 미부착).
- **횡단 기반 (이번 사이클이 새로 도입)**:
  - `X-Change-Reason` 헤더 주입 — `apiFetch` (mutator) + `serverFetch` 양쪽에 옵션으로 받기.
  - Mutation hook 패턴 — `useCreateServer`, `useUpdateServer`, `useDecommissionServer` (TanStack Query). Cache invalidation 단일 지점 정의.
  - **Form**: React Hook Form + Zod resolver. 폼 schema는 `features/server/forms/schema.ts`로 분리.
  - **Master 셀렉트** 공용 컴포넌트 — LOCATION / RACK / VENDOR (이번 사이클은 form에서만 사용). 페이지 진입 시 prefetch한 Map을 props로 받음. Search-as-you-type은 다음 사이클로.
  - 폼 필드 헬퍼 — `<FormSection>`, `<TextField>`, `<NumberField>`, `<SelectField>`, `<YnField>`, `<DateField>` (RHF wrappers).

### 1.3 Out of Scope (다음 사이클로)

- 다른 ciTpCd (APP/DB/NETWORK 등) 등록·편집 — 이번 사이클은 SERVER 한정.
- 일괄(Bulk) 등록·편집 / Import.
- 관계 편집 (사이클 #6).
- IP 직접 할당 (등록 폼 내 IP 같이 입력은 SCOPED OUT — IP는 사이클 #5).
- 담당자 (Employee) 할당 — `/cis/{ciId}/employees` POST 사용. 등록 직후 별도 단계로 미루거나 사이클 #5 묶기.
- Master 셀렉트의 search-as-you-type — Map prefetch 200개 한도 내에서만.
- 폼 자동 저장 / 자리비움 시 임시저장.
- "복제하여 등록" — 기존 CI를 prefill로 새로 등록.

### 1.4 성공 기준

1. OPERATOR 계정이 `/servers` "+ 등록" 버튼 → `/servers/new` → 폼 입력 → 저장 → `/servers/[새 ciId]` 로 이동. 토스트 "등록되었습니다".
2. OPERATOR가 `/servers/[ciId]` "편집" 버튼 → `/servers/[ciId]/edit` → 폼이 현재 값으로 prefill → 일부 필드 수정 → 저장 → `/servers/[ciId]` 상세로 이동. 토스트 "수정되었습니다".
3. ADMIN이 상세 헤더 "폐기" 버튼 → 다이얼로그 → reason 입력 → 확인 → 토스트 "폐기되었습니다" + `ciStatVal=DECOMMISSIONED` 배지로 즉시 갱신.
4. USER 계정에서는 등록/편집/폐기 버튼이 보이지 않음 (가시성 차단).
5. OPERATOR가 "폐기" 버튼은 **여전히 보이지 않음**(ADMIN 전용).
6. 변경 사유 미입력 — 정상 저장. `X-Change-Reason` 헤더 미부착.
7. 변경 사유 입력 — 헤더 부착되어 백엔드 REVINFO에 기록 (백엔드가 받았는지는 백엔드 로그/이력 응답으로 검증).
8. 폼 검증 실패(필수값 누락 등) — 인라인 에러, 저장 차단.
9. 백엔드 검증 실패(`VALIDATION_FAILED`) — 토스트 + 폼 인라인 에러 매핑(필드별 매핑은 OpenAPI에 detail 미정 시 generic 메시지).
10. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` 통과.

---

## 2. 사용자 시나리오 (RBAC)

| 역할 | /servers (목록) | /servers/[ciId] (상세) | 등록 페이지 | 편집 페이지 | 폐기 |
|---|---|---|---|---|---|
| USER | 보기 | 보기 | 진입 X (URL 직접 시 403 → 토스트 + redirect to detail) | 동상 | 버튼 X |
| OPERATOR | + 등록 활성 | 편집 활성 | ✅ | ✅ | 버튼 X |
| ADMIN | 동상 | 편집 + 폐기 활성 | ✅ | ✅ | ✅ (다이얼로그) |

`USER`가 직접 URL로 `/servers/new`에 진입하면 — Next.js 미들웨어는 인증만 보고, 권한은 페이지 자체에서 검사 후 redirect. 페이지 단에서 `getMyProfile()` → role 검사 → 부적합 시 `redirect('/servers')`.

---

## 3. 라우트와 백엔드 매핑

```
GET   /servers/new             → page.tsx — 빈 폼 (Master prefetch 동반)
POST  /api/v1/cis              ← apiFetch (client) — 성공 시 새 ciId로 navigate
GET   /servers/[ciId]/edit     → page.tsx — 단건 prefetch + Master prefetch
PATCH /api/v1/cis/{ciId}       ← apiFetch — 성공 시 detail로 navigate
(상세 헤더 모달) POST /api/v1/cis/{ciId}/decommission  ← apiFetch
```

요청 헤더 (모든 mutation):
- `Authorization: Bearer <access>` — proxy 자동 부착
- `X-Trace-Id` — mutator 자동 발급
- `X-Change-Reason` — 폼이 reason 채울 때만 부착

---

## 4. 아키텍처 단면

### 4.1 X-Change-Reason 주입

`apiFetch` / `serverFetch` 모두 옵션으로 `changeReason?: string`를 받게 한다. 호출부는 다음과 같이 사용:

```ts
await apiFetch<unknown>('/api/proxy/api/v1/cis', {
  method: 'POST',
  body: JSON.stringify(payload),
  headers: { 'Content-Type': 'application/json' },
  changeReason: form.getValues('changeReason'),
});
```

mutator는 `changeReason`가 truthy면 `headers['X-Change-Reason']`로 부착하고 init에서는 제거. 빈 문자열은 부착하지 않는다.

타입: `RequestInit & { changeReason?: string }` 형태의 확장 타입을 `lib/api/mutator.ts`에서 export.

### 4.2 Mutation hook 패턴

`features/server/forms/hooks.ts`:

```ts
export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: CreateCiRequest; changeReason?: string }) => {
      const data = await apiFetch<{ ciId: number }>('/api/proxy/api/v1/cis', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return CiCreatedResponseSchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cis', 'list'] }),
  });
}
// useUpdateServer, useDecommissionServer 동일 패턴
```

캐시 무효화 단일 지점 — `['cis', 'list']` (목록), `['cis', 'detail', ciId]` (해당 단건). `['cis', 'ips', ciId]` / `['cis', 'employees', ciId]`는 등록·수정으로 영향받지 않으므로 invalidate 불필요. 폐기 시는 detail invalidate로 새 `ciStatVal` 가져오기.

### 4.3 폼 schema (Zod)

`features/server/forms/schema.ts`:
- `serverFormSchema` — UI 입력값 모양. 모든 필드 optional 또는 기본값. UI에서 입력하는 값이 그대로 들어가므로 string→number 변환은 schema에서 `z.coerce.number().optional()`.
- `toCreatePayload(values)` — UI 값을 `CreateCiRequest` 모양으로 변환 (빈 문자열 → undefined, ciTpCd 자동 'SERVER' 고정).
- `toUpdatePayload(values, original)` — 변경된 필드만 추출 (PATCH semantic). 단순화 위해 항상 전체 보내도 무방 (백엔드가 PATCH semantic을 따른다고 가정).

검증 규칙 (Zod):
- `ciNm`: 필수, 1~100자, 영숫자+`-_.`만.
- `serverData.hostNm`: 1~100자.
- `cpucoreCnt`/`memoryCapa`/`diskCapa`: 0 이상 정수/숫자.
- `introDt`/`maintEndDt`: ISO 날짜 (YYYY-MM-DD), maintEndDt > introDt 검증은 SKIP (운영팀 입력 자유도).
- `*Yn`: enum `'Y' | 'N'`.

### 4.4 Master 셀렉트 (이번 사이클 한정)

Server Component (페이지 단)에서 `getLocationsMap()` / `getRacksMap()` / `getVendorsMap()` 호출 → 결과를 props로 전달. 클라이언트 컴포넌트 `<MasterSelect>`는 Map을 받아 옵션으로 렌더. Search/inline-create 없음.

```tsx
<MasterSelect
  value={field.value}
  onChange={field.onChange}
  options={Array.from(locations.values()).map(l => ({ value: l.locId, label: formatLocation(l) }))}
  placeholder="위치 선택"
/>
```

200개 한도 내에서만 동작 — 한도 초과는 §13 위험 항목.

### 4.5 폼 필드 헬퍼

`components/forms/`:
- `<TextField name label placeholder rhf={form} />`
- `<NumberField name label unit?={'C'|'GB'} rhf={form} />`
- `<SelectField name label options rhf={form} />` — Y/N, ciTpCd 등 enum
- `<YnField name label rhf={form} />` — Y/N 토글 전용 (체크박스 + 'Y'/'N' 변환)
- `<DateField name label rhf={form} />` — `<input type="date">` wrapper
- `<MasterSelectField name label options rhf={form} />` — 위 §4.4
- `<FormSection title>{children}</FormSection>` — 카드 단위 그룹

→ form 컴포넌트가 RHF의 `Controller` 래핑 + 에러 표시. shadcn `Form` 컴포넌트 위에 얇게 빌드.

### 4.6 폐기 다이얼로그

`components/features/server/detail/decommission-dialog.tsx`:

- shadcn `Dialog` primitive 추가 필요 (없으면 본 사이클에서 추가).
- 내용:
  - 제목: "서버 폐기"
  - 경고 메시지: 비가역 작업, 다시 활성화 불가, 영향 받는 관계 자동 정리되지 않음
  - reason 텍스트박스 (필수, 최소 5자)
  - 확인 버튼: destructive variant
- 성공 시: 상세 페이지에 머무름 + invalidate(detail) → 새 ciStatVal 갱신 → 헤더 배지 "폐기"로 표시.

### 4.7 USER URL 우회 방어

서버 컴포넌트가 진입 시 RBAC 검사:
```ts
const profile = await getMyProfile();
if (!hasRole(profile?.roles ?? [], 'OPERATOR')) {
  redirect('/servers');  // 또는 forbidden 페이지
}
```

폐기 다이얼로그는 **상세 페이지 클라이언트 컴포넌트** 안에서만 활성. URL로 직접 진입할 페이지가 없으므로 별도 가드 불필요.

---

## 5. 컴포넌트 단면

```
/servers/new/page.tsx                       # Server Component
  ↓ prefetch masters + RBAC redirect
  └ <ServerCreateForm masters={...} />      # Client Component (RHF)

/servers/[ciId]/edit/page.tsx               # Server Component
  ↓ fetch detail + masters + RBAC
  └ <ServerEditForm initial={...} masters={...} />

components/features/server/forms/
  ├ schema.ts                               # zod, payload converters
  ├ hooks.ts                                # useCreateServer, useUpdateServer, useDecommissionServer
  ├ server-create-form.tsx                  # 'use client'
  ├ server-edit-form.tsx                    # 'use client'
  └ sections/                               # 5 sections (basic / spec / ops / flags / security)
     ├ basic-info-section.tsx
     ├ server-spec-section.tsx
     ├ server-ops-section.tsx
     ├ server-flags-section.tsx
     └ memo-section.tsx

components/forms/                           # generic RHF wrappers
  ├ text-field.tsx
  ├ number-field.tsx
  ├ select-field.tsx
  ├ yn-field.tsx
  ├ date-field.tsx
  ├ master-select-field.tsx
  └ form-section.tsx

components/features/server/detail/
  └ decommission-dialog.tsx                 # 'use client'
                                           # ServerDetailHeader 수정: dialog open 핸들러
                                           # 액션 버튼들 disabled → 활성 (RBAC 체크)

components/ui/
  └ dialog.tsx                              # NEW shadcn primitive

src/app/(app)/servers/
  ├ new/page.tsx                            # NEW
  └ [ciId]/edit/page.tsx                    # NEW
```

---

## 6. 데이터 흐름

### 6.1 등록
```
사용자 → /servers/new
서버 컴포넌트: getMyProfile + RBAC 검사 + getLocationsMap/RacksMap/VendorsMap
ServerCreateForm 렌더 (빈 RHF state)
사용자 입력 → onSubmit
  → useCreateServer.mutate({ payload, changeReason })
    → apiFetch POST /cis (X-Change-Reason 자동 부착)
    → 성공: { ciId } 반환 → router.push(`/servers/${ciId}`) + toast
    → 실패: ApiError → formatErrorForToast → toast (인라인 에러는 VALIDATION_FAILED일 때 폼에 매핑)
```

### 6.2 편집
```
사용자 → /servers/[ciId]/edit
서버 컴포넌트: 단건 + masters + 프로필 (병렬)
ServerEditForm prefilled with existing values
onSubmit → useUpdateServer.mutate({ ciId, payload, changeReason })
  → apiFetch PATCH /cis/{ciId}
  → 성공: router.push(`/servers/${ciId}`) + invalidate(detail) + toast
```

### 6.3 폐기
```
사용자 → 상세 페이지 → "폐기" 버튼 클릭
DecommissionDialog 열림
reason 입력 → "폐기" 버튼
  → useDecommissionServer.mutate({ ciId, reason })  // reason은 body로도 보내고, X-Change-Reason 헤더에도 동일 값
  → apiFetch POST /cis/{ciId}/decommission
  → 성공: dialog close + invalidate(detail) + toast
  → 새 ciStatVal=DECOMMISSIONED 반영
```

---

## 7. 에러 처리

| 상황 | 처리 |
|---|---|
| `VALIDATION_FAILED` | 토스트 "입력값이 올바르지 않습니다." + 폼 인라인 에러 (서버가 detail 안 주면 generic) |
| `CONFLICT_DUPLICATE` (ciNm 중복 등) | 토스트 "이미 존재하는 항목입니다." + 해당 필드에 `setError` |
| `FORBIDDEN` (USER가 우회 시도) | 토스트 "권한이 없습니다." + redirect to /servers |
| `NOT_FOUND` (편집 진입 시 없는 ID) | not-found.tsx |
| 네트워크/500 | 폼 그대로 유지, 토스트 + 다시 시도 가능 |
| `SCHEMA_MISMATCH` (응답 모양 다름) | 토스트 + dev console 로그 |

---

## 8. 의도된 deviation (프로토타입 ↔ 구현)

| 프로토타입 | 구현 | 사유 |
|---|---|---|
| 등록 폼이 그리드 2열 모든 필드 한 페이지 | 5개 섹션(카드) 그룹 + scroll | 필드 수 많음(serverData만 24개). 가독성 |
| 폼 필드: ISMS 대상 / 패치일정 | **제거** | API 부재 (gap 문서 §3.2, §3.3) |
| 폼 필드: "마지막 체크" | **제거** | API 부재 (gap §3.1) |
| 등록 폼에 IP 직접 입력 | **제거** | 별도 사이클 #5 (IP 관리) |
| 폐기 = "삭제" 버튼 | "폐기" + reason 필수 다이얼로그 | 비가역 작업 명시 (CMDB 도메인 언어) |

---

## 9. 백엔드 협의 필요 (gap 문서에 추가)

- **`X-Change-Reason` 헤더 echo / REVINFO 저장 여부** — 백엔드가 실제로 받는지 확인.
- **`POST /cis` 응답 형식** — `{ data: { ciId: 123 } }` 가정. 다른 키(`id`)일 가능성 있음. 첫 호출로 검증.
- **`PATCH /cis/{id}` semantic** — 일부 필드만 보냈을 때 미보낸 필드는 보존인지 null로 덮어쓰는지 확인. PATCH 표준은 partial update이지만 Spring 구현 따라 다름.
- **`POST /cis/{id}/decommission` 요청 본문** — `DecommissionCiRequest`는 `{ reason: string }`. 응답 데이터 형식 미상.
- **`VALIDATION_FAILED` 응답에 필드별 detail 포함 여부** — 폼 인라인 에러 매핑에 필요.

---

## 10. 위험과 완화

| 위험 | 완화 |
|---|---|
| Master 200개 한도 초과 | gap 문서 §1.2 — 백엔드가 응답에 master 이름 임베드 시 prefetch 자체 제거 |
| 폼이 너무 길어 사용성 저하 | 5개 섹션 그룹화. 추후 stepper/wizard 패턴 검토 |
| 변경 사유가 운영자에게 부담 | 선택 입력. 강제 입력은 운영 정책 결정 후 |
| PATCH semantic이 PUT-like (전체 덮어쓰기) | 안전한 기본값: 항상 전체 객체 PATCH로 보냄. 실제 Spring 구현 검증 후 partial로 전환 |
| Race condition (편집 중 다른 사용자 수정) | 백엔드가 optimistic locking을 내지 않으면 last-write-wins. 향후 etag/version 도입 검토 |

---

## 11. 변경 이력

- 2026-05-07: 초안 (사이클 #2 브레인스토밍)
