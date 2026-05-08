# IP CRUD (CI 상세 IP 탭) — 설계

> 사이클 #5. cid-api에 `GET /ips` (top-level) 가 없어 글로벌 `/ip` 페이지는 백엔드 추가 전까지 보류. 대신 **CI 상세 IP 탭에 등록·편집·회수 액션을 추가**하여 사용자가 CI 단위로 IP를 관리한다.

작성일: 2026-05-08

---

## 1. In Scope

- CI 상세의 IP 탭(`<IpsTab>`) 에:
  - "+ IP 등록" 버튼 (OPERATOR+) — 모달 폼
  - 각 행에 "편집" 버튼 (OPERATOR+) — 모달 폼
  - 각 행에 "회수" 버튼 (OPERATOR+) — 확인 다이얼로그 → PATCH `unassignCi=true`
- 새 endpoint 사용:
  - `POST /api/v1/cis/{ciId}/ips` — IP 신규 할당 (해당 CI 소유로)
  - `PATCH /api/v1/ips/{ipId}` — IP 수정
  - `PATCH /api/v1/ips/{ipId}` with `unassignCi=true` — IP 회수
- IP 종류(`ipTpCd`): REAL / VIP / ADMIN / NAS / PUBLIC / PRIVATE 셀렉트
- Subnet 선택: `subnetId` — Subnet 트리 reuse (TreeSelectField)

## 2. Out of Scope

- 글로벌 `/ip` 페이지 — gap §5.1 (GET /ips 부재). 사이드바 비활성 유지.
- IP 검색 (백엔드 endpoint 부재)
- IP를 다른 CI로 직접 이전 (현재는 회수 후 재등록)

## 3. 라우트

기존 `/servers/[ciId]` 상세 페이지 변경 없음. IP 탭만 확장.

| 액션 | endpoint |
|---|---|
| 등록 | `POST /api/v1/cis/{ciId}/ips` body=`RegisterIpRequest` (ciId는 path가 채움) |
| 편집 | `PATCH /api/v1/ips/{ipId}` body=`UpdateIpRequest` |
| 회수 | `PATCH /api/v1/ips/{ipId}` body=`{ unassignCi: true }` |

## 4. 컴포넌트

```
src/components/features/server/detail/tabs/
└ ips-tab.tsx                       # MODIFY — 액션 버튼 추가, 헤더에 "+ 등록"

src/components/features/ip/         # NEW
├ schema.ts                         # ipFormSchema, payload converters
├ hooks.ts                          # useCreateIpForCi, useUpdateIp, useUnassignIp
├ ip-form-fields.tsx                # 'use client' — 폼 필드 (ipTpCd select, subnet tree-select)
├ ip-create-dialog.tsx              # 'use client' — props { ciId, subnets }
├ ip-edit-dialog.tsx                # 'use client' — props { row, subnets }
└ ip-unassign-button.tsx            # 'use client' — 확인 다이얼로그
```

## 5. 데이터

상세 페이지 server component:
1. 기존 `getMyProfile + cis/{ciId}` + master prefetch + `getSubnetsTree()` 추가 호출.
2. Subnet 전체를 prefetch (cycle #4의 size=500 패턴 재사용).
3. props로 `subnets` 전달.

탭 자체는 client (useQuery로 IP 목록 fetch).

캐시 무효화: mutation 후 `['cis', 'ips', ciId]` invalidate.

## 6. RBAC

- USER: 보기만
- OPERATOR/ADMIN: 등록/편집/회수

## 7. 의도된 deviation

| 프로토타입 | 구현 | 사유 |
|---|---|---|
| `/ip` 글로벌 페이지 | CI 탭 안에서만 | gap §5.1 (백엔드 GET /ips 부재) |
| MAC 주소 자유 입력 | 동일 | 검증 백엔드에 위임 |

## 8. 변경 이력
- 2026-05-08: 초안.
