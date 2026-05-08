# 서버 관계 (Relations) Implementation Plan

**Goal:** Activate CI detail "관계" tab — bidirectional read, single add/delete via single-relation endpoints.

**Spec:** `docs/superpowers/specs/2026-05-08-relations-design.md`.

**Last commit:** `e16156e`.

---

## Tasks

### Task 1: Relation Zod schema + tolerant parsing

Create `src/lib/api/schemas/relation.ts`:
```ts
import { z } from 'zod';

export const RelationItemSchema = z.object({
  relId: z.number().int(),
  sourcCiId: z.number().int(),
  trgtCiId: z.number().int(),
  relTpId: z.number().int(),
  fwdLblNm: z.string().optional(),
  bwdLblNm: z.string().optional(),
  sourcCiNm: z.string().optional(),
  trgtCiNm: z.string().optional(),
  remk: z.string().optional(),
});
export type RelationItem = z.infer<typeof RelationItemSchema>;

/** Backend may return either {forward, backward} or a flat list. We accept both. */
export const CiRelationsResponseSchema = z.union([
  z.object({
    forward: z.array(RelationItemSchema),
    backward: z.array(RelationItemSchema),
  }),
  z.array(RelationItemSchema),
]);
export type CiRelationsResponse = z.infer<typeof CiRelationsResponseSchema>;

export interface CiRelationsGrouped {
  forward: RelationItem[];
  backward: RelationItem[];
}

/** Normalize either backend shape into {forward, backward} given the focal ciId. */
export function groupRelations(raw: CiRelationsResponse, ciId: number): CiRelationsGrouped {
  if (Array.isArray(raw)) {
    const forward: RelationItem[] = [];
    const backward: RelationItem[] = [];
    for (const r of raw) {
      if (r.sourcCiId === ciId) forward.push(r);
      else if (r.trgtCiId === ciId) backward.push(r);
    }
    return { forward, backward };
  }
  return { forward: raw.forward, backward: raw.backward };
}
```

Export from `src/lib/api/schemas/index.ts`:
```ts
export * from './relation';
```

Tests `src/lib/api/schemas/relation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CiRelationsResponseSchema, groupRelations } from './relation';

describe('CiRelationsResponseSchema', () => {
  it('parses {forward, backward} shape', () => {
    const r = CiRelationsResponseSchema.parse({
      forward: [{ relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 }],
      backward: [{ relId: 2, sourcCiId: 300, trgtCiId: 100, relTpId: 1 }],
    });
    expect(Array.isArray(r) || 'forward' in r).toBe(true);
  });
  it('parses flat array shape', () => {
    const r = CiRelationsResponseSchema.parse([
      { relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 },
    ]);
    expect(Array.isArray(r)).toBe(true);
  });
});

describe('groupRelations', () => {
  it('groups flat array by direction', () => {
    const grouped = groupRelations([
      { relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 },
      { relId: 2, sourcCiId: 300, trgtCiId: 100, relTpId: 1 },
      { relId: 3, sourcCiId: 100, trgtCiId: 400, relTpId: 1 },
    ], 100);
    expect(grouped.forward).toHaveLength(2);
    expect(grouped.backward).toHaveLength(1);
  });
  it('passes through {forward, backward} shape', () => {
    const grouped = groupRelations({
      forward: [{ relId: 1, sourcCiId: 100, trgtCiId: 200, relTpId: 1 }],
      backward: [],
    }, 100);
    expect(grouped.forward).toHaveLength(1);
    expect(grouped.backward).toHaveLength(0);
  });
});
```

Verify + commit:
```bash
source ~/.nvm/nvm.sh && nvm use 20
pnpm test -- src/lib/api/schemas/relation.test.ts
pnpm typecheck && pnpm lint
git add src/lib/api/schemas/relation.ts src/lib/api/schemas/relation.test.ts src/lib/api/schemas/index.ts
git commit -m "feat(api): relation Zod schemas (tolerant of bidirectional or flat response)"
```

---

### Task 2: Relation hooks + UI components

Create `src/components/features/relation/hooks.ts`:
```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import {
  CiRelationsResponseSchema, groupRelations, type CiRelationsGrouped,
} from '@/lib/api/schemas';
import type { RegisterRelationRequest } from '@/api/generated/schemas';

const RelationCreated = z.object({ relId: z.number().int() });

export function useCiRelations(ciId: number) {
  return useQuery<CiRelationsGrouped>({
    queryKey: ['cis', 'relations', ciId],
    queryFn: async () => {
      const raw = await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/relations`);
      const parsed = CiRelationsResponseSchema.parse(raw);
      return groupRelations(parsed, ciId);
    },
  });
}

