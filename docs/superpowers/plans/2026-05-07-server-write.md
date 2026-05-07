# 서버 쓰기 (등록·편집·폐기) Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`).

**Goal:** Activate write paths for SERVER CIs — registration, edit, and decommission — atop the foundations established in cycle #1.

**Architecture:** Server Components prefetch data + RBAC-redirect; client form components own RHF state and call mutation hooks that hit cid-api through `apiFetch` with optional `X-Change-Reason`. Decommission is a modal dialog from the detail header. SERVER-only this cycle; other ciTpCds get later cycles.

**Tech Stack:** Same as cycle #1 + RHF + zodResolver. New shadcn primitive: `Dialog`.

**Spec:** `docs/superpowers/specs/2026-05-07-server-write-design.md`.

---

## File Structure (additions)

```
src/
├── components/
│   ├── forms/                              # generic RHF wrappers (NEW)
│   │   ├ form-section.tsx
│   │   ├ text-field.tsx
│   │   ├ number-field.tsx
│   │   ├ select-field.tsx
│   │   ├ yn-field.tsx
│   │   ├ date-field.tsx
│   │   └ master-select-field.tsx
│   ├── ui/dialog.tsx                       # NEW shadcn primitive
│   └── features/server/
│       ├ forms/                            # NEW
│       │   ├ schema.ts
│       │   ├ hooks.ts
│       │   ├ server-create-form.tsx
│       │   ├ server-edit-form.tsx
│       │   └ sections/
│       │     ├ basic-info-section.tsx
│       │     ├ server-spec-section.tsx
│       │     ├ server-ops-section.tsx
│       │     ├ server-flags-section.tsx
│       │     └ memo-section.tsx
│       └ detail/
│         └ decommission-dialog.tsx         # NEW
├── lib/api/
│   └ mutator.ts                            # MODIFY: changeReason option
│   └ server-fetch.ts                       # MODIFY: changeReason option
└── app/(app)/servers/
    ├ new/page.tsx                          # NEW
    └ [ciId]/edit/page.tsx                  # NEW

docs/
└ architecture.md                           # MODIFY: §7 + maybe §10
└ api-gaps-and-improvements.md              # MODIFY: cycle #2 row
```

---

## Conventions

- Same as cycle #1 (TDD where logic exists, conventional commits, typecheck/lint before commit).
- **Mutation cache invalidation single point**: only `['cis', 'list']` and `['cis', 'detail', ciId]` (no IPs/employees in this cycle).
- All form input is **strings** in RHF state; coercion to `CreateCiRequest` happens in `toCreatePayload` from schema.ts.

---

## Phase A — Cross-cutting

### Task 1: X-Change-Reason header injection (mutator + server-fetch)

**Files:**
- Modify: `src/lib/api/mutator.ts`
- Modify: `src/lib/api/server-fetch.ts`
- Modify: `src/lib/api/mutator.test.ts` (add 2 tests)
- Modify: `src/lib/api/server-fetch.test.ts` (add 1 test)

- [ ] **Step 1: Add tests for mutator**

Append to `src/lib/api/mutator.test.ts`:
```ts
describe('apiFetch X-Change-Reason', () => {
  it('attaches X-Change-Reason header when changeReason option provided', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: null }));
    await apiFetch('/api/proxy/foo', { changeReason: 'OS upgrade' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Change-Reason']).toBe('OS upgrade');
  });

  it('does not attach X-Change-Reason when value is empty/undefined', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: null }));
    await apiFetch('/api/proxy/foo', { changeReason: '' });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Change-Reason']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — confirm fail**
```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm test -- src/lib/api/mutator.test.ts
```

- [ ] **Step 3: Update mutator.ts**

In `src/lib/api/mutator.ts`, change the `apiFetch` signature:
```ts
export interface ApiFetchInit extends RequestInit {
  changeReason?: string;
}

export async function apiFetch<T>(url: string, init?: ApiFetchInit): Promise<T> {
  const { changeReason, ...rest } = init ?? {};
  // ... existing body ...
  // When building headers:
  //   ...callerHeaders,
  //   ...(changeReason ? { 'X-Change-Reason': changeReason } : {}),
  //   'X-Trace-Id': traceId,
  // ... pass `rest` (without changeReason) to fetch ...
}
```

The change: extract `changeReason` from init, conditionally inject between caller headers and X-Trace-Id, and pass `rest` (not init) into fetch.

- [ ] **Step 4: Add server-fetch test**

Append to `src/lib/api/server-fetch.test.ts`:
```ts
it('attaches X-Change-Reason when changeReason option provided', async () => {
  const { getSession } = await import('@/lib/auth/server');
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    tokens: { accessToken: 'a', refreshToken: 'r' },
  });
  fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, error: null }));

  const { serverFetch } = await import('./server-fetch');
  await serverFetch('/api/v1/foo', { method: 'POST', changeReason: 'IDC migration' });

  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect((init.headers as Record<string, string>)['X-Change-Reason']).toBe('IDC migration');
});
```

- [ ] **Step 5: Update server-fetch.ts** — same pattern as mutator. Add `changeReason?: string` to its init type, conditional inject in `callOnce`'s headers.

- [ ] **Step 6: Run all tests**
```bash
pnpm test -- src/lib/api/
pnpm typecheck && pnpm lint
```

- [ ] **Step 7: Commit**
```bash
git add src/lib/api/mutator.ts src/lib/api/mutator.test.ts src/lib/api/server-fetch.ts src/lib/api/server-fetch.test.ts
git commit -m "feat(api): X-Change-Reason header option in mutator + server-fetch"
```

---

### Task 2: shadcn Dialog primitive

**Files:**
- Create: `src/components/ui/dialog.tsx`

- [ ] **Step 1: Add Radix Dialog**
```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm add @radix-ui/react-dialog
```

- [ ] **Step 2: Create `src/components/ui/dialog.tsx`**
```tsx
'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-modal',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">닫기</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-2', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
```

- [ ] **Step 3: typecheck**
```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**
```bash
git add package.json pnpm-lock.yaml src/components/ui/dialog.tsx
git commit -m "feat(ui): shadcn dialog primitive"
```

