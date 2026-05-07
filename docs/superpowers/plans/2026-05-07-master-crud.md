# Master CRUD (렉 / 벤더 / 담당자) Implementation Plan

> Use superpowers:subagent-driven-development. Steps use checkbox.

**Goal:** Activate the 인프라>렉, 자산>벤더, 자산>담당자 sidebar items by shipping list + modal-based CRUD for the three flat master entities. Employee form depends on a new DEPT prefetch.

**Architecture:** Server Components fetch list + masters; client modal dialogs own form state via RHF. Vendor/employee carry `useYn` (soft delete via toggle); rack does not (no useYn field on backend). All three reuse forms helpers and patterns from cycles #1–#2.

**Tech Stack:** unchanged.

**Spec:** `docs/superpowers/specs/2026-05-07-master-crud-design.md`.

---

## File Structure additions

```
src/lib/master/
├ server.ts                                  # MODIFY: add getDeptsMap
└ format.ts                                  # MODIFY (maybe): formatEmployee, formatDept

src/lib/api/schemas/
├ master.ts                                  # MODIFY: extend with Dept, EmployeesPage, plus list-item-only Rack/Vendor/Emp pages
└ master.test.ts                             # NEW

src/components/features/master/
├ shared/
│  ├ master-list-shell.tsx
│  ├ master-form-dialog.tsx
│  ├ active-toggle.tsx
│  └ delete-button-stub.tsx (none — masters don't hard delete)
├ rack/
│  ├ schema.ts hooks.ts columns.tsx
│  ├ rack-filters.tsx rack-table.tsx
│  ├ rack-create-dialog.tsx rack-edit-dialog.tsx
│  └ rack-form-fields.tsx
├ vendor/  (same shape)
└ employee/ (same shape)

src/app/(app)/
├ rack/page.tsx
├ vendor/page.tsx
└ contact/page.tsx

src/components/layout/sidebar.tsx            # MODIFY: 3 items active
```

---

## Conventions

- `[resource]` is one of `racks | vendors | employees`. URL is `/rack | /vendor | /contact`.
- Cache key per resource: `['master', resource, 'list', filters]` for list, `['master', resource, 'detail', id]` if needed (this cycle treats edit modal as fresh form prefilled from row data — no detail fetch).
- All mutations invalidate `['master', resource, 'list']`.
- `useYn` field in payloads only when present in backend Update schema (rack omitted).
- `pnpm typecheck && pnpm lint` after each commit, `pnpm test` after each phase.

---

## Phase A — Cross-cutting

### Task 1: Extend master schemas + DEPT prefetch

**Files:**
- Modify: `src/lib/api/schemas/master.ts`
- Modify: `src/lib/master/server.ts`
- Create: `src/lib/api/schemas/master.test.ts`

- [ ] **Step 1: Extend `master.ts`**

Append:
```ts
import { z } from 'zod';
import { pageSchema } from './pagination';

export const MasterEmployeeSchema = z.object({
  empId: z.number().int(),
  empNm: z.string(),
  worldId: z.string().optional(),
  emailAddr: z.string().optional(),
  telNo: z.string().optional(),
  deptId: z.number().int().optional(),
  deptNm: z.string().optional(),
  useYn: z.enum(['Y', 'N']).optional(),
});
export type MasterEmployee = z.infer<typeof MasterEmployeeSchema>;

export const MasterDeptSchema = z.object({
  deptId: z.number().int(),
  deptNm: z.string(),
  teamNm: z.string().optional(),
  upperDeptId: z.number().int().optional(),
  useYn: z.enum(['Y', 'N']).optional(),
});
export type MasterDept = z.infer<typeof MasterDeptSchema>;

export const EmployeesPageSchema = pageSchema(MasterEmployeeSchema);
export const DeptsPageSchema = pageSchema(MasterDeptSchema);
```

Also extend the existing `MasterRackSchema` and `MasterVendorSchema` with the **additional fields used by edit forms** (rack: `remk`; vendor: `chgrNm`, `chgrEmailAddr`, `chgrTelNo`, `remk`, `useYn`):

