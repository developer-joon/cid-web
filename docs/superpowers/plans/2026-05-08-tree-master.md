# Tree Master (LOCATION 평탄 + DEPT 트리) Implementation Plan

> superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Activate `/location` (flat master) and `/dept` (tree master). Establish reusable `<TreeView>` + `<TreeSelectField>` + `buildTree()` so the Subnet cycle (#4) can drop them in.

**Architecture:** Server Components fetch full master sets (location: paged; dept: `?size=500`). Client tree component owns expand/collapse state. Modal create/edit; tree-aware parent select.

**Spec:** `docs/superpowers/specs/2026-05-08-tree-master-design.md`.

---

## File additions

```
src/lib/tree/
├ build.ts
└ build.test.ts

src/components/tree/
├ tree-view.tsx
└ index.ts

src/components/forms/
└ tree-select-field.tsx

src/lib/api/schemas/
└ master.ts                                         # MODIFY: extend MasterLocation if needed

src/components/features/master/location/            # 7 files (rack pattern)
src/components/features/master/dept/                # 6 files (tree pattern)

src/app/(app)/location/page.tsx                     # NEW
src/app/(app)/dept/page.tsx                         # NEW

src/components/layout/sidebar.tsx                   # MODIFY: add 위치, 부서

docs/architecture.md                                # MODIFY §7
docs/api-gaps-and-improvements.md                   # MODIFY
```

---

## Phase A — Tree primitives

### Task 1: buildTree utility (TDD)

**Files:**
- Create: `src/lib/tree/build.ts`
- Create: `src/lib/tree/build.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/tree/build.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildTree } from './build';

interface Item { id: number; name: string; parentId?: number | null }

describe('buildTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildTree<Item>([])).toEqual([]);
  });

  it('places roots without parentId at top level', () => {
    const items: Item[] = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B', parentId: null },
    ];
    const roots = buildTree(items);
    expect(roots.map((r) => r.data.id)).toEqual([1, 2]);
    expect(roots[0].children).toEqual([]);
  });

  it('nests children under their parent', () => {
    const items: Item[] = [
      { id: 1, name: 'root' },
      { id: 2, name: 'a', parentId: 1 },
      { id: 3, name: 'b', parentId: 1 },
      { id: 4, name: 'a1', parentId: 2 },
    ];
    const roots = buildTree(items);
    expect(roots).toHaveLength(1);
    expect(roots[0].data.id).toBe(1);
    expect(roots[0].children.map((c) => c.data.id).sort()).toEqual([2, 3]);
    expect(roots[0].children.find((c) => c.data.id === 2)?.children[0].data.id).toBe(4);
  });

  it('places nodes with missing parent as root', () => {
    const items: Item[] = [
      { id: 1, name: 'orphan', parentId: 99 },
      { id: 2, name: 'real-root' },
      { id: 3, name: 'child', parentId: 2 },
    ];
    const roots = buildTree(items);
    expect(roots.map((r) => r.data.id).sort()).toEqual([1, 2]);
  });

  it('handles cycles gracefully (does not stack overflow)', () => {
    // a→b, b→a — both end up unreachable from real roots; with our impl, a will be in b.children, b in a.children, but neither is a root since both have a parent.
    // We accept this degenerate case: nothing in the result.
    const items: Item[] = [
      { id: 1, name: 'a', parentId: 2 },
      { id: 2, name: 'b', parentId: 1 },
    ];
    const roots = buildTree(items);
    expect(Array.isArray(roots)).toBe(true);
  });
});

export {};
```

- [ ] **Step 2: Run, confirm fails**
```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm test -- src/lib/tree/build.test.ts
```

- [ ] **Step 3: Implement**

`src/lib/tree/build.ts`:
```ts
export interface TreeNodeBase { id: number; parentId?: number | null }

export interface TreeNode<T extends TreeNodeBase> {
  data: T;
  children: TreeNode<T>[];
}

/**
 * Builds a forest from a flat array using each item's `parentId`.
 * - Items without `parentId` (or with a parent that does not exist in the input) are roots.
 * - Cycles are tolerated: nodes that participate in a cycle do not appear at the top level.
 */
export function buildTree<T extends TreeNodeBase>(items: readonly T[]): TreeNode<T>[] {
  const byId = new Map<number, TreeNode<T>>();
  for (const item of items) byId.set(item.id, { data: item, children: [] });

  const roots: TreeNode<T>[] = [];
  for (const node of byId.values()) {
    const parentId = node.data.parentId;
    const parent = parentId != null ? byId.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
```

- [ ] **Step 4: Tests green, commit**
```bash
pnpm test -- src/lib/tree/build.test.ts
pnpm typecheck && pnpm lint
git add src/lib/tree
git commit -m "feat(tree): buildTree utility (flat array → forest, parentId-based)"
```

---

### Task 2: `<TreeView>` component

**Files:**
- Create: `src/components/tree/tree-view.tsx`
- Create: `src/components/tree/index.ts`

- [ ] **`src/components/tree/tree-view.tsx`**

```tsx
'use client';

import { useState, useCallback, type ReactNode } from 'react';
import type { TreeNode, TreeNodeBase } from '@/lib/tree/build';

export interface TreeViewProps<T extends TreeNodeBase> {
  roots: TreeNode<T>[];
  renderNode: (
    node: TreeNode<T>,
    depth: number,
    isExpanded: boolean,
    toggle: () => void,
  ) => ReactNode;
  /** Initial expansion: 'all', 'roots' (only top level), or explicit ids. Default 'roots'. */
  initiallyExpanded?: 'all' | 'roots' | readonly number[];
}

function collectAllIds<T extends TreeNodeBase>(roots: TreeNode<T>[]): number[] {
  const out: number[] = [];
  const walk = (nodes: TreeNode<T>[]) => {
    for (const n of nodes) {
      out.push(n.data.id);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

function rootIds<T extends TreeNodeBase>(roots: TreeNode<T>[]): number[] {
  return roots.map((r) => r.data.id);
}

export function TreeView<T extends TreeNodeBase>({
  roots,
  renderNode,
  initiallyExpanded = 'roots',
}: TreeViewProps<T>) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    if (initiallyExpanded === 'all') return new Set(collectAllIds(roots));
    if (initiallyExpanded === 'roots') return new Set(rootIds(roots));
    return new Set(initiallyExpanded);
  });

  const toggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function renderLevel(nodes: TreeNode<T>[], depth: number): ReactNode {
    return nodes.map((node) => {
      const isExpanded = expandedIds.has(node.data.id);
      return (
        <div key={node.data.id}>
          {renderNode(node, depth, isExpanded, () => toggle(node.data.id))}
          {isExpanded && node.children.length > 0 ? renderLevel(node.children, depth + 1) : null}
        </div>
      );
    });
  }

  return <div className="text-sm">{renderLevel(roots, 0)}</div>;
}
```

- [ ] **`src/components/tree/index.ts`**
```ts
export * from './tree-view';
```

- [ ] **Verify and commit**
```bash
pnpm typecheck && pnpm lint
git add src/components/tree
git commit -m "feat(tree): TreeView recursive component with toggle state"
```

---

### Task 3: `<TreeSelectField>` (RHF integration)

**File:** `src/components/forms/tree-select-field.tsx`

```tsx
'use client';

import { useState, useMemo } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { TreeView } from '@/components/tree';
import { buildTree, type TreeNode } from '@/lib/tree/build';
import { cn } from '@/lib/utils';

export interface TreeSelectItem {
  id: number;
  label: string;
  parentId?: number | null;
}

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  items: TreeSelectItem[];
  disabledIds?: ReadonlySet<number>;
  rootOptionLabel?: string;       // "(없음)" — undefined value
}

export function TreeSelectField<TForm extends FieldValues>({
  control, name, label, items, disabledIds, rootOptionLabel = '(없음)',
}: Props<TForm>) {
  const [open, setOpen] = useState(false);
  const roots = useMemo(() => buildTree(items), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = field.value as number | undefined;
        const display = value !== undefined && byId.has(value) ? byId.get(value)!.label : rootOptionLabel;

        function pick(id?: number) {
          field.onChange(id);
          setOpen(false);
        }

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setOpen(true)}>
                <span className="truncate text-left">{display}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
            <FormMessage />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{label} 선택</DialogTitle>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-3 py-1.5 text-left hover:bg-muted',
                      value === undefined && 'bg-muted font-medium',
                    )}
                    onClick={() => pick(undefined)}
                  >
                    <span className="w-4" />
                    <span className="text-muted-foreground">{rootOptionLabel}</span>
                  </button>
                  <TreeView
                    roots={roots}
                    initiallyExpanded="all"
                    renderNode={(node, depth, isExpanded, toggle) => {
                      const id = node.data.id;
                      const isDisabled = disabledIds?.has(id) ?? false;
                      const isSelected = value === id;
                      const hasChildren = node.children.length > 0;
                      return (
                        <div className="flex items-center" style={{ paddingLeft: depth * 16 }}>
                          <button
                            type="button"
                            onClick={toggle}
                            className="flex h-6 w-6 items-center justify-center"
                            tabIndex={-1}
                          >
                            {hasChildren ? (
                              isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                            ) : null}
                          </button>
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => !isDisabled && pick(id)}
                            className={cn(
                              'flex flex-1 items-center rounded px-2 py-1 text-left text-sm',
                              isSelected && 'bg-primary/10 font-medium text-primary',
                              isDisabled ? 'cursor-not-allowed text-muted-foreground/60' : 'hover:bg-muted',
                            )}
                          >
                            {node.data.label}
                          </button>
                        </div>
                      );
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </FormItem>
        );
      }}
    />
  );
}
```

Verify and commit:
```bash
pnpm typecheck && pnpm lint
git add src/components/forms/tree-select-field.tsx
git commit -m "feat(forms): TreeSelectField — RHF tree picker with disabled descendants"
```

---

## Phase B — LOCATION domain (flat, rack-style)

### Task 4: LOCATION domain (full)

**Files (all under `src/components/features/master/location/`):**

#### `schema.ts`
```ts
import { z } from 'zod';
import type { RegisterLocationRequest, UpdateLocationRequest } from '@/api/generated/schemas';

export const locationFormSchema = z.object({
  locSiteNm: z.string().min(1, '필수입니다.').max(100),
  locFloorNm: z.string().max(50).optional().or(z.literal('')),
  locTpCd: z.string().max(50).optional().or(z.literal('')),
  locDescp: z.string().max(500).optional().or(z.literal('')),
});
export type LocationFormValues = z.infer<typeof locationFormSchema>;

export const defaultLocationFormValues: LocationFormValues = {
  locSiteNm: '', locFloorNm: '', locTpCd: '', locDescp: '',
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toLocationCreate(v: LocationFormValues): RegisterLocationRequest {
  return {
    locSiteNm: v.locSiteNm,
    locFloorNm: blank(v.locFloorNm),
    locTpCd: blank(v.locTpCd),
    locDescp: blank(v.locDescp),
  };
}
export function toLocationUpdate(v: LocationFormValues): UpdateLocationRequest {
  return toLocationCreate(v) as UpdateLocationRequest;
}
```

#### `hooks.ts` — same shape as rack/hooks.ts
```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterLocationRequest, UpdateLocationRequest } from '@/api/generated/schemas';

const Created = z.object({ locId: z.number().int() });

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterLocationRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/master/locations', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return Created.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'locations', 'list'] }),
  });
}

export function useUpdateLocation(locId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateLocationRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/master/locations/${locId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'locations', 'list'] }),
  });
}
```

#### `location-table.tsx`
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MasterLocation } from '@/lib/api/schemas';
import { LocationEditTrigger } from './location-edit-dialog';