---

### Task 3: Generic form field helpers

**Files:**
- Create: `src/components/forms/form-section.tsx`
- Create: `src/components/forms/text-field.tsx`
- Create: `src/components/forms/number-field.tsx`
- Create: `src/components/forms/select-field.tsx`
- Create: `src/components/forms/yn-field.tsx`
- Create: `src/components/forms/date-field.tsx`
- Create: `src/components/forms/master-select-field.tsx`

These wrap RHF `Controller` to bind to shadcn `Form*` primitives. Each takes a `name` (RHF path) and `label`. Look at existing `src/components/ui/form.tsx` to confirm the FormItem/FormLabel/FormControl/FormMessage API.

- [ ] **Step 1: Read existing form primitives**
```bash
cat src/components/ui/form.tsx
```

- [ ] **Step 2: Implement form-section.tsx**
```tsx
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Implement text-field.tsx**
```tsx
'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export function TextField<TForm extends FieldValues>({ control, name, label, placeholder, required }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{required ? <span className="ml-0.5 text-destructive">*</span> : null}</FormLabel>
          <FormControl>
            <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder={placeholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

- [ ] **Step 4: Implement number-field.tsx** — same shape as TextField but `type="number"` and onChange uses `e.target.valueAsNumber` (or empty string when invalid):
```tsx
'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  unit?: string;
}

export function NumberField<TForm extends FieldValues>({ control, name, label, unit }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}{unit ? <span className="ml-1 text-xs text-muted-foreground">({unit})</span> : null}</FormLabel>
          <FormControl>
            <Input
              type="number"
              {...field}
              value={field.value === undefined || field.value === null ? '' : String(field.value)}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === '' ? undefined : Number(v));
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

- [ ] **Step 5: Implement select-field.tsx** — wraps shadcn `Select`. Same `__ALL__` sentinel pattern is unnecessary here (no "전체" option in forms).
```tsx
'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Option { value: string; label: string }
interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  options: Option[];
  placeholder?: string;
}