```ts
export const MasterRackSchema = z.object({
  rackId: z.number().int(),
  rackLocCd: z.string(),
  locId: z.number().int(),
  remk: z.string().optional(),
});

export const MasterVendorSchema = z.object({
  vendorId: z.number().int(),
  vendorNm: z.string(),
  vendorTpCd: z.string().optional(),
  chgrNm: z.string().optional(),
  chgrEmailAddr: z.string().optional(),
  chgrTelNo: z.string().optional(),
  remk: z.string().optional(),
  useYn: z.enum(['Y', 'N']).optional(),
});
```

- [ ] **Step 2: Extend `lib/master/server.ts`**

Add:
```ts
import { DeptsPageSchema, EmployeesPageSchema, type MasterDept, type MasterEmployee } from '@/lib/api/schemas';

// reuse LARGE_PAGE constant.

export const getDeptsMap = cache(async (): Promise<Map<number, MasterDept>> => {
  const data = await serverFetch<unknown>(`/api/v1/master/depts${LARGE_PAGE}`);
  const parsed = DeptsPageSchema.parse(data);
  return new Map(parsed.content.map((d) => [d.deptId, d]));
});
```

(Don't add `getEmployeesMap` — employees are too many to prefetch all; load via list page query.)

- [ ] **Step 3: Tests**

Create `src/lib/api/schemas/master.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  MasterRackSchema, MasterVendorSchema, MasterEmployeeSchema, MasterDeptSchema,
  RacksPageSchema, VendorsPageSchema, EmployeesPageSchema, DeptsPageSchema,
} from './master';

describe('Master schemas', () => {
  it('parses Rack with remk optional', () => {
    expect(MasterRackSchema.parse({ rackId: 1, rackLocCd: 'A-01', locId: 1 })).toMatchObject({ rackLocCd: 'A-01' });
    expect(MasterRackSchema.parse({ rackId: 2, rackLocCd: 'B-01', locId: 1, remk: 'cold aisle' }).remk).toBe('cold aisle');
  });
  it('parses Vendor with all optional contact fields', () => {
    const v = MasterVendorSchema.parse({
      vendorId: 1, vendorNm: 'Dell', vendorTpCd: 'HW',
      chgrNm: '김기철', chgrEmailAddr: 'a@b.c', chgrTelNo: '010', remk: '', useYn: 'Y',
    });
    expect(v.useYn).toBe('Y');
  });
  it('parses Employee with optional deptId/deptNm', () => {
    const e = MasterEmployeeSchema.parse({ empId: 5, empNm: '홍길동', deptId: 3, deptNm: '인프라팀' });
    expect(e.deptNm).toBe('인프라팀');
  });
  it('parses Dept tree fields', () => {
    const d = MasterDeptSchema.parse({ deptId: 1, deptNm: '인프라팀', teamNm: 'API', upperDeptId: 9 });
    expect(d.upperDeptId).toBe(9);
  });
  it('rejects invalid useYn enum', () => {
    expect(MasterVendorSchema.safeParse({ vendorId: 1, vendorNm: 'x', useYn: 'YES' }).success).toBe(false);
  });
  it('parses paged shapes', () => {
    const racks = RacksPageSchema.parse({ content: [], page: { number: 0, size: 20, totalElements: 0, totalPages: 0 }});
    expect(racks.content.length).toBe(0);
    expect(VendorsPageSchema.safeParse({ content: [], page: {...racks.page} }).success).toBe(true);
    expect(EmployeesPageSchema.safeParse({ content: [], page: {...racks.page} }).success).toBe(true);
    expect(DeptsPageSchema.safeParse({ content: [], page: {...racks.page} }).success).toBe(true);
  });
});
```

- [ ] **Step 4: Verify and commit**
```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm test -- src/lib/api/schemas/master.test.ts
pnpm typecheck && pnpm lint
git add src/lib/api/schemas/master.ts src/lib/api/schemas/master.test.ts src/lib/master/server.ts
git commit -m "feat(api): extend master schemas (Dept, Employee+useYn, vendor contact fields)"
```

---

### Task 2: Master shared shells (List + FormDialog)

**Files:**
- Create: `src/components/features/master/shared/master-list-shell.tsx`
- Create: `src/components/features/master/shared/master-form-dialog.tsx`
- Create: `src/components/features/master/shared/active-toggle.tsx`

- [ ] **`master-list-shell.tsx`** — generic page wrapper. Accepts `title`, `register button`, `filters`, `table`, `pagination` as slots/children. Implementation:

```tsx
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  title: string;
  toolbar?: ReactNode;     // filters + register button
  children: ReactNode;     // table content
  pagination?: ReactNode;
}

export function MasterListShell({ title, toolbar, children, pagination }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      {toolbar ? <div className="border-b border-border/60 px-5 py-3">{toolbar}</div> : null}
      <CardContent className="p-0">{children}</CardContent>
      {pagination}
    </Card>
  );
}
```

- [ ] **`master-form-dialog.tsx`** — generic dialog wrapper:
```tsx
'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isPending?: boolean;
  onSubmit: () => void;
  submitLabel?: string;
  children: ReactNode;
}

export function MasterFormDialog({ open, onOpenChange, title, description, isPending, onSubmit, submitLabel = '저장', children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>취소</Button>
          <Button onClick={onSubmit} disabled={isPending}>{isPending ? '저장 중…' : submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **`active-toggle.tsx`** — "비활성 포함" toggle wired to URL `useYn` param:
```tsx
'use client';

import { useUrlFilters } from '@/hooks/use-url-filters';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const FILTER_KEYS = ['useYn'] as const;

/** Checkbox: when checked → useYn=N or absent → backend returns all. When unchecked → useYn=Y. */
export function ActiveToggle() {
  const { values, set } = useUrlFilters({ keys: FILTER_KEYS });
  // Default UX: by default we DROP useYn so backend returns Y only? Actually backend returns based on param presence.
  // Convention: filter on URL means "useYn=Y" (only active). Toggle ON = "include 비활성" = remove useYn from URL.
  const includeInactive = values.useYn !== 'Y';
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="include-inactive"
        checked={includeInactive}
        onCheckedChange={(c) => set({ useYn: c ? '' : 'Y' })}
      />
      <Label htmlFor="include-inactive" className="cursor-pointer text-sm text-muted-foreground">비활성 포함</Label>
    </div>
  );
}
```

(Initial state: URL has no `useYn` → backend returns all → checkbox checked. To filter to active-only, user unchecks → URL gets `useYn=Y`.)

- [ ] **typecheck + commit:**
```bash
pnpm typecheck && pnpm lint
git add src/components/features/master/shared
git commit -m "feat(master): shared list shell + form dialog + active toggle"
```

---

## Phase B — Per-domain (Rack / Vendor / Employee)

Each task creates one master domain with the same internal shape. Order: rack → vendor → employee.

### Task 3: Rack domain (schema + hooks + columns + table + filters + create/edit dialogs)

**Files (all new under `src/components/features/master/rack/`):**

#### `schema.ts`
```ts
import { z } from 'zod';
import type { RegisterRackRequest, UpdateRackRequest } from '@/api/generated/schemas';