export function LocationTable({ rows, canEdit }: { rows: MasterLocation[]; canEdit: boolean }) {
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-muted-foreground">조회된 위치가 없습니다.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>사이트</TableHead>
          <TableHead>층</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>설명</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((l) => (
          <TableRow key={l.locId}>
            <TableCell className="font-medium">{l.locSiteNm}</TableCell>
            <TableCell>{l.locFloorNm ?? '—'}</TableCell>
            <TableCell>{l.locTpCd ?? '—'}</TableCell>
            <TableCell className="text-muted-foreground">{(l as MasterLocation & { locDescp?: string }).locDescp ?? '—'}</TableCell>
            <TableCell>{canEdit ? <LocationEditTrigger row={l as MasterLocation & { locDescp?: string }} /> : null}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

(NOTE: `MasterLocation` schema may not include `locDescp`. If you need it shown in table, either extend the schema in `src/lib/api/schemas/master.ts` to include `locDescp: z.string().optional()` or drop the column.)

#### `location-filters.tsx` — site/floor name search + tpCd select with common values
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';

const ALL = '__ALL__';
const TYPE_OPTIONS = [
  { value: ALL, label: '유형 전체' },
  { value: 'IDC', label: 'IDC' },
  { value: 'OFFICE', label: 'OFFICE' },
];
const KEYS = ['siteNmLike', 'floorNmLike', 'tpCd'] as const;

export function LocationFilters() {
  const { values, set } = useUrlFilters({ keys: KEYS });
  const [site, setSite] = useState(values.siteNmLike);
  const [floor, setFloor] = useState(values.floorNmLike);
  useEffect(() => setSite(values.siteNmLike), [values.siteNmLike]);
  useEffect(() => setFloor(values.floorNmLike), [values.floorNmLike]);

  function commitSite() { if (site !== values.siteNmLike) set({ siteNmLike: site }); }
  function commitFloor() { if (floor !== values.floorNmLike) set({ floorNmLike: floor }); }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={site} onChange={(e) => setSite(e.target.value)} onBlur={commitSite}
             onKeyDown={(e) => { if (e.key === 'Enter') commitSite(); }}
             placeholder="🔍 사이트" className="h-9 w-48 text-sm" />
      <Input value={floor} onChange={(e) => setFloor(e.target.value)} onBlur={commitFloor}
             onKeyDown={(e) => { if (e.key === 'Enter') commitFloor(); }}
             placeholder="🔍 층" className="h-9 w-32 text-sm" />
      <Select value={values.tpCd || ALL} onValueChange={(v) => set({ tpCd: v === ALL ? '' : v })}>
        <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="유형 전체" /></SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
```

#### `location-form-fields.tsx`
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { LocationFormValues } from './schema';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';

const TYPE_OPTIONS = [
  { value: 'IDC', label: 'IDC' },
  { value: 'OFFICE', label: 'OFFICE' },
  { value: 'OTHER', label: 'OTHER' },
];

export function LocationFormFields({ control }: { control: Control<LocationFormValues> }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextField control={control} name="locSiteNm" label="사이트" required />
      <TextField control={control} name="locFloorNm" label="층" placeholder="예: 2층" />
      <SelectField control={control} name="locTpCd" label="유형" options={TYPE_OPTIONS} placeholder="유형 선택" />
      <TextField control={control} name="locDescp" label="설명" />
    </div>
  );
}
```

#### `location-create-dialog.tsx` and `location-edit-dialog.tsx`

Mirror rack's create/edit dialogs. `LocationCreateButton` (no extra props), `LocationEditTrigger({ row })` where row is `MasterLocation` extended with `locDescp`.

(Pattern reference: `src/components/features/master/rack/rack-create-dialog.tsx` and `rack-edit-dialog.tsx` — copy their structure.)

#### Schema extension

Edit `src/lib/api/schemas/master.ts` to extend `MasterLocationSchema` with `locDescp: z.string().optional()`:

```ts
export const MasterLocationSchema = z.object({
  locId: z.number().int(),
  locSiteNm: z.string(),
  locFloorNm: z.string().optional(),
  locTpCd: z.string().optional(),
  locDescp: z.string().optional(),    // NEW
});
```

Verify and commit:
```bash
pnpm typecheck && pnpm lint
git add src/components/features/master/location src/lib/api/schemas/master.ts
git commit -m "feat(master): location domain (flat CRUD with site/floor/type filters)"
```

---

## Phase C — DEPT domain (tree)

### Task 5: DEPT domain

**Files (under `src/components/features/master/dept/`):**

#### `schema.ts`
```ts
import { z } from 'zod';
import type { RegisterDeptRequest, UpdateDeptRequest } from '@/api/generated/schemas';

const Yn = z.enum(['Y', 'N']);

export const deptFormSchema = z.object({
  deptNm: z.string().min(1, '필수입니다.').max(100),
  teamNm: z.string().max(100).optional().or(z.literal('')),
  upperDeptId: z.number().int().optional(),
  useYn: Yn.default('Y'),
});
export type DeptFormValues = z.infer<typeof deptFormSchema>;

export const defaultDeptFormValues: DeptFormValues = {
  deptNm: '', teamNm: '', upperDeptId: undefined, useYn: 'Y',
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toDeptCreate(v: DeptFormValues): RegisterDeptRequest {
  return { deptNm: v.deptNm, teamNm: blank(v.teamNm), upperDeptId: v.upperDeptId };
}
export function toDeptUpdate(v: DeptFormValues): UpdateDeptRequest {
  return { ...toDeptCreate(v), useYn: v.useYn };
}
```

#### `hooks.ts` — mirror rack/vendor pattern, URLs `/api/v1/master/depts`, cache key `['master', 'depts', 'list']`. Created response: `{ deptId: number }`.

#### `dept-tree.tsx`
```tsx
'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TreeView } from '@/components/tree';
import { buildTree } from '@/lib/tree/build';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { MasterDept } from '@/lib/api/schemas';
import { DeptEditTrigger } from './dept-edit-dialog';

interface Props {
  rows: MasterDept[];
  canEdit: boolean;
}

interface TreeItem { id: number; parentId?: number | null; data: MasterDept }

export function DeptTree({ rows, canEdit }: Props) {
  const [includeInactive, setIncludeInactive] = useState(true);

  const items: TreeItem[] = useMemo(
    () => rows
      .filter((d) => includeInactive || d.useYn !== 'N')
      .map((d) => ({ id: d.deptId, parentId: d.upperDeptId ?? null, data: d })),
    [rows, includeInactive],
  );

  const roots = useMemo(() => buildTree(items), [items]);

  if (rows.length === 0) {
    return <div className="p-10 text-center text-sm text-muted-foreground">등록된 부서가 없습니다.</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
        <Checkbox
          id="dept-inactive"
          checked={includeInactive}
          onCheckedChange={(c) => setIncludeInactive(Boolean(c))}
        />
        <Label htmlFor="dept-inactive" className="cursor-pointer text-sm text-muted-foreground">비활성 포함</Label>
      </div>
      <div className="p-2">
        <TreeView
          roots={roots}
          initiallyExpanded="roots"
          renderNode={(node, depth, isExpanded, toggle) => {
            const dept = node.data.data;
            const inactive = dept.useYn === 'N';
            const hasChildren = node.children.length > 0;
            return (
              <div
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/40',
                  inactive && 'opacity-60',
                )}
                style={{ paddingLeft: depth * 20 + 8 }}
              >
                <button
                  type="button"
                  onClick={toggle}
                  className="flex h-5 w-5 items-center justify-center"
                >
                  {hasChildren ? (isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : null}
                </button>
                <span className="font-medium">{dept.deptNm}</span>
                {dept.teamNm ? <span className="text-xs text-muted-foreground">· {dept.teamNm}</span> : null}
                {inactive ? <Badge>비활성</Badge> : null}
                {canEdit ? (
                  <div className="ml-auto">
                    <DeptEditTrigger row={dept} allDepts={rows} />
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
```

#### `dept-form-fields.tsx`
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { DeptFormValues } from './schema';
import type { MasterDept } from '@/lib/api/schemas';
import { TextField } from '@/components/forms/text-field';
import { YnField } from '@/components/forms/yn-field';
import { TreeSelectField, type TreeSelectItem } from '@/components/forms/tree-select-field';
import { hasRole } from '@/lib/auth/roles';

interface Props {
  control: Control<DeptFormValues>;
  allDepts: readonly MasterDept[];
  disabledIds?: ReadonlySet<number>;
  myRoles: readonly string[];
  mode: 'create' | 'edit';
}

export function DeptFormFields({ control, allDepts, disabledIds, myRoles, mode }: Props) {
  const items: TreeSelectItem[] = allDepts.map((d) => ({
    id: d.deptId,
    label: d.teamNm ? `${d.deptNm} · ${d.teamNm}` : d.deptNm,
    parentId: d.upperDeptId ?? null,
  }));
  const showActive = mode === 'edit' && hasRole(myRoles, 'OPERATOR');

  return (
    <div className="grid grid-cols-1 gap-3">
      <TextField control={control} name="deptNm" label="부서 명" required />
      <TextField control={control} name="teamNm" label="팀 명" />
      <TreeSelectField
        control={control}
        name="upperDeptId"
        label="상위 부서"
        items={items}
        disabledIds={disabledIds}
        rootOptionLabel="(루트)"
      />
      {showActive ? <YnField control={control} name="useYn" label="활성" /> : null}
    </div>
  );
}
```

#### `dept-create-dialog.tsx` (`DeptCreateButton`)
- Mirrors vendor-create-dialog. Pass `allDepts` and `myRoles` to fields. No `disabledIds` for create (anywhere is fine).

#### `dept-edit-dialog.tsx` (`DeptEditTrigger`)
- Receives `{ row, allDepts, myRoles }`.
- Compute `disabledIds`:
  ```ts
  function descendants(rootId: number, all: readonly MasterDept[]): Set<number> {
    const result = new Set<number>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const d of all) {
        if (d.upperDeptId != null && result.has(d.upperDeptId) && !result.has(d.deptId)) {
          result.add(d.deptId);
          added = true;
        }
      }
    }
    return result;
  }
  ```
  Pass to TreeSelectField so user cannot pick self or descendants as parent.

Verify and commit:
```bash
pnpm typecheck && pnpm lint
git add src/components/features/master/dept
git commit -m "feat(master): dept tree domain (TreeView + TreeSelect for parent)"
```

---

## Phase D — Routes + sidebar

### Task 6: /location and /dept routes

**Files:**
- Create: `src/app/(app)/location/page.tsx`
- Create: `src/app/(app)/dept/page.tsx`

`/location/page.tsx` — same pattern as `/rack/page.tsx`:
- searchParams: siteNmLike, floorNmLike, tpCd, page/size/sort
- Endpoint: `/api/v1/master/locations?...`
- Schema: `LocationsPageSchema`
- Components: `LocationFilters`, `LocationTable`, `LocationCreateButton`
- Title: "위치 관리"

`/dept/page.tsx` — different pattern:
- No URL filters except optional `useYn` (managed inside component)
- Single fetch: `?size=500` (all depts)
- Component: `DeptTree` and `DeptCreateButton`
- Title: "부서 관리"

```tsx
import { getMyProfile } from '@/lib/auth/me';
import { hasRole } from '@/lib/auth/roles';
import { serverFetch } from '@/lib/api/server-fetch';
import { DeptsPageSchema } from '@/lib/api/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGuard } from '@/lib/auth/rbac';
import { DeptTree } from '@/components/features/master/dept/dept-tree';
import { DeptCreateButton } from '@/components/features/master/dept/dept-create-dialog';

export const dynamic = 'force-dynamic';

export default async function DeptListPage() {
  const [profile, raw] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>('/api/v1/master/depts?page=0&size=500&sort=deptId,asc'),
  ]);
  const page = DeptsPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">부서 관리</CardTitle>
        <RoleGuard role="OPERATOR" myRoles={myRoles}>
          <DeptCreateButton allDepts={page.content} myRoles={myRoles} />
        </RoleGuard>
      </CardHeader>
      <CardContent className="p-0">
        <DeptTree rows={page.content} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}