export function SelectField<TForm extends FieldValues>({ control, name, label, options, placeholder }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select value={(field.value as string | undefined) ?? ''} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder={placeholder ?? '선택'} /></SelectTrigger>
              <SelectContent>
                {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

- [ ] **Step 6: Implement yn-field.tsx**
```tsx
'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
}

export function YnField<TForm extends FieldValues>({ control, name, label }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center gap-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value === 'Y'}
              onCheckedChange={(c) => field.onChange(c ? 'Y' : 'N')}
            />
          </FormControl>
          <FormLabel className="cursor-pointer">{label}</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

- [ ] **Step 7: Implement date-field.tsx**
```tsx
'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
}

export function DateField<TForm extends FieldValues>({ control, name, label }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="date" {...field} value={(field.value as string | undefined) ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

- [ ] **Step 8: Implement master-select-field.tsx**
```tsx
'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Option { value: number; label: string }
interface Props<TForm extends FieldValues> {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  label: string;
  options: Option[];
  placeholder?: string;
}

export function MasterSelectField<TForm extends FieldValues>({ control, name, label, options, placeholder }: Props<TForm>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select
              value={field.value === undefined || field.value === null ? '' : String(field.value)}
              onValueChange={(v) => field.onChange(v === '' ? undefined : Number(v))}
            >
              <SelectTrigger><SelectValue placeholder={placeholder ?? '선택'} /></SelectTrigger>
              <SelectContent>
                {options.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

- [ ] **Step 9: typecheck + lint**
```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 10: Commit**
```bash
git add src/components/forms
git commit -m "feat(forms): generic RHF wrappers (text/number/select/yn/date/master)"
```

---

## Phase B — Domain (forms + hooks + dialog)

### Task 4: Form schema + payload converters

**Files:**
- Create: `src/components/features/server/forms/schema.ts`
- Create: `src/components/features/server/forms/schema.test.ts`

- [ ] **Step 1: Write tests**

`schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { serverFormSchema, toCreatePayload, defaultServerFormValues } from './schema';

describe('serverFormSchema', () => {
  it('rejects empty ciNm', () => {
    const r = serverFormSchema.safeParse({ ...defaultServerFormValues, ciNm: '' });
    expect(r.success).toBe(false);
  });
  it('accepts minimal valid form', () => {
    const r = serverFormSchema.safeParse({ ...defaultServerFormValues, ciNm: 'wms-web-99' });
    expect(r.success).toBe(true);
  });
  it('coerces number fields from strings', () => {
    const r = serverFormSchema.safeParse({
      ...defaultServerFormValues,
      ciNm: 'x', cpucoreCnt: 8, memoryCapa: 32, diskCapa: 500,
    });
    expect(r.success).toBe(true);
  });
});

describe('toCreatePayload', () => {
  it('produces a CreateCiRequest with ciTpCd=SERVER and serverData populated', () => {
    const payload = toCreatePayload({
      ...defaultServerFormValues,
      ciNm: 'wms-web-99',
      ciBizwrkNm: 'WMS',
      envrnGpCd: 'PROD',
      grdCd: 'A',
      locId: 1,
      hostNm: 'wms-web-99',
      cpucoreCnt: 8,
      vendorId: 7,
      osBackupYn: 'Y',
    });
    expect(payload.ciTpCd).toBe('SERVER');
    expect(payload.ciNm).toBe('wms-web-99');
    expect(payload.serverData?.hostNm).toBe('wms-web-99');
    expect(payload.serverData?.osBackupYn).toBe('Y');
  });
  it('strips empty-string fields from output', () => {
    const payload = toCreatePayload({
      ...defaultServerFormValues,
      ciNm: 'x',
      ciBizwrkNm: '',
      ciDescp: '',
    });
    expect(payload.ciBizwrkNm).toBeUndefined();
    expect(payload.ciDescp).toBeUndefined();
  });
});
```

- [ ] **Step 2: Implement schema.ts**

```ts
import { z } from 'zod';
import type { CreateCiRequest, UpdateCiRequest, CiServerData } from '@/api/generated/schemas';

const Yn = z.enum(['Y', 'N']);

export const serverFormSchema = z.object({
  // CI common
  ciNm: z.string().min(1, '필수입니다.').max(100),
  ciBizwrkNm: z.string().max(200).optional().or(z.literal('')),
  ciRoleNm: z.string().max(200).optional().or(z.literal('')),
  envrnGpCd: z.string().optional().or(z.literal('')),
  grdCd: z.string().optional().or(z.literal('')),
  locId: z.number().int().optional(),
  ciDescp: z.string().max(2000).optional().or(z.literal('')),
  // serverData
  hostNm: z.string().max(100).optional().or(z.literal('')),
  assetId: z.string().max(100).optional().or(z.literal('')),
  ossId: z.string().max(100).optional().or(z.literal('')),
  sysVidId: z.string().max(100).optional().or(z.literal('')),
  deviceNm: z.string().max(100).optional().or(z.literal('')),
  vendorId: z.number().int().optional(),
  modelNm: z.string().max(100).optional().or(z.literal('')),
  serialNo: z.string().max(100).optional().or(z.literal('')),
  osTpNm: z.string().max(100).optional().or(z.literal('')),
  osVer: z.string().max(50).optional().or(z.literal('')),
  cpucoreCnt: z.number().int().min(0).optional(),
  memoryCapa: z.number().min(0).optional(),
  diskCapa: z.number().min(0).optional(),
  virtMchnYn: Yn.default('N'),
  virtMchnPltfomNm: z.string().max(100).optional().or(z.literal('')),
  rackId: z.number().int().optional(),
  introDt: z.string().optional().or(z.literal('')),
  maintEndDt: z.string().optional().or(z.literal('')),
  monitYn: Yn.default('N'),
  osBackupYn: Yn.default('N'),
  alarmCallYn: Yn.default('N'),
  mngYn: Yn.default('N'),
  aciLvlGrd: z.string().optional().or(z.literal('')),
  inetFacingYn: Yn.default('N'),
  // change reason (UI-only, not in payload)
  changeReason: z.string().max(500).optional().or(z.literal('')),
});

export type ServerFormValues = z.infer<typeof serverFormSchema>;

export const defaultServerFormValues: ServerFormValues = {
  ciNm: '',
  ciBizwrkNm: '',
  ciRoleNm: '',
  envrnGpCd: '',
  grdCd: '',
  locId: undefined,
  ciDescp: '',
  hostNm: '',
  assetId: '',
  ossId: '',
  sysVidId: '',
  deviceNm: '',
  vendorId: undefined,
  modelNm: '',
  serialNo: '',
  osTpNm: '',
  osVer: '',
  cpucoreCnt: undefined,
  memoryCapa: undefined,
  diskCapa: undefined,
  virtMchnYn: 'N',
  virtMchnPltfomNm: '',
  rackId: undefined,
  introDt: '',
  maintEndDt: '',
  monitYn: 'N',
  osBackupYn: 'N',
  alarmCallYn: 'N',
  mngYn: 'N',
  aciLvlGrd: '',
  inetFacingYn: 'N',
  changeReason: '',
};

const blankToUndef = (v: string | undefined): string | undefined => (v && v.length > 0 ? v : undefined);

function buildServerData(v: ServerFormValues): CiServerData {
  return {
    hostNm: blankToUndef(v.hostNm),
    assetId: blankToUndef(v.assetId),
    ossId: blankToUndef(v.ossId),
    sysVidId: blankToUndef(v.sysVidId),
    deviceNm: blankToUndef(v.deviceNm),
    vendorId: v.vendorId,
    modelNm: blankToUndef(v.modelNm),
    serialNo: blankToUndef(v.serialNo),
    osTpNm: blankToUndef(v.osTpNm),
    osVer: blankToUndef(v.osVer),
    cpucoreCnt: v.cpucoreCnt,
    memoryCapa: v.memoryCapa,
    diskCapa: v.diskCapa,
    virtMchnYn: v.virtMchnYn,
    virtMchnPltfomNm: blankToUndef(v.virtMchnPltfomNm),
    rackId: v.rackId,
    introDt: blankToUndef(v.introDt),
    maintEndDt: blankToUndef(v.maintEndDt),
    monitYn: v.monitYn,
    osBackupYn: v.osBackupYn,
    alarmCallYn: v.alarmCallYn,
    mngYn: v.mngYn,
    aciLvlGrd: blankToUndef(v.aciLvlGrd),
    inetFacingYn: v.inetFacingYn,
  };
}

export function toCreatePayload(v: ServerFormValues): CreateCiRequest {
  return {
    ciNm: v.ciNm,
    ciTpCd: 'SERVER',
    ciBizwrkNm: blankToUndef(v.ciBizwrkNm),
    ciRoleNm: blankToUndef(v.ciRoleNm),
    envrnGpCd: blankToUndef(v.envrnGpCd),
    grdCd: blankToUndef(v.grdCd),
    locId: v.locId,
    ciDescp: blankToUndef(v.ciDescp),
    serverData: buildServerData(v),
  };
}

export function toUpdatePayload(v: ServerFormValues): UpdateCiRequest {
  return {
    ciNm: v.ciNm,
    ciBizwrkNm: blankToUndef(v.ciBizwrkNm),
    ciRoleNm: blankToUndef(v.ciRoleNm),
    envrnGpCd: blankToUndef(v.envrnGpCd),
    grdCd: blankToUndef(v.grdCd),
    locId: v.locId,
    ciDescp: blankToUndef(v.ciDescp),
    serverData: buildServerData(v),
  };
}
```

- [ ] **Step 3: Run tests, green**
```bash
pnpm test -- src/components/features/server/forms/schema.test.ts
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**
```bash
git add src/components/features/server/forms/schema.ts src/components/features/server/forms/schema.test.ts
git commit -m "feat(server-forms): zod schema + create/update payload converters"
```

---

### Task 5: Mutation hooks

**File:** `src/components/features/server/forms/hooks.ts` (new)

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/api/mutator';
import type { CreateCiRequest, UpdateCiRequest } from '@/api/generated/schemas';

const CiCreatedSchema = z.object({ ciId: z.number().int() });

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: CreateCiRequest; changeReason?: string }) => {
      const data = await apiFetch<unknown>('/api/proxy/api/v1/cis', {
        method: 'POST',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
      return CiCreatedSchema.parse(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cis', 'list'] });
    },
  });
}

export function useUpdateServer(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: UpdateCiRequest; changeReason?: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}`, {
        method: 'PATCH',
        body: JSON.stringify(input.payload),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.changeReason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cis', 'list'] });
      qc.invalidateQueries({ queryKey: ['cis', 'detail', ciId] });
    },
  });
}