export const rackFormSchema = z.object({
  rackLocCd: z.string().min(1, '필수입니다.').max(50),
  locId: z.number().int(),
  remk: z.string().max(500).optional().or(z.literal('')),
});
export type RackFormValues = z.infer<typeof rackFormSchema>;

export const defaultRackFormValues: RackFormValues = { rackLocCd: '', locId: 0, remk: '' };

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toRackCreate(v: RackFormValues): RegisterRackRequest {
  return { rackLocCd: v.rackLocCd, locId: v.locId, remk: blank(v.remk) };
}
export function toRackUpdate(v: RackFormValues): UpdateRackRequest {
  return { rackLocCd: v.rackLocCd, locId: v.locId, remk: blank(v.remk) };
}
```

#### `hooks.ts`
```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { RegisterRackRequest, UpdateRackRequest } from '@/api/generated/schemas';

const Created = z.object({ rackId: z.number().int() });

export function useCreateRack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterRackRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/master/racks', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return Created.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'racks', 'list'] }),
  });
}

export function useUpdateRack(rackId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateRackRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/master/racks/${rackId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', 'racks', 'list'] }),
  });
}
```

#### `columns.ts`
```ts
import type { MasterRack } from '@/lib/api/schemas';

export interface RackRow extends MasterRack { /* room for derived fields */ }