```

Verify and commit each route separately:
```bash
pnpm typecheck && pnpm lint
git add 'src/app/(app)/location/page.tsx'
git commit -m "feat(master): /location route — flat master list"

pnpm typecheck && pnpm lint
git add 'src/app/(app)/dept/page.tsx'
git commit -m "feat(master): /dept route — tree view with role-gated create/edit"
```

---

### Task 7: Sidebar additions

Modify `src/components/layout/sidebar.tsx`:
- 인프라 group — add `{ href: '/location', icon: '📍', label: '위치' }` after 렉 관리.
- 시스템 group — add `{ href: '/dept', icon: '🏢', label: '부서' }` before 사용자.

```bash
pnpm typecheck && pnpm lint
git add src/components/layout/sidebar.tsx
git commit -m "feat(layout): activate 위치/부서 sidebar items"
```

---

## Phase E — Verify

### Task 8: ADR + gap doc + final verify

`docs/architecture.md` §7 append:
```md
- **2026-05-08 (cycle #8)**: 트리 master 패턴 정착 — `<TreeView>` + `<TreeSelectField>` + `buildTree()` 신규. 위치(평탄) + 부서(자기참조 트리) CRUD. DEPT 편집 시 자기 자신·자손은 부모로 선택 불가 (사이클 방지). 사이클 #4 (Subnet 트리)가 동일 컴포넌트 그대로 재사용 예정.
```

`docs/api-gaps-and-improvements.md`:
- §10 cycle #8 row added: ✅, with notes.
- Top date updated.

Final verify:
```bash
source ~/.nvm/nvm.sh && nvm use 20
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Commit:
```bash
git add docs/architecture.md docs/api-gaps-and-improvements.md
git commit -m "docs(adr): cycle #8 (tree master) decisions + gap update"
```

---

## Verification Checklist

- [ ] `pnpm test` includes `buildTree` tests
- [ ] `pnpm build` succeeds
- [ ] /location shows list, register, edit work for OPERATOR
- [ ] /dept renders tree, expand/collapse work
- [ ] Dept create modal — parent select shows tree
- [ ] Dept edit modal — own node + descendants disabled in parent select
- [ ] "비활성 포함" toggle in /dept hides/shows useYn=N
- [ ] Sidebar 위치 + 부서 active

---

## Notes for the engineer

- The dept page does **not** use `useUrlFilters`. The "비활성 포함" toggle is local component state — simpler for tree.
- `MasterLocation` schema extension to include `locDescp` is required so the table can display it.
- The `DeptEditTrigger`'s `disabledIds` logic prevents cycles client-side; backend should also reject. If backend doesn't, file as gap §1.x.
- `<TreeSelectField>` opens a `Dialog`. If you need it to nest inside another `Dialog` (e.g., DeptCreate dialog opens, then TreeSelect opens), ensure both dialogs work simultaneously. Radix supports nested dialogs out of the box, but stacking z-index is correct.