export function useDecommissionServer(ciId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reason: string }) => {
      await apiFetch<unknown>(`/api/proxy/api/v1/cis/${ciId}/decommission`, {
        method: 'POST',
        body: JSON.stringify({ reason: input.reason }),
        headers: { 'Content-Type': 'application/json' },
        changeReason: input.reason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cis', 'list'] });
      qc.invalidateQueries({ queryKey: ['cis', 'detail', ciId] });
    },
  });
}
```

- [ ] typecheck/lint, commit:
```bash
pnpm typecheck && pnpm lint
git add src/components/features/server/forms/hooks.ts
git commit -m "feat(server-forms): mutation hooks (create/update/decommission)"
```

---

### Task 6: Form sections (5 cards) — basic / spec / ops / flags / memo

**Files (all new):**
- `src/components/features/server/forms/sections/basic-info-section.tsx`
- `src/components/features/server/forms/sections/server-spec-section.tsx`
- `src/components/features/server/forms/sections/server-ops-section.tsx`
- `src/components/features/server/forms/sections/server-flags-section.tsx`
- `src/components/features/server/forms/sections/memo-section.tsx`

Each takes `{ control, masters }` (RHF Control + master Maps for selects).

**`basic-info-section.tsx`:**
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import type { MasterLocation } from '@/lib/api/schemas';
import { FormSection } from '@/components/forms/form-section';
import { TextField } from '@/components/forms/text-field';
import { SelectField } from '@/components/forms/select-field';
import { MasterSelectField } from '@/components/forms/master-select-field';
import { formatLocation } from '@/lib/master/format';

const ENV_OPTIONS = [
  { value: 'PROD', label: 'PROD' },
  { value: 'STAGE', label: 'STAGE' },
  { value: 'DEV', label: 'DEV' },
];
const GRADE_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

export function BasicInfoSection({
  control, locations,
}: { control: Control<ServerFormValues>; locations: Map<number, MasterLocation> }) {
  const locOptions = Array.from(locations.values()).map((l) => ({
    value: l.locId, label: formatLocation(l),
  }));
  return (
    <FormSection title="기본 정보 (CI 공통)">
      <TextField control={control} name="ciNm" label="CI 명" required placeholder="예: WMS-WEB-03" />
      <TextField control={control} name="ciBizwrkNm" label="업무영역" placeholder="예: WMS" />
      <TextField control={control} name="ciRoleNm" label="역할" placeholder="예: 웹 프론트" />
      <SelectField control={control} name="envrnGpCd" label="환경" options={ENV_OPTIONS} placeholder="환경 선택" />
      <SelectField control={control} name="grdCd" label="등급" options={GRADE_OPTIONS} placeholder="등급 선택" />
      <MasterSelectField control={control} name="locId" label="위치" options={locOptions} placeholder="위치 선택" />
    </FormSection>
  );
}
```

**`server-spec-section.tsx`:**
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import type { MasterVendor } from '@/lib/api/schemas';
import { FormSection } from '@/components/forms/form-section';
import { TextField } from '@/components/forms/text-field';
import { NumberField } from '@/components/forms/number-field';
import { MasterSelectField } from '@/components/forms/master-select-field';