export const RACK_COLUMNS = [
  { key: 'rackLocCd', header: '렉 코드', sortable: true },
  { key: 'location', header: '위치' },
  { key: 'remk', header: '메모' },
  { key: 'actions', header: '' },
] as const;
```

#### `rack-table.tsx`
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MasterLocation, MasterRack } from '@/lib/api/schemas';
import { formatLocation } from '@/lib/master/format';
import { RackEditTrigger } from './rack-edit-dialog';

interface Props {
  rows: MasterRack[];
  locations: Map<number, MasterLocation>;
  canEdit: boolean;
}

export function RackTable({ rows, locations, canEdit }: Props) {
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-muted-foreground">조회된 렉이 없습니다.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>렉 코드</TableHead>
          <TableHead>위치</TableHead>
          <TableHead>메모</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.rackId}>
            <TableCell className="font-medium">{r.rackLocCd}</TableCell>
            <TableCell>{formatLocation(locations.get(r.locId))}</TableCell>
            <TableCell className="text-muted-foreground">{r.remk ?? '—'}</TableCell>
            <TableCell>{canEdit ? <RackEditTrigger row={r} locations={locations} /> : null}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

#### `rack-filters.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';
import type { MasterLocation } from '@/lib/api/schemas';
import { formatLocation } from '@/lib/master/format';

const ALL = '__ALL__';
const KEYS = ['rackLocCdLike', 'locId'] as const;