export function useCreateRelation(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: RegisterRelationRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/relations', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return RelationCreated.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cis', 'relations', ciId] }),
  });
}

export function useDeleteRelation(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { relId: number; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/relations/${input.relId}`, {
        method: 'DELETE',
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cis', 'relations', ciId] }),
  });
}
```

Create `src/components/features/relation/relation-add-dialog.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { MasterFormDialog } from '@/components/features/master/shared/master-form-dialog';
import { TextField } from '@/components/forms/text-field';
import { NumberField } from '@/components/forms/number-field';
import { SelectField } from '@/components/forms/select-field';
import { useCreateRelation } from './hooks';
import { formatErrorForToast } from '@/lib/api/error-messages';

const formSchema = z.object({
  direction: z.enum(['FWD', 'BWD']),
  counterpartCiId: z.number().int().min(1, '필수입니다.'),
  relTpId: z.number().int().min(1, '필수입니다.'),
  remk: z.string().max(500).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof formSchema>;

const DIRECTION_OPTIONS = [
  { value: 'FWD', label: '이 CI → 상대 (의존함)' },
  { value: 'BWD', label: '상대 → 이 CI (의존받음)' },
];

interface Props { ciId: number }

export function RelationAddButton({ ciId }: Props) {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { direction: 'FWD', counterpartCiId: 0, relTpId: 0, remk: '' },
  });
  const create = useCreateRelation(ciId);

  async function handleSubmit() {
    const valid = await form.trigger();
    if (!valid) return;
    const v = form.getValues();
    const payload = v.direction === 'FWD'
      ? { sourcCiId: ciId, trgtCiId: v.counterpartCiId, relTpId: v.relTpId, remk: v.remk || undefined }
      : { sourcCiId: v.counterpartCiId, trgtCiId: ciId, relTpId: v.relTpId, remk: v.remk || undefined };
    try {
      await create.mutateAsync({ payload });
      toast.success('관계가 추가되었습니다.');
      form.reset();
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ 관계 추가</Button>
      <MasterFormDialog
        open={open}
        onOpenChange={(o) => { if (!create.isPending) setOpen(o); }}
        title="관계 추가"
        description="자기참조 / 중복 관계는 백엔드가 거절합니다."
        isPending={create.isPending}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <div className="grid grid-cols-1 gap-3">
            <SelectField control={form.control} name="direction" label="방향" options={DIRECTION_OPTIONS} />
            <NumberField control={form.control} name="counterpartCiId" label="상대 CI ID" />
            <NumberField control={form.control} name="relTpId" label="관계 타입 ID" />
            <TextField control={form.control} name="remk" label="비고" />
          </div>
        </Form>
      </MasterFormDialog>
    </>
  );
}
```

Create `src/components/features/relation/relation-delete-button.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteRelation } from './hooks';
import { formatErrorForToast } from '@/lib/api/error-messages';

interface Props { ciId: number; relId: number; label: string }

export function RelationDeleteButton({ ciId, relId, label }: Props) {
  const [open, setOpen] = useState(false);
  const del = useDeleteRelation(ciId);

  async function handleConfirm() {
    try {
      await del.mutateAsync({ relId });
      toast.success('관계가 삭제되었습니다.');
      setOpen(false);
    } catch (e) {
      const t = formatErrorForToast(e);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="관계 삭제">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!del.isPending) setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>관계 삭제</DialogTitle>
            <DialogDescription>
              {label} 관계를 삭제합니다. 이 작업은 hard delete이며 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={del.isPending}>취소</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={del.isPending}>
              {del.isPending ? '처리 중…' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

Verify + commit:
```bash
pnpm typecheck && pnpm lint
git add src/components/features/relation
git commit -m "feat(relation): hooks + add dialog + delete confirm button"
```

---

### Task 3: Relations tab + activate in ServerDetailTabs

Create `src/components/features/server/detail/tabs/relations-tab.tsx`:
```tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCiRelations } from '@/components/features/relation/hooks';
import { RelationAddButton } from '@/components/features/relation/relation-add-dialog';
import { RelationDeleteButton } from '@/components/features/relation/relation-delete-button';
import type { RelationItem } from '@/lib/api/schemas';

interface Props { ciId: number; canEdit: boolean }

function RelationTable({
  ciId, rows, direction, canEdit,
}: { ciId: number; rows: RelationItem[]; direction: 'forward' | 'backward'; canEdit: boolean }) {
  if (rows.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">관계가 없습니다.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{direction === 'forward' ? '의존 대상 CI' : '의존하는 CI'}</TableHead>
          <TableHead>라벨</TableHead>
          <TableHead>관계 타입</TableHead>
          <TableHead>비고</TableHead>
          {canEdit ? <TableHead className="w-[60px]"></TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const counterpartId = direction === 'forward' ? r.trgtCiId : r.sourcCiId;
          const counterpartName = direction === 'forward' ? r.trgtCiNm : r.sourcCiNm;
          const label = direction === 'forward' ? r.fwdLblNm : r.bwdLblNm;
          return (
            <TableRow key={r.relId}>
              <TableCell className="font-medium">
                {counterpartName ?? `CI #${counterpartId}`}
              </TableCell>
              <TableCell>{label ? <Badge variant="info">{label}</Badge> : '—'}</TableCell>
              <TableCell>{r.relTpId}</TableCell>
              <TableCell className="text-muted-foreground">{r.remk ?? '—'}</TableCell>
              {canEdit ? (
                <TableCell>
                  <RelationDeleteButton ciId={ciId} relId={r.relId} label={`${counterpartName ?? counterpartId}`} />
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function RelationsTab({ ciId, canEdit }: Props) {
  const { data, isLoading, isError } = useCiRelations(ciId);

  if (isLoading) return <div className="p-4"><Skeleton className="h-24 w-full" /></div>;
  if (isError) return <div className="p-6 text-sm text-muted-foreground">관계 정보를 불러오지 못했습니다.</div>;
  if (!data) return null;

  return (
    <div>
      {canEdit ? (
        <div className="flex justify-end border-b border-border/60 px-4 py-2">
          <RelationAddButton ciId={ciId} />
        </div>
      ) : null}
      <div className="space-y-4 p-4">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">이 CI가 의존하는 것</h3>
          <RelationTable ciId={ciId} rows={data.forward} direction="forward" canEdit={canEdit} />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">이 CI에 의존하는 것</h3>
          <RelationTable ciId={ciId} rows={data.backward} direction="backward" canEdit={canEdit} />
        </section>
      </div>
    </div>
  );
}
```

Modify `src/components/features/server/detail/server-detail-tabs.tsx` — activate the relations tab:
- Remove the disabled wrapper for `'relations'` (keep history and connection-map disabled).
- Import `RelationsTab` and add `<TabsContent value="relations"><RelationsTab ciId={ciId} canEdit={canEdit} /></TabsContent>`.

Read the file first to see the exact structure before editing.

Verify + commit:
```bash
pnpm typecheck && pnpm lint
git add src/components/features/server/detail/tabs/relations-tab.tsx src/components/features/server/detail/server-detail-tabs.tsx
git commit -m "feat(server): activate Relations tab (read + add/delete single)"
```

---

### Task 4: ADR + gap doc + final verify

`docs/architecture.md` §7 append:
```md
- **2026-05-08 (cycle #6)**: 서버 관계 — read + 단건 추가/삭제. 양방향 표시(forward/backward 두 섹션). Diff sync PUT은 follow-up 사이클에서 (전체 일괄 편집 UI). 백엔드 응답 형태 미상이라 Zod union으로 두 모양(`{forward,backward}` vs flat array) 모두 수용.
```

`docs/api-gaps-and-improvements.md`:
- §10 cycle #6 row → ✅ partial. 신규 갭:
  - `/relTypes` endpoint 부재 → relTpId 입력 NumberField로 대체
  - GET /cis/{ciId}/relations 응답 형태 미상 → Zod union 임시 수용
- §6.1 → 결정 칼럼 `[backend] /relTypes endpoint 추가 후 라벨 표시 가능`

Final verify:
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add docs/architecture.md docs/api-gaps-and-improvements.md
git commit -m "docs(adr): cycle #6 (relations read + single edit) decisions + gap update"
```

---

## Verification Checklist

- [ ] `pnpm test` passes (relation schema tests included, +4)
- [ ] `pnpm build` succeeds
- [ ] CI 상세 → 관계 탭 활성, 두 섹션 표시
- [ ] OPERATOR — 관계 추가 모달 동작, 삭제 확인 다이얼로그 동작
- [ ] USER — 추가/삭제 버튼 미표시