export function ServerSpecSection({
  control, vendors,
}: { control: Control<ServerFormValues>; vendors: Map<number, MasterVendor> }) {
  const vendorOpts = Array.from(vendors.values()).map((v) => ({ value: v.vendorId, label: v.vendorNm }));
  return (
    <FormSection title="서버 사양 (serverData)">
      <TextField control={control} name="hostNm" label="호스트명" placeholder="예: wms-web-03" />
      <TextField control={control} name="osTpNm" label="OS 종류" placeholder="예: Rocky Linux" />
      <TextField control={control} name="osVer" label="OS 버전" placeholder="예: 9.7" />
      <NumberField control={control} name="cpucoreCnt" label="CPU 코어" unit="C" />
      <NumberField control={control} name="memoryCapa" label="메모리" unit="GB" />
      <NumberField control={control} name="diskCapa" label="디스크" unit="GB" />
      <MasterSelectField control={control} name="vendorId" label="벤더" options={vendorOpts} placeholder="벤더 선택" />
      <TextField control={control} name="modelNm" label="모델명" placeholder="예: PowerEdge R750" />
      <TextField control={control} name="serialNo" label="시리얼 번호" />
    </FormSection>
  );
}
```

**`server-ops-section.tsx`:**
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import type { MasterRack } from '@/lib/api/schemas';
import { FormSection } from '@/components/forms/form-section';
import { TextField } from '@/components/forms/text-field';
import { DateField } from '@/components/forms/date-field';
import { MasterSelectField } from '@/components/forms/master-select-field';

export function ServerOpsSection({
  control, racks,
}: { control: Control<ServerFormValues>; racks: Map<number, MasterRack> }) {
  const rackOpts = Array.from(racks.values()).map((r) => ({ value: r.rackId, label: r.rackLocCd }));
  return (
    <FormSection title="운영 정보">
      <MasterSelectField control={control} name="rackId" label="렉" options={rackOpts} placeholder="렉 선택" />
      <TextField control={control} name="assetId" label="실사 ID" />
      <DateField control={control} name="introDt" label="도입일" />
      <DateField control={control} name="maintEndDt" label="유지보수 종료일" />
      <TextField control={control} name="aciLvlGrd" label="보안등급" placeholder="예: 2등급" />
    </FormSection>
  );
}
```

**`server-flags-section.tsx`:**
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import { FormSection } from '@/components/forms/form-section';
import { YnField } from '@/components/forms/yn-field';
import { TextField } from '@/components/forms/text-field';

export function ServerFlagsSection({ control }: { control: Control<ServerFormValues> }) {
  return (
    <FormSection title="옵션">
      <YnField control={control} name="virtMchnYn" label="가상머신" />
      <TextField control={control} name="virtMchnPltfomNm" label="가상화 플랫폼" placeholder="예: VMware" />
      <YnField control={control} name="osBackupYn" label="백업" />
      <YnField control={control} name="monitYn" label="모니터링" />
      <YnField control={control} name="alarmCallYn" label="알람 호출" />
      <YnField control={control} name="mngYn" label="관리 대상" />
      <YnField control={control} name="inetFacingYn" label="인터넷 노출" />
    </FormSection>
  );
}
```

**`memo-section.tsx`:**
```tsx
'use client';

import type { Control } from 'react-hook-form';
import type { ServerFormValues } from '../schema';
import { FormSection } from '@/components/forms/form-section';
import { TextField } from '@/components/forms/text-field';

export function MemoSection({ control }: { control: Control<ServerFormValues> }) {
  return (
    <FormSection title="메모 / 변경 사유">
      <TextField control={control} name="ciDescp" label="CI 설명" placeholder="자유 메모" />
      <TextField control={control} name="changeReason" label="변경 사유 (선택)" placeholder="예: OS 업그레이드" />
    </FormSection>
  );
}
```

- [ ] **typecheck + commit**
```bash
pnpm typecheck && pnpm lint
git add src/components/features/server/forms/sections
git commit -m "feat(server-forms): 5 form sections (basic/spec/ops/flags/memo)"
```

---

### Task 7: ServerCreateForm + ServerEditForm

**Files (new):**
- `src/components/features/server/forms/server-create-form.tsx`
- `src/components/features/server/forms/server-edit-form.tsx`

**`server-create-form.tsx`:**
```tsx
'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  serverFormSchema, type ServerFormValues, defaultServerFormValues, toCreatePayload,
} from './schema';
import { useCreateServer } from './hooks';
import { BasicInfoSection } from './sections/basic-info-section';
import { ServerSpecSection } from './sections/server-spec-section';
import { ServerOpsSection } from './sections/server-ops-section';
import { ServerFlagsSection } from './sections/server-flags-section';
import { MemoSection } from './sections/memo-section';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation, MasterRack, MasterVendor } from '@/lib/api/schemas';

interface Props {
  locations: Map<number, MasterLocation>;
  racks: Map<number, MasterRack>;
  vendors: Map<number, MasterVendor>;
}