export function RackFilters({ locations }: { locations: Map<number, MasterLocation> }) {
  const { values, set } = useUrlFilters({ keys: KEYS });
  const [draft, setDraft] = useState(values.rackLocCdLike);
  useEffect(() => setDraft(values.rackLocCdLike), [values.rackLocCdLike]);

  const locOptions = Array.from(locations.values()).map((l) => ({ value: String(l.locId), label: formatLocation(l) }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== values.rackLocCdLike && set({ rackLocCdLike: draft })}
        onKeyDown={(e) => { if (e.key === 'Enter') draft !== values.rackLocCdLike && set({ rackLocCdLike: draft }); }}
        placeholder="🔍 렉 코드 검색"
        className="h-9 w-64 text-sm"
      />
      <Select
        value={values.locId || ALL}
        onValueChange={(v) => set({ locId: v === ALL ? '' : v })}
      >
        <SelectTrigger className="h-9 w-56 text-sm"><SelectValue placeholder="위치 전체" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>위치 전체</SelectItem>
          {locOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
```

#### `rack-form-fields.tsx`
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { RackFormValues } from './schema';
import type { MasterLocation } from '@/lib/api/schemas';
import { TextField } from '@/components/forms/text-field';
import { MasterSelectField } from '@/components/forms/master-select-field';
import { formatLocation } from '@/lib/master/format';

export function RackFormFields({ control, locations }: { control: Control<RackFormValues>; locations: Map<number, MasterLocation> }) {
  const opts = Array.from(locations.values()).map((l) => ({ value: l.locId, label: formatLocation(l) }));
  return (
    <div className="grid grid-cols-1 gap-3">
      <TextField control={control} name="rackLocCd" label="렉 코드" required placeholder="예: A-01" />
      <MasterSelectField control={control} name="locId" label="위치" options={opts} placeholder="위치 선택" />
      <TextField control={control} name="remk" label="메모" placeholder="자유 메모" />
    </div>
  );
}
```

#### `rack-create-dialog.tsx`
```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { rackFormSchema, defaultRackFormValues, toRackCreate, type RackFormValues } from './schema';
import { useCreateRack } from './hooks';
import { RackFormFields } from './rack-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation } from '@/lib/api/schemas';

export function RackCreateButton({ locations }: { locations: Map<number, MasterLocation> }) {
  const [open, setOpen] = useState(false);
  const form = useForm<RackFormValues>({ resolver: zodResolver(rackFormSchema), defaultValues: defaultRackFormValues });
  const create = useCreateRack();

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    try {
      await create.mutateAsync({ payload: toRackCreate(v) });
      toast.success('등록되었습니다.');
      form.reset(defaultRackFormValues);
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ 등록</Button>
      <MasterFormDialog
        open={open}
        onOpenChange={(o) => { if (!create.isPending) setOpen(o); }}
        title="렉 등록"
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <RackFormFields control={form.control} locations={locations} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
```

#### `rack-edit-dialog.tsx`
```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '../shared/master-form-dialog';
import { rackFormSchema, toRackUpdate, type RackFormValues } from './schema';
import { useUpdateRack } from './hooks';
import { RackFormFields } from './rack-form-fields';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation, MasterRack } from '@/lib/api/schemas';

export function RackEditTrigger({ row, locations }: { row: MasterRack; locations: Map<number, MasterLocation> }) {
  const [open, setOpen] = useState(false);
  const form = useForm<RackFormValues>({
    resolver: zodResolver(rackFormSchema),
    defaultValues: { rackLocCd: row.rackLocCd, locId: row.locId, remk: row.remk ?? '' },
  });
  const update = useUpdateRack(row.rackId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      await update.mutateAsync({ payload: toRackUpdate(form.getValues()) });
      toast.success('수정되었습니다.');
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>편집</Button>
      <MasterFormDialog
        open={open}
        onOpenChange={(o) => { if (!update.isPending) setOpen(o); }}
        title={`렉 편집 — ${row.rackLocCd}`}
        isPending={update.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <RackFormFields control={form.control} locations={locations} />
        </Form>
      </MasterFormDialog>
    </>
  );
}
```

- [ ] **typecheck + lint + commit (single commit for full rack domain):**
```bash
pnpm typecheck && pnpm lint
git add src/components/features/master/rack
git commit -m "feat(master): rack domain (schema, hooks, table, filters, create/edit dialogs)"
```

---

### Task 4: Vendor domain

Same structure as rack. Differences:
- `useYn` field in form (ADMIN-gated checkbox).
- No master select (no foreign key).
- Filter by `vendorTpCd` (free string, but provide common options).

#### `schema.ts`
```ts
import { z } from 'zod';
import type { RegisterVendorRequest, UpdateVendorRequest } from '@/api/generated/schemas';

const Yn = z.enum(['Y', 'N']);

export const vendorFormSchema = z.object({
  vendorNm: z.string().min(1, '필수입니다.').max(100),
  vendorTpCd: z.string().optional().or(z.literal('')),
  chgrNm: z.string().optional().or(z.literal('')),
  chgrEmailAddr: z.string().email('이메일 형식이 아닙니다.').optional().or(z.literal('')),
  chgrTelNo: z.string().optional().or(z.literal('')),
  remk: z.string().max(500).optional().or(z.literal('')),
  useYn: Yn.default('Y'),
});
export type VendorFormValues = z.infer<typeof vendorFormSchema>;

export const defaultVendorFormValues: VendorFormValues = {
  vendorNm: '', vendorTpCd: '', chgrNm: '', chgrEmailAddr: '', chgrTelNo: '', remk: '', useYn: 'Y',
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toVendorCreate(v: VendorFormValues): RegisterVendorRequest {
  return {
    vendorNm: v.vendorNm,
    vendorTpCd: blank(v.vendorTpCd),
    chgrNm: blank(v.chgrNm),
    chgrEmailAddr: blank(v.chgrEmailAddr),
    chgrTelNo: blank(v.chgrTelNo),
    remk: blank(v.remk),
  };
}
export function toVendorUpdate(v: VendorFormValues): UpdateVendorRequest {
  return { ...toVendorCreate(v), useYn: v.useYn };
}
```

#### `hooks.ts`
Same shape as rack — `useCreateVendor` / `useUpdateVendor(vendorId)`. URLs `/api/v1/master/vendors`. Cache key `['master', 'vendors', 'list']`.

#### `vendor-form-fields.tsx`
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { VendorFormValues } from './schema';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';
import { YnField } from '@/components/forms/yn-field';
import { hasRole } from '@/lib/auth/roles';

const TYPE_OPTIONS = [
  { value: 'HW', label: 'HW' },
  { value: 'SW', label: 'SW' },
  { value: 'MSP', label: 'MSP' },
  { value: 'CSP', label: 'CSP' },
  { value: 'OTHER', label: 'OTHER' },
];

export function VendorFormFields({ control, myRoles, mode }: { control: Control<VendorFormValues>; myRoles: readonly string[]; mode: 'create' | 'edit' }) {
  const showActiveToggle = mode === 'edit' && hasRole(myRoles, 'ADMIN');
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TextField control={control} name="vendorNm" label="벤더 명" required />
      <SelectField control={control} name="vendorTpCd" label="유형" options={TYPE_OPTIONS} placeholder="유형 선택" />
      <TextField control={control} name="chgrNm" label="담당자" />
      <TextField control={control} name="chgrEmailAddr" label="이메일" />
      <TextField control={control} name="chgrTelNo" label="연락처" />
      <TextField control={control} name="remk" label="메모" />
      {showActiveToggle ? <YnField control={control} name="useYn" label="활성" /> : null}
    </div>
  );
}
```

#### `vendor-table.tsx`, `vendor-filters.tsx`, `vendor-create-dialog.tsx`, `vendor-edit-dialog.tsx`, `columns.ts`
Same shape as rack. The table has a "활성" badge column (info green Y, muted gray N). Filters: `vendorNmLike` (text search) + `vendorTpCd` (select) + `<ActiveToggle />`. Edit dialog passes `myRoles` to fields.

#### `vendor-table.tsx`:
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MasterVendor } from '@/lib/api/schemas';
import { VendorEditTrigger } from './vendor-edit-dialog';

interface Props {
  rows: MasterVendor[];
  canEdit: boolean;
  myRoles: readonly string[];
}

export function VendorTable({ rows, canEdit, myRoles }: Props) {
  if (rows.length === 0) return <div className="p-10 text-center text-sm text-muted-foreground">조회된 벤더가 없습니다.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>활성</TableHead>
          <TableHead>벤더 명</TableHead>
          <TableHead>유형</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead>이메일</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((v) => (
          <TableRow key={v.vendorId}>
            <TableCell>{v.useYn === 'N' ? <Badge>비활성</Badge> : <Badge variant="success">활성</Badge>}</TableCell>
            <TableCell className="font-medium">{v.vendorNm}</TableCell>
            <TableCell>{v.vendorTpCd ?? '—'}</TableCell>
            <TableCell>{v.chgrNm ?? '—'}</TableCell>
            <TableCell>{v.chgrEmailAddr ?? '—'}</TableCell>
            <TableCell>{v.chgrTelNo ?? '—'}</TableCell>
            <TableCell>{canEdit ? <VendorEditTrigger row={v} myRoles={myRoles} /> : null}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

#### `vendor-filters.tsx`:
Same as rack but search key is `vendorNmLike`, plus a TYPE select using `TYPE_OPTIONS`, plus `<ActiveToggle />` from shared.

#### `vendor-create-dialog.tsx`, `vendor-edit-dialog.tsx`:
Same as rack — Edit fills with row values including `useYn`. Pass `myRoles` to `<VendorFormFields>`.

- [ ] **typecheck + commit:**
```bash
pnpm typecheck && pnpm lint
git add src/components/features/master/vendor
git commit -m "feat(master): vendor domain (with useYn toggle, ADMIN-gated)"
```

---

### Task 5: Employee domain

Same structure as vendor. Form needs DEPT master select. Form schema mirrors `RegisterEmpRequest`:

#### `schema.ts`
```ts
import { z } from 'zod';
import type { RegisterEmpRequest, UpdateEmpRequest } from '@/api/generated/schemas';

const Yn = z.enum(['Y', 'N']);

export const employeeFormSchema = z.object({
  empNm: z.string().min(1, '필수입니다.').max(50),
  worldId: z.string().optional().or(z.literal('')),
  emailAddr: z.string().email('이메일 형식이 아닙니다.').optional().or(z.literal('')),
  telNo: z.string().optional().or(z.literal('')),
  deptId: z.number().int().optional(),
  useYn: Yn.default('Y'),
});
export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const defaultEmployeeFormValues: EmployeeFormValues = {
  empNm: '', worldId: '', emailAddr: '', telNo: '', deptId: undefined, useYn: 'Y',
};

const blank = (v: string | undefined) => (v && v.length > 0 ? v : undefined);

export function toEmployeeCreate(v: EmployeeFormValues): RegisterEmpRequest {
  return {
    empNm: v.empNm,
    worldId: blank(v.worldId),
    emailAddr: blank(v.emailAddr),
    telNo: blank(v.telNo),
    deptId: v.deptId,
  };
}
export function toEmployeeUpdate(v: EmployeeFormValues): UpdateEmpRequest {
  return { ...toEmployeeCreate(v), useYn: v.useYn };
}
```

#### Hooks, table, filters, dialog: same shape as vendor. Filter keys: `empNmLike`, `worldIdLike`, `deptId`, plus ActiveToggle.

#### `employee-form-fields.tsx` includes `<MasterSelectField name="deptId" ...>` over depts Map.

- [ ] **typecheck + commit:**
```bash
pnpm typecheck && pnpm lint
git add src/components/features/master/employee
git commit -m "feat(master): employee domain (with dept select + useYn toggle)"
```

---

## Phase C — Routes + sidebar

### Task 6: 3 routes

**Files (all new):**
- `src/app/(app)/rack/page.tsx`
- `src/app/(app)/vendor/page.tsx`
- `src/app/(app)/contact/page.tsx`

Each follows this pattern (rack example):
```tsx
import { getMyProfile } from '@/lib/auth/me';
import { hasRole } from '@/lib/auth/roles';
import { serverFetch } from '@/lib/api/server-fetch';
import { RacksPageSchema } from '@/lib/api/schemas';
import { parsePaging, toBackendPageable } from '@/lib/api/paging';
import { getLocationsMap } from '@/lib/master/server';
import { MasterListShell } from '@/components/features/master/shared/master-list-shell';
import { RackTable } from '@/components/features/master/rack/rack-table';
import { RackFilters } from '@/components/features/master/rack/rack-filters';
import { RackCreateButton } from '@/components/features/master/rack/rack-create-dialog';
import { ServerListPagination } from '@/components/features/server/list/server-list-pagination';
import { RoleGuard } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

interface SearchParams { rackLocCdLike?: string; locId?: string; page?: string; size?: string; sort?: string }

function pickEntries(sp: SearchParams): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(sp)) if (typeof v === 'string') out.push([k, v]);
  return out;
}

