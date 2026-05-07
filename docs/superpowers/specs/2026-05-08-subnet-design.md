# Subnet (IP 대역) 트리 — 설계 문서

> 사이클 #4. DEPT (사이클 #8) 의 트리 패턴을 그대로 재사용해 Subnet CRUD를 구현.

작성일: 2026-05-08

---

## 1. 범위

### In Scope
- `/subnet` 라우트 — 자기참조 트리 (upperSubnetId)
- TreeView로 표시, 등록/편집 모달
- TreeSelectField로 부모 subnet 선택
- 가능한 정보: subnetCidrAddr (CIDR), subnetDescp, vlanId, vrfNm, ciId
- 사이드바 인프라>IP 대역 활성

### Out of Scope
- IP 직접 등록 (사이클 #5)
- ciId search-as-you-type — 텍스트 입력으로 받음 (선택). gap §5.x로 추가
- /subnets/{id}/subtree lazy load — 모든 서브넷 한번에 적재 (실제 운영 환경 N≤200 가정)
- subnet history (사이클 #7)
- 사용된 IP 개수 표시 (gap)

### 성공 기준
1. USER 진입 → 트리 표시
2. OPERATOR 등록 → 부모 선택 트리 동작
3. OPERATOR 편집 → 자기 자신/자손 부모 불가
4. lint/typecheck/test/build 통과

---

## 2. 매핑

| 라우트 | endpoints |
|---|---|
| `GET /subnet` | `GET /api/v1/subnets?page=0&size=500` (전체 적재) |
| modal | `POST /api/v1/subnets`, `PATCH /api/v1/subnets/{subnetId}` |

GET filter 부재 → 클라이언트 측 검색 필터 (CIDR/설명/VLAN). 트리 컴포넌트 외부 필터 박스 1개.

---

## 3. 컴포넌트

```
components/features/master/subnet/
├ schema.ts hooks.ts
├ subnet-tree.tsx                     # DeptTree 패턴 (TreeView + 검색박스)
├ subnet-form-fields.tsx              # CIDR, 설명, VLAN, VRF, 부모, ciId(optional)
├ subnet-create-dialog.tsx
└ subnet-edit-dialog.tsx

src/app/(app)/subnet/page.tsx         # /subnet — 전체 fetch + 트리 렌더
src/components/layout/sidebar.tsx     # 인프라>IP 대역 활성
```

---

## 4. 데이터 흐름

서버 컴포넌트:
1. `getMyProfile()` + `serverFetch('/subnets?size=500')` 병렬
2. `SubnetsPageSchema.parse` → 모든 subnet 적재
3. `<SubnetTree rows myRoles canEdit />`

클라이언트 트리:
1. 검색어 (CIDR like) 로컬 상태로 필터링
2. `buildTree(items)` → roots
3. `<TreeView>` 렌더, 각 노드는 CIDR 텍스트 + descp + ciId badge

편집 모달:
1. row 값으로 prefill
2. TreeSelectField for upperSubnetId, `disabledIds = descendants(subnetId, allRows)`
3. PATCH 후 invalidate `['master','subnets','list']`

---

## 5. CIDR 검증

`subnetCidrAddr` Zod regex: IPv4 `/\d{1,3}(\.\d{1,3}){3}\/\d{1,2}/` (간단). 더 정밀한 검증은 백엔드 책임.

---

## 6. 변경 이력
- 2026-05-08: 초안.