export function ServerCreateForm({ locations, racks, vendors }: Props) {
  const router = useRouter();
  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: defaultServerFormValues,
  });
  const create = useCreateServer();

  async function onSubmit(values: ServerFormValues) {
    try {
      const result = await create.mutateAsync({
        payload: toCreatePayload(values),
        changeReason: values.changeReason || undefined,
      });
      toast.success('등록되었습니다.');
      router.push(`/servers/${result.ciId}` as Route);
    } catch (err) {
      const t = formatErrorForToast(err);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <BasicInfoSection control={form.control} locations={locations} />
        <ServerSpecSection control={form.control} vendors={vendors} />
        <ServerOpsSection control={form.control} racks={racks} />
        <ServerFlagsSection control={form.control} />
        <MemoSection control={form.control} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/servers' as Route)}>
            취소
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

**`server-edit-form.tsx`:** mostly identical, but takes `ciId` and an `initial: ServerFormValues` prefilled, calls `useUpdateServer(ciId)`, and on success navigates to `/servers/${ciId}`. Implement parallel structure:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  serverFormSchema, type ServerFormValues, toUpdatePayload,
} from './schema';
import { useUpdateServer } from './hooks';
import { BasicInfoSection } from './sections/basic-info-section';
import { ServerSpecSection } from './sections/server-spec-section';
import { ServerOpsSection } from './sections/server-ops-section';
import { ServerFlagsSection } from './sections/server-flags-section';
import { MemoSection } from './sections/memo-section';
import { formatErrorForToast } from '@/lib/api/error-messages';
import type { MasterLocation, MasterRack, MasterVendor } from '@/lib/api/schemas';

interface Props {
  ciId: number;
  initial: ServerFormValues;
  locations: Map<number, MasterLocation>;
  racks: Map<number, MasterRack>;
  vendors: Map<number, MasterVendor>;
}

export function ServerEditForm({ ciId, initial, locations, racks, vendors }: Props) {
  const router = useRouter();
  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: initial,
  });
  const update = useUpdateServer(ciId);

  async function onSubmit(values: ServerFormValues) {
    try {
      await update.mutateAsync({
        payload: toUpdatePayload(values),
        changeReason: values.changeReason || undefined,
      });
      toast.success('수정되었습니다.');
      router.push(`/servers/${ciId}` as Route);
    } catch (err) {
      const t = formatErrorForToast(err);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <BasicInfoSection control={form.control} locations={locations} />
        <ServerSpecSection control={form.control} vendors={vendors} />
        <ServerOpsSection control={form.control} racks={racks} />
        <ServerFlagsSection control={form.control} />
        <MemoSection control={form.control} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(`/servers/${ciId}` as Route)}>
            취소
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

- [ ] typecheck + commit
```bash
pnpm typecheck && pnpm lint
git add src/components/features/server/forms/server-create-form.tsx src/components/features/server/forms/server-edit-form.tsx
git commit -m "feat(server-forms): create + edit form components (RHF + sections)"
```

---

### Task 8: Decommission dialog

**File:** `src/components/features/server/detail/decommission-dialog.tsx` (new)

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDecommissionServer } from '@/components/features/server/forms/hooks';
import { formatErrorForToast } from '@/lib/api/error-messages';