export default async function RackListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const paging = parsePaging(new URLSearchParams(pickEntries(sp)));
  const back = toBackendPageable(paging);

  const qs = new URLSearchParams({
    page: String(back.page), size: String(back.size), sort: back.sort,
  });
  if (sp.rackLocCdLike) qs.set('rackLocCdLike', sp.rackLocCdLike);
  if (sp.locId) qs.set('locId', sp.locId);

  const [profile, raw, locations] = await Promise.all([
    getMyProfile(),
    serverFetch<unknown>(`/api/v1/master/racks?${qs.toString()}`),
    getLocationsMap(),
  ]);
  const page = RacksPageSchema.parse(raw);
  const myRoles = profile?.roles ?? [];
  const canEdit = hasRole(myRoles, 'OPERATOR');

  return (
    <MasterListShell
      title="렉 관리"
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RackFilters locations={locations} />
          <RoleGuard role="OPERATOR" myRoles={myRoles}>
            <RackCreateButton locations={locations} />
          </RoleGuard>
        </div>
      }
      pagination={<ServerListPagination meta={page.page} />}
    >
      <RackTable rows={page.content} locations={locations} canEdit={canEdit} />
    </MasterListShell>
  );
}
```

Vendor and contact pages follow the same pattern with their own filter keys, schemas, and components. Contact (employee) additionally calls `getDeptsMap()` and passes to filters/form fields.

- [ ] **typecheck + lint + 3 separate commits (one per route):**
```bash
pnpm typecheck && pnpm lint
git add 'src/app/(app)/rack/page.tsx'
git commit -m "feat(servers): /rack route — master list + filters + register"

