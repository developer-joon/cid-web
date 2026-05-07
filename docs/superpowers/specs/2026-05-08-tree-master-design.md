# 트리 Master (위치 / 부서) — 설계 문서

> 사이클 #8 (로드맵 우선순위 변경 — #4 Subnet 진입 전에 먼저 진행). 핵심 목적은 **트리 패턴 정착** — 자기참조 트리 데이터를 표시·편집하는 컴포넌트(`<TreeView>`, `<TreeSelectField>`)를 이번에 정립해서 사이클 #4 (Subnet) 가 그대로 재사용한다. LOCATION은 평탄 master로 함께 노출해 부속 가치 확보.

- 작성일: 2026-05-08
- 선결: 사이클 #3 머지 + RBAC 완화
- 관련: ADR §5·§9, gap §1.2 (master 이름 임베드), gap §4 (사이드바 메뉴)

---

## 1. 목표와 범위

### 1.1 한 줄 정의

`/location` (평탄 master, 사이클 #3과 동일 패턴) + `/dept` (트리 master, 새 패턴) 두 라우트 + 사이드바 활성. 트리 컴포넌트는 별도 폴더 `components/tree/`에 두고 다음 사이클(#4 Subnet)이 그대로 import.

### 1.2 In Scope

- **`/location` 라우트** — list + 필터(siteNmLike/floorNmLike/tpCd) + 페이징 + 모달 등록·편집.
  - LOCATION은 useYn 부재 → 비활성 토글 없음 (rack과 동일).
- **`/dept` 라우트** — **트리 뷰** + 모달 등록·편집·이동.
  - 부모 선택 (upperDeptId) 폼 안에 트리 select.
  - 활성 토글 (useYn 있음).
- **재사용 가능한 트리 컴포넌트**:
  - `<TreeView>` — 계층 노드 렌더링 + 펼침/접힘. props: `nodes` (root nodes), `renderNode`, `expandedIds`, `onToggle`. 자체 상태 옵션도.
  - `<TreeSelectField>` — RHF 통합. 트리에서 한 노드 선택 (값 = id). "(없음/루트)" 옵션 포함.
  - `lib/tree/build.ts` — 평탄 배열 → tree (parentId 기반).
- **사이드바**: 인프라 그룹에 `위치`(`/location`) 추가, 시스템 그룹에 `부서`(`/dept`) 추가.

### 1.3 Out of Scope

- **드래그 앤 드롭으로 부모 변경** — 모달 안 select로만 (충분).
- **lazy 로딩** — 모든 dept를 `?size=500`으로 한 번에 적재. 부서 수 < 500 가정.
- **순환 검증** — 백엔드가 거절한다 가정 (자기 자신을 부모로, 자손을 부모로 등).
- **DEPT history** (사이클 #7).
- **LOCATION 트리화** — LOCATION은 site+floor 2단계 평탄 테이블. 트리 아님.

### 1.4 성공 기준

1. USER가 `/location` 진입 → 목록·검색·페이징.
2. OPERATOR가 위치 등록·편집 (모달).
3. USER가 `/dept` 진입 → 트리 펼침/접힘.
4. OPERATOR가 부서 등록 (부모 선택 트리 셀렉트), 편집 (이동 = 부모 변경).
5. 트리에서 비활성 부서는 흐림 표시 + "비활성 포함" 토글로 가시성 제어.
6. employee 편집 모달의 dept select가 **트리 선택**이 아닌 평탄 select로 유지 (이번 사이클에서는 전환하지 않음 — 트리 select 검증 후 사이클 #N에서 마이그레이션).
7. lint · typecheck · test · build 통과.

---

## 2. 라우트 ↔ 백엔드 매핑

| 라우트 | endpoints |
|---|---|
| `GET /location` | `GET /api/v1/master/locations?siteNmLike=&floorNmLike=&tpCd=&page=&size=&sort=` |
| modal | `POST /master/locations`, `PATCH /master/locations/{locId}` |
| `GET /dept` | `GET /api/v1/master/depts?size=500` (전체 적재) — 트리 만들기 |
| modal | `POST /master/depts`, `PATCH /master/depts/{deptId}` |

`/depts/{deptId}/subtree` 는 향후 lazy 로딩 마이그레이션 시 활용.

---

## 3. 트리 컴포넌트 설계

### 3.1 `lib/tree/build.ts`

```ts
export interface TreeNodeBase { id: number; parentId?: number | null }

export interface TreeNode<T extends TreeNodeBase> {
  data: T;
  children: TreeNode<T>[];
}

/** 평탄 배열을 root[] 트리로 변환. parentId 가 미포함된 노드는 root에. 순환은 무시. */
export function buildTree<T extends TreeNodeBase>(items: T[]): TreeNode<T>[] {
  const byId = new Map<number, TreeNode<T>>();
  for (const item of items) byId.set(item.id, { data: item, children: [] });
  const roots: TreeNode<T>[] = [];
  for (const node of byId.values()) {
    const parent = node.data.parentId != null ? byId.get(node.data.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
```

### 3.2 `<TreeView>` — `components/tree/tree-view.tsx`

```tsx
'use client';

interface TreeViewProps<T> {
  roots: TreeNode<T>[];
  renderNode: (node: TreeNode<T>, depth: number, isExpanded: boolean, toggle: () => void) => ReactNode;
  initiallyExpanded?: 'all' | 'roots' | number[];   // node ids
}
```

- 자체 상태 (Set<number> expandedIds).
- 키보드 접근성 — 화살표 위/아래/오른쪽/왼쪽 (다음 사이클로 미룸 — MVP는 클릭만).

### 3.3 `<TreeSelectField>` — `components/forms/tree-select-field.tsx`

RHF Controller 래핑. trigger 클릭 시 popover/dialog 안에 mini TreeView. 선택 시 onChange(id).

```tsx
interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  roots: TreeNode<{ id: number; label: string; parentId?: number | null }>[];
  /** Disable selecting these ids (e.g., own node + descendants when picking parent for itself). */
  disabledIds?: ReadonlySet<number>;
  rootOptionLabel?: string;       // "(루트)" 또는 "(없음)"
}
```

- DEPT 편집 시 `disabledIds` = 자기 자신 + 모든 자손 (순환 방지).

---

## 4. 컴포넌트 단면

```
components/tree/                                # NEW shared
├ tree-view.tsx
└ index.ts
components/forms/
└ tree-select-field.tsx                         # NEW

lib/tree/
└ build.ts                                      # NEW

components/features/master/location/            # 평탄 (rack 패턴)
├ schema.ts hooks.ts columns.ts
├ location-table.tsx location-filters.tsx
├ location-form-fields.tsx
├ location-create-dialog.tsx location-edit-dialog.tsx

components/features/master/dept/                # 트리
├ schema.ts hooks.ts
├ dept-tree.tsx                                 # 'use client' — TreeView 사용
├ dept-form-fields.tsx                          # TreeSelectField
├ dept-create-dialog.tsx dept-edit-dialog.tsx

src/app/(app)/
├ location/page.tsx
└ dept/page.tsx
```

---

## 5. 위험·완화

| 위험 | 완화 |
|---|---|
| 부서 수 > 500 | gap 문서에 추가; 한도 초과 시 `/subtree` lazy 패턴 도입 |
| 자기참조 사이클 (UI에서 부모를 자손으로 설정 시도) | `<TreeSelectField disabledIds>`로 자기 자신 + 자손 비활성. 백엔드도 거절한다 가정 |
| 비활성 부서가 트리 중간에 있을 때 자식 가시성 | "비활성 포함" 토글로 전체 표시. 비활성 노드는 `opacity-50` |
| LOCATION 의 `tpCd` enum 값 미상 (IDC/OFFICE 등) | 자유 텍스트 입력 + 흔한 값 hint datalist (또는 select with common values) |

---

## 6. 변경 이력

- 2026-05-08: 초안.