interface Props {
  ciId: number;
  ciNm: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DecommissionDialog({ ciId, ciNm, open, onOpenChange }: Props) {
  const [reason, setReason] = useState('');
  const decommission = useDecommissionServer(ciId);

  async function handleConfirm() {
    if (reason.trim().length < 5) {
      toast.error('변경 사유를 5자 이상 입력해주세요.');
      return;
    }
    try {
      await decommission.mutateAsync({ reason: reason.trim() });
      toast.success('폐기되었습니다.');
      onOpenChange(false);
      setReason('');
    } catch (err) {
      const t = formatErrorForToast(err);
      toast.error(t.title, { description: t.description });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>서버 폐기 — {ciNm}</DialogTitle>
          <DialogDescription>
            이 작업은 비가역입니다. 폐기 후에는 다시 활성화할 수 없으며 관계는 자동으로 정리되지 않습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decom-reason">변경 사유 (필수, 5자 이상)</Label>
          <Input
            id="decom-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 노후화, 신규 서버로 교체"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={decommission.isPending}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={decommission.isPending}>
            {decommission.isPending ? '처리 중…' : '폐기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] typecheck + commit
```bash
pnpm typecheck && pnpm lint
git add src/components/features/server/detail/decommission-dialog.tsx
git commit -m "feat(server): decommission dialog with reason input + RBAC-gated trigger"
```

---

## Phase C — Routes + Activation

### Task 9: /servers/new route

**Files:** `src/app/(app)/servers/new/page.tsx` (new)

```tsx
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { hasRole } from '@/lib/auth/roles';
import { getMyProfile } from '@/lib/auth/me';
import { getLocationsMap, getRacksMap, getVendorsMap } from '@/lib/master/server';
import { ServerCreateForm } from '@/components/features/server/forms/server-create-form';

export const dynamic = 'force-dynamic';

export default async function ServerCreatePage() {
  const profile = await getMyProfile();
  if (!hasRole(profile?.roles ?? [], 'OPERATOR')) {
    redirect('/servers');
  }

  const [locations, racks, vendors] = await Promise.all([
    getLocationsMap(), getRacksMap(), getVendorsMap(),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>서버 등록</CardTitle>
        </CardHeader>
      </Card>
      <ServerCreateForm locations={locations} racks={racks} vendors={vendors} />
    </div>
  );
}
```

- [ ] typecheck + commit
```bash
pnpm typecheck && pnpm lint
git add 'src/app/(app)/servers/new/page.tsx'
git commit -m "feat(servers): /servers/new route with RBAC + master prefetch"
```

---

### Task 10: /servers/[ciId]/edit route

**Files:** `src/app/(app)/servers/[ciId]/edit/page.tsx` (new)

```tsx
import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { hasRole } from '@/lib/auth/roles';
import { getMyProfile } from '@/lib/auth/me';
import { ApiError } from '@/lib/api/envelope';
import { serverFetch } from '@/lib/api/server-fetch';
import { CiDetailSchema } from '@/lib/api/schemas';
import { getLocationsMap, getRacksMap, getVendorsMap } from '@/lib/master/server';
import { ServerEditForm } from '@/components/features/server/forms/server-edit-form';
import { defaultServerFormValues, type ServerFormValues } from '@/components/features/server/forms/schema';

export const dynamic = 'force-dynamic';

interface Params { ciId: string; }

function detailToForm(ci: import('@/lib/api/schemas').CiDetail): ServerFormValues {
  const sd = ci.serverData ?? {};
  return {
    ...defaultServerFormValues,
    ciNm: ci.ciNm,
    ciBizwrkNm: ci.ciBizwrkNm ?? '',
    ciRoleNm: ci.ciRoleNm ?? '',
    envrnGpCd: ci.envrnGpCd ?? '',
    grdCd: ci.grdCd ?? '',
    locId: ci.locId,
    ciDescp: ci.ciDescp ?? '',
    hostNm: sd.hostNm ?? '',
    assetId: sd.assetId ?? '',
    ossId: sd.ossId ?? '',
    sysVidId: sd.sysVidId ?? '',
    deviceNm: sd.deviceNm ?? '',
    vendorId: sd.vendorId,
    modelNm: sd.modelNm ?? '',
    serialNo: sd.serialNo ?? '',
    osTpNm: sd.osTpNm ?? '',
    osVer: sd.osVer ?? '',
    cpucoreCnt: sd.cpucoreCnt,
    memoryCapa: sd.memoryCapa,
    diskCapa: sd.diskCapa,
    virtMchnYn: sd.virtMchnYn ?? 'N',
    virtMchnPltfomNm: sd.virtMchnPltfomNm ?? '',
    rackId: sd.rackId,
    introDt: sd.introDt ?? '',
    maintEndDt: sd.maintEndDt ?? '',
    monitYn: sd.monitYn ?? 'N',
    osBackupYn: sd.osBackupYn ?? 'N',
    alarmCallYn: sd.alarmCallYn ?? 'N',
    mngYn: sd.mngYn ?? 'N',
    aciLvlGrd: sd.aciLvlGrd ?? '',
    inetFacingYn: sd.inetFacingYn ?? 'N',
    changeReason: '',
  };
}

export default async function ServerEditPage({ params }: { params: Promise<Params> }) {
  const { ciId: ciIdRaw } = await params;
  const ciId = Number(ciIdRaw);
  if (!Number.isFinite(ciId) || ciId <= 0) notFound();

  const profile = await getMyProfile();
  if (!hasRole(profile?.roles ?? [], 'OPERATOR')) {
    redirect(`/servers/${ciId}`);
  }

  let ci, locations, racks, vendors;
  try {
    [ci, locations, racks, vendors] = await Promise.all([
      serverFetch<unknown>(`/api/v1/cis/${ciId}`).then((d) => CiDetailSchema.parse(d)),
      getLocationsMap(),
      getRacksMap(),
      getVendorsMap(),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>서버 편집 — {ci.ciNm}</CardTitle>
        </CardHeader>
      </Card>
      <ServerEditForm
        ciId={ciId}
        initial={detailToForm(ci)}
        locations={locations}
        racks={racks}
        vendors={vendors}
      />
    </div>
  );
}
```

- [ ] typecheck + commit
```bash
pnpm typecheck && pnpm lint
git add 'src/app/(app)/servers/[ciId]/edit/page.tsx'
git commit -m "feat(servers): /servers/[ciId]/edit route with prefilled form"
```

---

### Task 11: Activate buttons in detail header + list register button

**Files:**
- Modify: `src/components/features/server/detail/server-detail-header.tsx`
- Modify: `src/app/(app)/servers/page.tsx` (the "+ 등록" button)

**Detail header changes:**
- Replace the disabled "편집" button with a `<Link href={\`/servers/\${ci.ciId}/edit\`}>` wrapped Button.
- Replace the disabled "폐기" button with a Button that opens `<DecommissionDialog>`. State managed via `useState` — promote header to `'use client'` (or split: keep the brand bits server, move action buttons to a client subcomponent).
- Remove the disabled state + Tooltip "다음 사이클" wrappers.

**Recommended split:** keep `ServerDetailHeader` server-side (renders title + status), add new `<ServerDetailActions ci={...} myRoles={...} />` client component with the actual buttons.

Implementation sketch:

`server-detail-actions.tsx` (NEW, client):
```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Button } from '@/components/ui/button';
import { RoleGuard } from '@/lib/auth/rbac';
import { DecommissionDialog } from './decommission-dialog';
import type { CiDetail } from '@/lib/api/schemas';

export function ServerDetailActions({ ci, myRoles }: { ci: CiDetail; myRoles: readonly string[] }) {
  const [decomOpen, setDecomOpen] = useState(false);
  const ciId = ci.ciId;

  return (
    <div className="flex items-center gap-2">
      <RoleGuard role="OPERATOR" myRoles={myRoles}>
        <Link href={`/servers/${ciId}/edit` as Route}>
          <Button>편집</Button>
        </Link>
      </RoleGuard>
      <RoleGuard role="ADMIN" myRoles={myRoles}>
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive"
          onClick={() => setDecomOpen(true)}
          disabled={ci.ciStatVal === 'DECOMMISSIONED'}
        >
          폐기
        </Button>
        <DecommissionDialog ciId={ciId} ciNm={ci.ciNm} open={decomOpen} onOpenChange={setDecomOpen} />
      </RoleGuard>
    </div>
  );
}
```

Then update `server-detail-header.tsx`:
- Remove the disabled buttons + tooltips.
- Render `<ServerDetailActions ci={ci} myRoles={myRoles} />`.
- Keep "이력" disabled+tooltip as-is (history is cycle #7).

**list page change** — `src/app/(app)/servers/page.tsx`:

Replace the disabled "+ 등록" Button with a `<Link href="/servers/new"><Button>+ 등록</Button></Link>` (still inside the `<RoleGuard role="OPERATOR">`).

- [ ] typecheck + lint, manual smoke (`pnpm dev`):
```bash
pnpm typecheck && pnpm lint
```

- [ ] commit
```bash
git add src/components/features/server/detail/server-detail-header.tsx src/components/features/server/detail/server-detail-actions.tsx 'src/app/(app)/servers/page.tsx'
git commit -m "feat(servers): activate edit/decommission/register buttons (RBAC-gated)"
```

---

## Phase D — Verify

### Task 12: Playwright e2e — write flows

**File:** `tests/e2e/server-write.spec.ts` (new)

```ts
import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const OPER = process.env.LDAP_TEST_USER_OPERATOR ?? '';
const OPER_PW = process.env.LDAP_TEST_USER_OPERATOR_PASS ?? '';
const ADMIN = process.env.LDAP_TEST_USER_ADMIN ?? '';
const ADMIN_PW = process.env.LDAP_TEST_USER_ADMIN_PASS ?? '';
const USER = process.env.LDAP_TEST_USER_USER ?? '';
const USER_PW = process.env.LDAP_TEST_USER_USER_PASS ?? '';

test.describe('/servers/new', () => {
  test.skip(!OPER, 'LDAP test accounts not configured');

  test('OPERATOR can navigate to /servers/new', async ({ page }) => {
    await loginAs(page, OPER, OPER_PW);
    await page.goto('/servers');
    await page.getByRole('link', { name: /\+ 등록/ }).click();
    await expect(page).toHaveURL(/\/servers\/new/);
    await expect(page.getByLabel('CI 명')).toBeVisible();
  });

  test('USER hitting /servers/new is redirected', async ({ page }) => {
    test.skip(!USER, 'USER LDAP test account not configured');
    await loginAs(page, USER, USER_PW);
    await page.goto('/servers/new');
    await expect(page).toHaveURL(/\/servers(\?|$)/);  // not /new
  });
});

test.describe('decommission dialog', () => {
  test.skip(!ADMIN, 'ADMIN LDAP test account not configured');

  test('ADMIN sees 폐기 button on detail', async ({ page }) => {
    await loginAs(page, ADMIN, ADMIN_PW);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    await firstRow.click();
    await expect(page.getByRole('button', { name: '폐기' })).toBeVisible();
  });

  test('OPERATOR does not see 폐기 button', async ({ page }) => {
    await loginAs(page, OPER, OPER_PW);
    await page.goto('/servers');
    const firstRow = page.locator('a[href^="/servers/"]').first();
    await firstRow.click();
    await expect(page.getByRole('button', { name: '폐기' })).toHaveCount(0);
  });
});
```

- [ ] commit
```bash
git add tests/e2e/server-write.spec.ts
git commit -m "test(e2e): /servers write flows (register access + decommission RBAC)"
```

---

### Task 13: ADR + gap doc updates + final verify

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/api-gaps-and-improvements.md`

- [ ] **§7 변경 이력 추가:**
```md
- **2026-05-07 (cycle #2)**: 서버 쓰기 사이클 — 등록·편집·폐기 출시. X-Change-Reason 헤더 옵션을 mutator/serverFetch에 추가. RHF + zodResolver 기반 폼 패턴 정착(`components/forms/*` 일반 wrapper, `features/server/forms/sections/*` 5개 섹션). DecommissionDialog로 폐기 사유(reason) 5자 이상 강제. RBAC: 등록·편집은 OPERATOR+, 폐기는 ADMIN-only. USER가 URL로 우회 진입 시 페이지 단에서 redirect.
```

- [ ] **gap 문서 §10 행 갱신:**
```md
| #2 서버 쓰기 | 7.1 (X-Change-Reason echo 미확인 추가) | 9.1, 9.2 |
```

- [ ] **gap 문서 §9.1, §9.2 결정:** `[compromise]` 처리 — "사이클 #2에서 활성화 완료". 행 끝 결정 칼럼 갱신.

- [ ] **gap 문서 §1.x에 새 항목 추가** (cycle #2에서 발견):

§9 (`X-Change-Reason 백엔드 처리 미확인` 신규 행 추가):
```md
| 7.6 | `X-Change-Reason` 헤더가 백엔드 REVINFO에 실제로 기록되는지 확인 안 됨 | 사이클 #2 | 백엔드 로그 확인 또는 history 응답에서 검증 | TBD |
```

- [ ] **Final verify:**
```bash
source ~/.nvm/nvm.sh && nvm use 20
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

- [ ] **commit:**
```bash
git add docs/architecture.md docs/api-gaps-and-improvements.md
git commit -m "docs(adr): cycle #2 (server write) decisions + gap tracker update"
```

---

## Verification Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` (all unit tests) passes
- [ ] `pnpm build` succeeds
- [ ] OPERATOR: `/servers` → `+ 등록` clickable → `/servers/new` form renders → submit → `/servers/[ciId]`
- [ ] OPERATOR: detail page → `편집` clickable → `/servers/[ciId]/edit` prefilled → submit → detail with updated values
- [ ] ADMIN: detail page → `폐기` clickable → dialog → reason 5+ chars → confirm → status badge → "폐기"
- [ ] USER: register/edit/decommission buttons not visible
- [ ] USER hitting `/servers/new` directly → redirected to `/servers`

---

## Notes

- Form fields whose values are non-string (numbers, master IDs) need conversion at the input level (`MasterSelectField` handles `String(id)` ↔ `Number(v)` already). RHF state stays consistent via the schema.
- `defaultValues` MUST be a complete object — RHF uncontrolled-input warnings surface fast otherwise.
- If `pnpm build` flags type issues from `as Route` casts on dynamic strings, see existing pattern in sidebar/list table (Cycle #1).
- Master prefetch behavior identical to Cycle #1 — `react.cache` makes Promise.all efficient.