git add 'src/app/(app)/vendor/page.tsx'
git commit -m "feat(servers): /vendor route — master list with active toggle"

git add 'src/app/(app)/contact/page.tsx'
git commit -m "feat(servers): /contact route — employees with dept filter and active toggle"
```

(If you find it more pragmatic, you can squash these into one commit `feat(master): routes for rack/vendor/contact` — but separate commits make later cherry-pick easier.)

---

### Task 7: Activate sidebar items

**File:** `src/components/layout/sidebar.tsx`

Edit the menu list:
- 인프라 그룹: `렉 관리` (`/rack`) — remove `disabled: true`.
- 자산 그룹: `벤더` (`/vendor`) and `담당자` (`/contact`) — remove `disabled: true`.

```bash
pnpm typecheck && pnpm lint
git add src/components/layout/sidebar.tsx
git commit -m "feat(layout): activate 렉/벤더/담당자 sidebar menus"
```

---

## Phase D — Verify

### Task 8: ADR + gap doc + final verify

**Edits:**

`docs/architecture.md` — append to §7:
```md
- **2026-05-07 (cycle #3)**: Master CRUD 3종 — 렉/벤더/담당자. 모달 기반 등록/편집 패턴 정착(`features/master/shared/master-form-dialog.tsx`). vendor·employee의 useYn 활성 토글 (ADMIN-only 편집, 모든 사용자 "비활성 포함" 토글). 렉은 비활성 개념 자체 없음 (백엔드 UpdateRackRequest에 useYn 부재). DEPT prefetch 추가 (`getDeptsMap`).
```

`docs/api-gaps-and-improvements.md`:
- §10 cycle #3 row: change to `✅` and update "해결한 갭" / "발견한 갭" columns based on what surfaced during implementation. Keep blank/TBD for items still ambiguous.
- §4 (사이드바 메뉴): mark 4.1 — 4.x rows that this cycle resolves (none — these are the *non-master* menu items still open).

**Final verification (must pass):**
```bash
source ~/.nvm/nvm.sh && nvm use 20
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Commit:
```bash
git add docs/architecture.md docs/api-gaps-and-improvements.md
git commit -m "docs(adr): cycle #3 (master crud) decisions + gap update"
```

---

## Verification Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass
- [ ] USER: 3 list pages render. No "+ 등록" / "편집" buttons.
- [ ] OPERATOR: register + edit work for all 3.
- [ ] ADMIN: vendor/employee edit dialog shows "활성" toggle.
- [ ] Vendor list "비활성 포함" toggle changes URL `useYn` and result set.
- [ ] Sidebar 3 items active.

---

## Notes

- Reuse `ServerListPagination` from `features/server/list/` for these master pages — its only dependency is `PageMeta`. If you find this odd, you can rename/move it to `components/shared/pagination.tsx` in a follow-up; not in scope for this cycle.
- `RackEditTrigger` lives in the same file as `rack-edit-dialog.tsx` (the trigger button + dialog state are tightly coupled — keep them together).
- The `<ActiveToggle />` component encodes a UX policy: default = "include all (no filter)". If your taste prefers "default = active only", flip the default in URL (`useYn=Y` initially) — don't forget to update tests.
