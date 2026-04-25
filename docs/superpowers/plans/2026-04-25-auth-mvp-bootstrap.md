# Auth MVP Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the cid-web Next.js 15 frontend from empty repo to a working LDAP login → protected dashboard → logout flow, following `docs/architecture.md`.

**Architecture:** Full BFF — browser only talks to Next.js Route Handlers; tokens live in an iron-session encrypted httpOnly cookie; `/api/proxy/[...path]` forwards every backend call with single-flight refresh on 401. Middleware gates `(app)` routes by validating the session cookie at the Edge.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind CSS 3.4 · shadcn/ui (Radix) · iron-session 8 · TanStack Query 5 · React Hook Form 7 + Zod 3 · Orval 7 · Vitest 2 + RTL · Playwright 1.

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                      # root layout, providers
│   ├── globals.css                     # Tailwind + design-token CSS vars
│   ├── (auth)/
│   │   ├── layout.tsx                  # gradient fullscreen
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                  # AppShell (sidebar + header)
│   │   └── page.tsx                    # placeholder dashboard
│   └── api/
│       ├── auth/{login,logout}/route.ts
│       ├── proxy/[...path]/route.ts
│       └── health/route.ts
├── api/generated/                      # Orval output (committed)
├── components/
│   ├── ui/                             # shadcn primitives
│   ├── layout/{app-shell,sidebar,header,user-menu}.tsx
│   ├── providers.tsx                   # QueryClientProvider + Sonner
│   └── features/auth/{login-form,schema,use-login,use-logout,use-me}.ts(x)
├── lib/
│   ├── api/{client,envelope,query-client}.ts
│   └── auth/{session,server,refresh}.ts
├── hooks/                              # (empty for MVP)
├── types/                              # (empty for MVP)
└── middleware.ts
tests/e2e/login.spec.ts                 # Playwright smoke
```

Tests live next to source (`*.test.ts`) for unit/integration. Playwright e2e is in `tests/e2e/`.

---

## Conventions used by every task

- **TDD where logic exists**: write the failing test, run it, see it fail, then implement.
- **One commit per task** at the end. Commit message: `<type>: <short description>` (Conventional Commits).
- **Run discipline**: every task ends with `pnpm typecheck` passing locally before committing.
- **Test fixture for SESSION_SECRET**: in tests, hardcode `'a'.repeat(64)` (64 chars satisfies iron-session min length 32).

---

## Phase A — Project Bootstrap

### Task 1: Initialize package.json and install dependencies

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml` (auto)

- [ ] **Step 1: Verify pnpm and Node.js available**

Run:
```bash
node --version   # expect v20+ or v22+
pnpm --version   # expect v9+
```

Expected: both print versions. If pnpm missing: `npm i -g pnpm`.

- [ ] **Step 2: Create package.json**

Create `package.json`:
```json
{
  "name": "cid-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "gen:api": "orval --config orval.config.ts",
    "format": "prettier --write ."
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 3: Install runtime dependencies**

Run:
```bash
pnpm add next@^15 react@^19 react-dom@^19 \
  iron-session@^8 \
  @tanstack/react-query@^5 \
  react-hook-form@^7 @hookform/resolvers@^3 zod@^3.23 \
  class-variance-authority clsx tailwind-merge \
  sonner \
  lucide-react
```

Expected: dependencies installed, `pnpm-lock.yaml` created.

- [ ] **Step 4: Install Radix primitives needed for MVP shadcn components**

Run:
```bash
pnpm add @radix-ui/react-checkbox @radix-ui/react-label @radix-ui/react-slot
```

- [ ] **Step 5: Install dev dependencies**

Run:
```bash
pnpm add -D typescript@^5.4 \
  @types/node @types/react @types/react-dom \
  tailwindcss@^3.4 postcss autoprefixer \
  eslint@^9 eslint-config-next@^15 \
  prettier prettier-plugin-tailwindcss \
  vitest@^2 @vitest/ui @vitejs/plugin-react jsdom \
  @testing-library/react@^16 @testing-library/dom @testing-library/jest-dom \
  @playwright/test@^1.45 \
  orval@^7
```

- [ ] **Step 6: Install Playwright browsers**

Run:
```bash
pnpm exec playwright install chromium
```

Expected: chromium installed (~150MB).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: initialize package.json with mvp dependencies"
```

---

### Task 2: TypeScript, Next.js config, .gitignore, .env.example

**Files:**
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `next-env.d.ts` (auto-managed by Next, but committed)
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.prettierrc.json`
- Create: `.eslintrc.json`

- [ ] **Step 1: Create tsconfig.json**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Create next.config.mjs**

Create `next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create .gitignore**

Create `.gitignore`:
```
# deps
node_modules/
.pnp/
.pnp.js

# next
.next/
out/
build/

# env
.env*.local
.env

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# os
.DS_Store
*.pem

# editor
.idea/
.vscode/
*.swp

# test
coverage/
playwright-report/
test-results/
.playwright/

# misc
.turbo/
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 4: Create .env.example**

Create `.env.example`:
```
# Backend API (server-only, never expose to client bundle)
BACKEND_API_URL=http://localhost:8080

# Iron-session encryption secret. Min 32 chars. Generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=

# Optional override; defaults to 'cid_session'
SESSION_COOKIE_NAME=cid_session

# Public branding (NEXT_PUBLIC_* values are bundled to client)
NEXT_PUBLIC_APP_NAME=CMDB
```

- [ ] **Step 5: Create .prettierrc.json**

Create `.prettierrc.json`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 6: Create .eslintrc.json**

Create `.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": "error"
  },
  "ignorePatterns": ["src/api/generated/**"]
}
```

- [ ] **Step 7: Verify typecheck passes (will be no-op until source exists)**

Run: `pnpm typecheck`

Expected: passes (no source files yet).

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json next.config.mjs .gitignore .env.example .prettierrc.json .eslintrc.json
git commit -m "chore: typescript, next, lint, env scaffolding"
```

---

### Task 3: Tailwind, PostCSS, globals.css with design tokens

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/globals.css`

- [ ] **Step 1: Create postcss.config.mjs**

Create `postcss.config.mjs`:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 2: Create tailwind.config.ts**

Create `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(0 0% 100%)',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(0 0% 100%)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(0 0% 15%)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
        },
      },
      borderRadius: {
        xs: '0.25rem',
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        lg: '0.75rem',
      },
      boxShadow: {
        card: '0 1px 3px rgb(0 0 0 / 0.08)',
        dropdown: '0 4px 12px rgb(0 0 0 / 0.1)',
        modal: '0 8px 32px rgb(0 0 0 / 0.2)',
      },
      backgroundImage: {
        'login-gradient': 'linear-gradient(135deg, #001529 0%, #003a70 50%, #0050a0 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Create src/app/globals.css**

Create `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 15%;
    --primary: 209 100% 55%;
    --primary-foreground: 0 0% 100%;
    --destructive: 359 100% 65%;
    --success: 100 75% 44%;
    --warning: 39 100% 53%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 55%;
    --border: 0 0% 85%;
    --ring: 209 100% 55%;
    --radius: 0.5rem;

    --sidebar-background: 209 100% 8%;
    --sidebar-foreground: 0 0% 100%;
    --sidebar-primary: 209 100% 55%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}
```

- [ ] **Step 4: Verify Tailwind compiles by running build (skip — needs more files); just typecheck**

Run: `pnpm typecheck`

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts postcss.config.mjs src/app/globals.css
git commit -m "feat(ui): tailwind config with antd-aligned design tokens"
```

---

### Task 4: shadcn init, cn() helper, MVP primitives

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/checkbox.tsx`
- Create: `src/components/ui/form.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/alert.tsx`
- Create: `src/components/ui/sonner.tsx`

- [ ] **Step 1: Create components.json (shadcn config)**

Create `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 2: Create src/lib/utils.ts**

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create Button primitive**

Create `src/components/ui/button.tsx`:
```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-muted',
        ghost: 'hover:bg-muted',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-sm px-3 text-xs',
        lg: 'h-11 rounded px-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 4: Create Input primitive**

Create `src/components/ui/input.tsx`:
```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

- [ ] **Step 5: Create Label primitive**

Create `src/components/ui/label.tsx`:
```tsx
'use client';
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium leading-none text-muted-foreground', className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;
```

- [ ] **Step 6: Create Checkbox primitive**

Create `src/components/ui/checkbox.tsx`:
```tsx
'use client';
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-xs border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
```

- [ ] **Step 7: Create Card primitive**

Create `src/components/ui/card.tsx`:
```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-background text-foreground shadow-card', className)}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';
```

- [ ] **Step 8: Create Alert primitive**

Create `src/components/ui/alert.tsx`:
```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded border px-4 py-3 text-sm flex items-start gap-2',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        info: 'border-primary/50 bg-primary/10 text-primary',
        warning: 'border-warning/50 bg-warning/10 text-warning-foreground',
        destructive: 'border-destructive/50 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  ),
);
Alert.displayName = 'Alert';
```

- [ ] **Step 9: Create Form primitive (react-hook-form bindings)**

Create `src/components/ui/form.tsx`:
```tsx
'use client';
import * as React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  if (!fieldContext) throw new Error('useFormField must be used within <FormField>');
  return { name: fieldContext.name, ...fieldState };
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
  ),
);
FormItem.displayName = 'FormItem';

export function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error } = useFormField();
  return (
    <Label className={cn(error && 'text-destructive', className)} {...props} />
  );
}

export function FormControl(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function FormMessage({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { error } = useFormField();
  const body = error ? String(error.message) : children;
  if (!body) return null;
  return (
    <p className={cn('text-xs text-destructive', className)} {...props}>
      {body}
    </p>
  );
}
```

- [ ] **Step 10: Create Sonner toast wrapper**

Create `src/components/ui/sonner.tsx`:
```tsx
'use client';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-background text-foreground border shadow-dropdown rounded',
          success: 'border-success/50',
          error: 'border-destructive/50',
        },
      }}
    />
  );
}
```

- [ ] **Step 11: Verify typecheck passes**

Run: `pnpm typecheck`

Expected: passes.

- [ ] **Step 12: Commit**

```bash
git add components.json src/lib/utils.ts src/components/ui/
git commit -m "feat(ui): shadcn primitives (button, input, label, checkbox, card, alert, form, sonner)"
```

---

### Task 5: Vitest, RTL, Playwright config

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `tests/e2e/.gitkeep`

- [ ] **Step 1: Create vitest.config.ts**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 2: Create vitest.setup.ts**

Create `vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';

// Provide a fixed test secret for iron-session (>= 32 chars)
process.env.SESSION_SECRET = 'a'.repeat(64);
process.env.BACKEND_API_URL = 'http://localhost:8080';
process.env.SESSION_COOKIE_NAME = 'cid_session';
```

- [ ] **Step 3: Create playwright.config.ts**

Create `playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 4: Create empty e2e directory marker**

Run: `mkdir -p tests/e2e && touch tests/e2e/.gitkeep`

- [ ] **Step 5: Sanity-check vitest runs**

Run: `pnpm test`

Expected: passes with "no test files" message (or skip with no tests). Either is OK.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts vitest.setup.ts playwright.config.ts tests/e2e/.gitkeep
git commit -m "chore(test): vitest, rtl, playwright configuration"
```

---

## Phase B — BFF Core (TDD)

### Task 6: API envelope + ApiError

**Files:**
- Create: `src/lib/api/envelope.ts`
- Create: `src/lib/api/envelope.test.ts`

Background: backend wraps every response as `{ data, error: { code, message, traceId } | null }`. We unwrap to plain `data` and throw `ApiError` on `error`.

- [ ] **Step 1: Write failing test**

Create `src/lib/api/envelope.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { ApiError, unwrapEnvelope } from './envelope';

describe('unwrapEnvelope', () => {
  it('returns data when error is null', () => {
    expect(unwrapEnvelope({ data: { name: 'Alice' }, error: null })).toEqual({ name: 'Alice' });
  });

  it('returns data when error is missing', () => {
    expect(unwrapEnvelope({ data: 42 })).toBe(42);
  });

  it('throws ApiError when error is present', () => {
    const envelope = { data: null, error: { code: 'AUTH_FAILED', message: 'wrong password', traceId: 'abc' } };
    expect(() => unwrapEnvelope(envelope)).toThrow(ApiError);
    try {
      unwrapEnvelope(envelope);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.code).toBe('AUTH_FAILED');
      expect(err.message).toBe('wrong password');
      expect(err.traceId).toBe('abc');
    }
  });
});

describe('ApiError', () => {
  it('preserves code, message, traceId', () => {
    const e = new ApiError('CODE', 'msg', 'trace');
    expect(e.name).toBe('ApiError');
    expect(e.code).toBe('CODE');
    expect(e.message).toBe('msg');
    expect(e.traceId).toBe('trace');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/lib/api/envelope.test.ts`

Expected: FAIL with "Cannot find module './envelope'".

- [ ] **Step 3: Implement envelope.ts**

Create `src/lib/api/envelope.ts`:
```ts
export interface BackendError {
  code: string;
  message: string;
  traceId?: string;
}

export interface Envelope<T> {
  data: T;
  error?: BackendError | null;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function unwrapEnvelope<T>(envelope: Envelope<T>): T {
  if (envelope.error) {
    throw new ApiError(envelope.error.code, envelope.error.message, envelope.error.traceId);
  }
  return envelope.data;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/lib/api/envelope.test.ts`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/envelope.ts src/lib/api/envelope.test.ts
git commit -m "feat(api): envelope unwrap with ApiError"
```

---

### Task 7: Iron-session config and types

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/session.test.ts`

Background: define `SessionData` shape and a factory for `iron-session` options. The `getSessionOptions(remember)` function returns options whose `cookieOptions.maxAge` differs based on Remember Me.

- [ ] **Step 1: Write failing test**

Create `src/lib/auth/session.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { getSessionOptions, COOKIE_NAME, type SessionData } from './session';

describe('getSessionOptions', () => {
  it('uses SESSION_SECRET from env', () => {
    expect(getSessionOptions().password).toBe('a'.repeat(64));
  });

  it('uses SESSION_COOKIE_NAME from env', () => {
    expect(COOKIE_NAME).toBe('cid_session');
    expect(getSessionOptions().cookieName).toBe('cid_session');
  });

  it('omits maxAge by default (session cookie)', () => {
    const opts = getSessionOptions();
    expect(opts.cookieOptions?.maxAge).toBeUndefined();
  });

  it('sets maxAge when remember=true and refreshExpiresIn is given', () => {
    const opts = getSessionOptions({ remember: true, refreshExpiresIn: 1209600 });
    expect(opts.cookieOptions?.maxAge).toBe(1209600);
  });

  it('omits maxAge when remember=false even if refreshExpiresIn given', () => {
    const opts = getSessionOptions({ remember: false, refreshExpiresIn: 1209600 });
    expect(opts.cookieOptions?.maxAge).toBeUndefined();
  });

  it('sets httpOnly, secure(production), sameSite=lax, path=/', () => {
    const opts = getSessionOptions();
    expect(opts.cookieOptions?.httpOnly).toBe(true);
    expect(opts.cookieOptions?.sameSite).toBe('lax');
    expect(opts.cookieOptions?.path).toBe('/');
  });

  it('SessionData type allows tokens and remember', () => {
    const s: SessionData = {
      tokens: {
        accessToken: 'a',
        accessTokenExpiresIn: 600,
        refreshToken: 'r',
        refreshTokenExpiresIn: 86400,
        tokenType: 'Bearer',
      },
      remember: true,
    };
    expect(s.tokens?.accessToken).toBe('a');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/lib/auth/session.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement session.ts**

Create `src/lib/auth/session.ts`:
```ts
import type { SessionOptions } from 'iron-session';

export interface TokenBundle {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  tokenType: string;
}

export interface SessionData {
  tokens?: TokenBundle;
  remember?: boolean;
}

export const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'cid_session';

export function getSessionOptions(opts?: { remember?: boolean; refreshExpiresIn?: number }): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  const remember = opts?.remember ?? false;
  const maxAge = remember ? opts?.refreshExpiresIn : undefined;

  return {
    password,
    cookieName: COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(maxAge !== undefined ? { maxAge } : {}),
    },
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/lib/auth/session.test.ts`

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts
git commit -m "feat(auth): iron-session config with Remember Me cookie maxAge"
```

---

### Task 8: Server-side session helpers

**Files:**
- Create: `src/lib/auth/server.ts`
- Create: `src/lib/auth/server.test.ts`

Background: provide `getServerSession(cookieStore)`, `saveServerSession`, `destroyServerSession` that wrap iron-session. Cookie store is injected (not pulled from `next/headers`) so tests can pass a fake.

- [ ] **Step 1: Write failing test**

Create `src/lib/auth/server.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { sealData, unsealData } from 'iron-session';
import { getServerSession, saveServerSession, destroyServerSession } from './server';
import { getSessionOptions, COOKIE_NAME, type SessionData } from './session';

function fakeCookieStore() {
  const map = new Map<string, string>();
  return {
    map,
    get: (name: string) => (map.has(name) ? { name, value: map.get(name)! } : undefined),
    set: (name: string, value: string) => {
      map.set(name, value);
    },
    delete: (name: string) => {
      map.delete(name);
    },
  };
}

describe('server session helpers', () => {
  it('returns empty session when no cookie present', async () => {
    const store = fakeCookieStore();
    const session = await getServerSession(store as never);
    expect(session.tokens).toBeUndefined();
  });

  it('saveServerSession writes a sealed cookie', async () => {
    const store = fakeCookieStore();
    const data: SessionData = {
      tokens: {
        accessToken: 'A',
        accessTokenExpiresIn: 600,
        refreshToken: 'R',
        refreshTokenExpiresIn: 86400,
        tokenType: 'Bearer',
      },
      remember: false,
    };
    await saveServerSession(store as never, data);
    const sealed = store.map.get(COOKIE_NAME);
    expect(sealed).toBeTruthy();
    const round = await unsealData<SessionData>(sealed!, { password: getSessionOptions().password });
    expect(round.tokens?.accessToken).toBe('A');
  });

  it('getServerSession reads a sealed cookie', async () => {
    const store = fakeCookieStore();
    const sealed = await sealData<SessionData>(
      { tokens: { accessToken: 'X', accessTokenExpiresIn: 1, refreshToken: 'Y', refreshTokenExpiresIn: 2, tokenType: 'Bearer' } },
      { password: getSessionOptions().password },
    );
    store.map.set(COOKIE_NAME, sealed);
    const session = await getServerSession(store as never);
    expect(session.tokens?.accessToken).toBe('X');
  });

  it('destroyServerSession removes the cookie', async () => {
    const store = fakeCookieStore();
    store.map.set(COOKIE_NAME, 'sealed-value');
    await destroyServerSession(store as never);
    expect(store.map.has(COOKIE_NAME)).toBe(false);
  });

  it('returns empty session when cookie is corrupted', async () => {
    const store = fakeCookieStore();
    store.map.set(COOKIE_NAME, 'not-a-real-sealed-value');
    const session = await getServerSession(store as never);
    expect(session.tokens).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/lib/auth/server.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement server.ts**

Create `src/lib/auth/server.ts`:
```ts
import 'server-only';
import { sealData, unsealData } from 'iron-session';
import { getSessionOptions, COOKIE_NAME, type SessionData } from './session';

export interface CookieStoreLike {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, options?: Record<string, unknown>) => void;
  delete: (name: string) => void;
}

export async function getServerSession(store: CookieStoreLike): Promise<SessionData> {
  const sealed = store.get(COOKIE_NAME)?.value;
  if (!sealed) return {};
  try {
    return await unsealData<SessionData>(sealed, { password: getSessionOptions().password });
  } catch {
    return {};
  }
}

export async function saveServerSession(store: CookieStoreLike, data: SessionData): Promise<void> {
  const opts = getSessionOptions({
    remember: data.remember,
    refreshExpiresIn: data.tokens?.refreshTokenExpiresIn,
  });
  const sealed = await sealData<SessionData>(data, { password: opts.password });
  store.set(COOKIE_NAME, sealed, opts.cookieOptions);
}

export async function destroyServerSession(store: CookieStoreLike): Promise<void> {
  store.delete(COOKIE_NAME);
}
```

Note on `server-only`: Next.js ships this package; install if missing.

- [ ] **Step 4: Install server-only package**

Run: `pnpm add server-only`

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm test src/lib/auth/server.test.ts`

Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/server.ts src/lib/auth/server.test.ts package.json pnpm-lock.yaml
git commit -m "feat(auth): server session helpers (get/save/destroy)"
```

---

### Task 9: Single-flight refresh logic

**Files:**
- Create: `src/lib/auth/refresh.ts`
- Create: `src/lib/auth/refresh.test.ts`

Background: when the proxy hits a 401, multiple in-flight requests with the same refresh token must coalesce into a single refresh call. Per ADR §1, this is a per-instance map keyed by refresh token.

- [ ] **Step 1: Write failing test**

Create `src/lib/auth/refresh.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshTokens, __resetInflight } from './refresh';

const originalFetch = global.fetch;

beforeEach(() => {
  __resetInflight();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('refreshTokens', () => {
  it('returns new tokens on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'NEW_A',
            accessTokenExpiresIn: 600,
            refreshToken: 'NEW_R',
            refreshTokenExpiresIn: 86400,
            tokenType: 'Bearer',
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    const result = await refreshTokens('OLD_R');
    expect(result?.accessToken).toBe('NEW_A');
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('coalesces concurrent calls with the same refresh token', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { accessToken: 'X', accessTokenExpiresIn: 1, refreshToken: 'Y', refreshTokenExpiresIn: 2, tokenType: 'Bearer' }, error: null }), { status: 200 }),
    );
    const [a, b, c] = await Promise.all([
      refreshTokens('SAME'),
      refreshTokens('SAME'),
      refreshTokens('SAME'),
    ]);
    expect(global.fetch).toHaveBeenCalledOnce();
    expect(a?.accessToken).toBe('X');
    expect(b?.accessToken).toBe('X');
    expect(c?.accessToken).toBe('X');
  });

  it('does not coalesce calls with different refresh tokens', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { accessToken: 'X', accessTokenExpiresIn: 1, refreshToken: 'Y', refreshTokenExpiresIn: 2, tokenType: 'Bearer' }, error: null }), { status: 200 }),
    );
    await Promise.all([refreshTokens('A'), refreshTokens('B')]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns null on backend non-2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    expect(await refreshTokens('R')).toBeNull();
  });

  it('returns null when envelope.error is set', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: null, error: { code: 'EXPIRED', message: 'expired' } }), { status: 200 }),
    );
    expect(await refreshTokens('R')).toBeNull();
  });

  it('returns null and clears inflight on fetch throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    expect(await refreshTokens('R')).toBeNull();
    // After failure, second call should re-attempt (not return cached null)
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { accessToken: 'A', accessTokenExpiresIn: 1, refreshToken: 'R2', refreshTokenExpiresIn: 2, tokenType: 'Bearer' }, error: null }), { status: 200 }),
    );
    expect((await refreshTokens('R'))?.accessToken).toBe('A');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/lib/auth/refresh.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement refresh.ts**

Create `src/lib/auth/refresh.ts`:
```ts
import 'server-only';
import type { TokenBundle } from './session';

const inflight = new Map<string, Promise<TokenBundle | null>>();

interface RefreshEnvelope {
  data: TokenBundle | null;
  error?: { code: string; message: string } | null;
}

export async function refreshTokens(refreshToken: string): Promise<TokenBundle | null> {
  const existing = inflight.get(refreshToken);
  if (existing) return existing;

  const promise = (async (): Promise<TokenBundle | null> => {
    try {
      const res = await fetch(`${process.env.BACKEND_API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as RefreshEnvelope;
      if (json.error || !json.data) return null;
      return json.data;
    } catch {
      return null;
    } finally {
      inflight.delete(refreshToken);
    }
  })();

  inflight.set(refreshToken, promise);
  return promise;
}

/** Test-only helper to clear the inflight map between tests. */
export function __resetInflight(): void {
  inflight.clear();
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/lib/auth/refresh.test.ts`

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/refresh.ts src/lib/auth/refresh.test.ts
git commit -m "feat(auth): single-flight token refresh keyed by refresh token"
```

---

### Task 10: Health check route

**Files:**
- Create: `src/app/api/health/route.ts`
- Create: `src/app/api/health/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/health/route.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/app/api/health/route.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement route**

Create `src/app/api/health/route.ts`:
```ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok' });
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/app/api/health/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/health/route.ts src/app/api/health/route.test.ts
git commit -m "feat(api): health check route"
```

---

### Task 11: Login route handler

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/login/route.test.ts`

Background: receives `{username, password, remember}`, calls backend `/auth/login`, on success seals tokens into cookie. On backend error, returns same `{error}` envelope to client.

- [ ] **Step 1: Write failing test**

Create `src/app/api/auth/login/route.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { COOKIE_NAME } from '@/lib/auth/session';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/auth/login', () => {
  it('issues session cookie on backend success', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'A',
            accessTokenExpiresIn: 600,
            refreshToken: 'R',
            refreshTokenExpiresIn: 86400,
            tokenType: 'Bearer',
          },
          error: null,
        }),
        { status: 200 },
      ),
    );
    const res = await POST(makeReq({ username: 'admin', password: 'pw', remember: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { ok: true }, error: null });
    expect(res.cookies.get(COOKIE_NAME)?.value).toBeTruthy();
  });

  it('forwards backend error envelope unchanged with 401', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: null, error: { code: 'AUTH_FAILED', message: '비밀번호가 잘못되었습니다', traceId: 't1' } }),
        { status: 401 },
      ),
    );
    const res = await POST(makeReq({ username: 'admin', password: 'wrong' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_FAILED');
    expect(res.cookies.get(COOKIE_NAME)?.value).toBeFalsy();
  });

  it('rejects malformed body with 400', async () => {
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('does not set cookie maxAge when remember=false', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { accessToken: 'A', accessTokenExpiresIn: 600, refreshToken: 'R', refreshTokenExpiresIn: 86400, tokenType: 'Bearer' }, error: null }), { status: 200 }),
    );
    const res = await POST(makeReq({ username: 'admin', password: 'pw', remember: false }));
    const cookie = res.cookies.get(COOKIE_NAME);
    expect(cookie?.maxAge).toBeUndefined();
  });

  it('sets cookie maxAge to refreshTokenExpiresIn when remember=true', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { accessToken: 'A', accessTokenExpiresIn: 600, refreshToken: 'R', refreshTokenExpiresIn: 86400, tokenType: 'Bearer' }, error: null }), { status: 200 }),
    );
    const res = await POST(makeReq({ username: 'admin', password: 'pw', remember: true }));
    const cookie = res.cookies.get(COOKIE_NAME);
    expect(cookie?.maxAge).toBe(86400);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/app/api/auth/login/route.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement route**

Create `src/app/api/auth/login/route.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sealData } from 'iron-session';
import { COOKIE_NAME, getSessionOptions, type SessionData } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false),
});

interface BackendLoginEnvelope {
  data: SessionData['tokens'] | null;
  error: { code: string; message: string; traceId?: string } | null;
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = LoginBody.parse(await req.json());
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: '요청 형식이 올바르지 않습니다.' } },
      { status: 400 },
    );
  }

  const backendRes = await fetch(`${process.env.BACKEND_API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: parsed.username, password: parsed.password }),
  });

  const envelope = (await backendRes.json()) as BackendLoginEnvelope;

  if (!backendRes.ok || envelope.error || !envelope.data) {
    return NextResponse.json(
      { data: null, error: envelope.error ?? { code: 'AUTH_FAILED', message: '로그인에 실패했습니다.' } },
      { status: backendRes.status === 200 ? 401 : backendRes.status },
    );
  }

  const sessionData: SessionData = { tokens: envelope.data, remember: parsed.remember };
  const opts = getSessionOptions({
    remember: parsed.remember,
    refreshExpiresIn: envelope.data.refreshTokenExpiresIn,
  });
  const sealed = await sealData(sessionData, { password: opts.password });

  const res = NextResponse.json({ data: { ok: true }, error: null });
  res.cookies.set(COOKIE_NAME, sealed, opts.cookieOptions);
  return res;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/app/api/auth/login/route.test.ts`

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/login/route.ts src/app/api/auth/login/route.test.ts
git commit -m "feat(api): login route proxies to backend and seals session cookie"
```

---

### Task 12: Logout route handler

**Files:**
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/logout/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/auth/logout/route.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { sealData } from 'iron-session';
import { POST } from './route';
import { COOKIE_NAME, getSessionOptions, type SessionData } from '@/lib/auth/session';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

async function makeReqWithSession(tokens?: SessionData['tokens']) {
  const data: SessionData = tokens ? { tokens } : {};
  const sealed = await sealData(data, { password: getSessionOptions().password });
  return new NextRequest('http://localhost/api/auth/logout', {
    method: 'POST',
    headers: { cookie: `${COOKIE_NAME}=${sealed}` },
  });
}

describe('POST /api/auth/logout', () => {
  it('clears cookie and returns 200 even when not logged in', async () => {
    const req = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.cookies.get(COOKIE_NAME)?.value).toBe('');
  });

  it('calls backend logout with refresh token, then clears cookie', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: null, error: null }), { status: 200 }));
    global.fetch = fetchSpy;
    const req = await makeReqWithSession({
      accessToken: 'A',
      accessTokenExpiresIn: 600,
      refreshToken: 'R',
      refreshTokenExpiresIn: 86400,
      tokenType: 'Bearer',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const call = fetchSpy.mock.calls[0];
    expect(call[0]).toBe('http://localhost:8080/api/v1/auth/logout');
    expect(JSON.parse(call[1].body as string)).toEqual({ refreshToken: 'R' });
    expect(res.cookies.get(COOKIE_NAME)?.value).toBe('');
  });

  it('clears cookie even if backend logout call fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    const req = await makeReqWithSession({
      accessToken: 'A',
      accessTokenExpiresIn: 600,
      refreshToken: 'R',
      refreshTokenExpiresIn: 86400,
      tokenType: 'Bearer',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.cookies.get(COOKIE_NAME)?.value).toBe('');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/app/api/auth/logout/route.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement route**

Create `src/app/api/auth/logout/route.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import { COOKIE_NAME, getSessionOptions, type SessionData } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sealed = req.cookies.get(COOKIE_NAME)?.value;

  if (sealed) {
    try {
      const data = await unsealData<SessionData>(sealed, { password: getSessionOptions().password });
      const refreshToken = data.tokens?.refreshToken;
      if (refreshToken) {
        await fetch(`${process.env.BACKEND_API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {
          // Ignore backend failure; we still clear the local cookie.
        });
      }
    } catch {
      // corrupted cookie — fall through and clear it
    }
  }

  const res = NextResponse.json({ data: null, error: null });
  res.cookies.set(COOKIE_NAME, '', { ...getSessionOptions().cookieOptions, maxAge: 0 });
  return res;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/app/api/auth/logout/route.test.ts`

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/logout/route.ts src/app/api/auth/logout/route.test.ts
git commit -m "feat(api): logout route calls backend then clears session cookie"
```

---

### Task 13: Proxy catch-all route with 401 → refresh → retry

**Files:**
- Create: `src/app/api/proxy/[...path]/route.ts`
- Create: `src/app/api/proxy/[...path]/route.test.ts`

Background: forwards `{GET, POST, PUT, PATCH, DELETE}` to backend with `Authorization` header from cookie. On 401, refresh once and retry. On refresh failure, clear cookie and return 401.

- [ ] **Step 1: Write failing test**

Create `src/app/api/proxy/[...path]/route.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { sealData } from 'iron-session';
import { GET, POST } from './route';
import { COOKIE_NAME, getSessionOptions, type SessionData } from '@/lib/auth/session';
import { __resetInflight } from '@/lib/auth/refresh';

const originalFetch = global.fetch;

beforeEach(() => __resetInflight());
afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

async function makeRequest(method: 'GET' | 'POST', path: string, body?: unknown, withSession = true) {
  const headers: Record<string, string> = {};
  if (withSession) {
    const sealed = await sealData<SessionData>(
      {
        tokens: {
          accessToken: 'OLD_A',
          accessTokenExpiresIn: 600,
          refreshToken: 'R1',
          refreshTokenExpiresIn: 86400,
          tokenType: 'Bearer',
        },
      },
      { password: getSessionOptions().password },
    );
    headers.cookie = `${COOKIE_NAME}=${sealed}`;
  }
  return new NextRequest(`http://localhost/api/proxy/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('proxy [...path]', () => {
  it('returns 401 when no session cookie', async () => {
    const req = await makeRequest('GET', 'api/v1/me', undefined, false);
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'v1', 'me'] }) });
    expect(res.status).toBe(401);
  });

  it('forwards GET with Authorization header and returns backend body', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 1, name: 'Alice' }, error: null }), { status: 200 }),
    );
    global.fetch = fetchSpy;
    const req = await makeRequest('GET', 'api/v1/me');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'v1', 'me'] }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Alice');
    const callHeaders = fetchSpy.mock.calls[0][1].headers as Record<string, string>;
    expect(callHeaders.authorization).toBe('Bearer OLD_A');
    expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:8080/api/v1/me');
  });

  it('refreshes on 401 and retries with new access token', async () => {
    const fetchSpy = vi.fn()
      // 1) initial call → 401
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      // 2) refresh call → success
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { accessToken: 'NEW_A', accessTokenExpiresIn: 600, refreshToken: 'R2', refreshTokenExpiresIn: 86400, tokenType: 'Bearer' }, error: null }),
          { status: 200 },
        ),
      )
      // 3) retry → success
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ok: true }, error: null }), { status: 200 }),
      );
    global.fetch = fetchSpy;

    const req = await makeRequest('GET', 'api/v1/me');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'v1', 'me'] }) });
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect((fetchSpy.mock.calls[2][1].headers as Record<string, string>).authorization).toBe('Bearer NEW_A');
    // cookie rotated on response
    expect(res.cookies.get(COOKIE_NAME)?.value).toBeTruthy();
  });

  it('returns 401 and clears cookie when refresh fails', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 401 }));
    global.fetch = fetchSpy;

    const req = await makeRequest('GET', 'api/v1/me');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'v1', 'me'] }) });
    expect(res.status).toBe(401);
    expect(res.cookies.get(COOKIE_NAME)?.value).toBe('');
  });

  it('forwards POST body to backend', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { created: true }, error: null }), { status: 201 }),
    );
    global.fetch = fetchSpy;
    const req = await makeRequest('POST', 'api/v1/things', { name: 'x' });
    const res = await POST(req, { params: Promise.resolve({ path: ['api', 'v1', 'things'] }) });
    expect(res.status).toBe(201);
    const sentBody = fetchSpy.mock.calls[0][1].body as string;
    expect(JSON.parse(sentBody)).toEqual({ name: 'x' });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/app/api/proxy/'[...path]'/route.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement proxy route**

Create `src/app/api/proxy/[...path]/route.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, getSessionOptions, type SessionData } from '@/lib/auth/session';
import { getServerSession, saveServerSession, destroyServerSession } from '@/lib/auth/server';
import { refreshTokens } from '@/lib/auth/refresh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'cookie',
  'authorization',
]);

function filterRequestHeaders(src: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  src.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out[key] = value;
  });
  return out;
}

function filterResponseHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== 'set-cookie') {
      out.set(key, value);
    }
  });
  return out;
}

interface ProxyContext {
  params: Promise<{ path: string[] }>;
}

async function readBody(req: NextRequest): Promise<string | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const text = await req.text();
  return text.length === 0 ? undefined : text;
}

async function handle(req: NextRequest, ctx: ProxyContext) {
  const { path } = await ctx.params;
  const cookieStore = req.cookies as unknown as Parameters<typeof getServerSession>[0];
  const session = await getServerSession(cookieStore);

  if (!session.tokens) {
    return NextResponse.json(
      { data: null, error: { code: 'NO_SESSION', message: '인증이 필요합니다.' } },
      { status: 401 },
    );
  }

  const url = `${process.env.BACKEND_API_URL}/${path.join('/')}${req.nextUrl.search}`;
  const body = await readBody(req);

  async function call(accessToken: string) {
    return fetch(url, {
      method: req.method,
      headers: { ...filterRequestHeaders(req.headers), authorization: `Bearer ${accessToken}` },
      body,
    });
  }

  let backendRes = await call(session.tokens.accessToken);
  let rotatedTokens: SessionData['tokens'] | null = null;

  if (backendRes.status === 401) {
    const fresh = await refreshTokens(session.tokens.refreshToken);
    if (!fresh) {
      const failed = NextResponse.json(
        { data: null, error: { code: 'SESSION_EXPIRED', message: '세션이 만료되었습니다.' } },
        { status: 401 },
      );
      failed.cookies.set(COOKIE_NAME, '', { ...getSessionOptions().cookieOptions, maxAge: 0 });
      return failed;
    }
    rotatedTokens = fresh;
    backendRes = await call(fresh.accessToken);
  }

  const responseBody = await backendRes.text();
  const out = new NextResponse(responseBody, {
    status: backendRes.status,
    headers: filterResponseHeaders(backendRes.headers),
  });

  if (rotatedTokens) {
    const data: SessionData = { tokens: rotatedTokens, remember: session.remember };
    const sealedStore = out.cookies as unknown as Parameters<typeof saveServerSession>[0];
    await saveServerSession(sealedStore, data);
  }

  return out;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/app/api/proxy/'[...path]'/route.test.ts`

Expected: PASS (5 tests).

If `getServerSession`/`saveServerSession` type signatures don't perfectly match `req.cookies` / `out.cookies`, narrow the cast or expand `CookieStoreLike` to make the proxy compile. Adjust the cookie-store cast minimally — do not weaken type strictness.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/proxy/'[...path]'/route.ts src/app/api/proxy/'[...path]'/route.test.ts
git commit -m "feat(api): proxy with single-flight 401 refresh and cookie rotation"
```

---

### Task 14: Middleware (Edge auth gate)

**Files:**
- Create: `src/middleware.ts`
- Create: `src/middleware.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/middleware.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { sealData } from 'iron-session';
import { middleware } from './middleware';
import { COOKIE_NAME, getSessionOptions, type SessionData } from './lib/auth/session';

describe('middleware', () => {
  it('redirects to /login when no session cookie', async () => {
    const req = new NextRequest('http://localhost/');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('location')).toContain('next=%2F');
  });

  it('redirects to /login when cookie is corrupt', async () => {
    const req = new NextRequest('http://localhost/dashboard', {
      headers: { cookie: `${COOKIE_NAME}=garbage` },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects to /login when sealed but no tokens inside', async () => {
    const sealed = await sealData<SessionData>({}, { password: getSessionOptions().password });
    const req = new NextRequest('http://localhost/dashboard', {
      headers: { cookie: `${COOKIE_NAME}=${sealed}` },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('passes through when valid session present', async () => {
    const sealed = await sealData<SessionData>(
      { tokens: { accessToken: 'A', accessTokenExpiresIn: 1, refreshToken: 'R', refreshTokenExpiresIn: 1, tokenType: 'Bearer' } },
      { password: getSessionOptions().password },
    );
    const req = new NextRequest('http://localhost/dashboard', {
      headers: { cookie: `${COOKIE_NAME}=${sealed}` },
    });
    const res = await middleware(req);
    // NextResponse.next() returns status 200 with x-middleware-next header
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('preserves the original path in the next query param', async () => {
    const req = new NextRequest('http://localhost/servers?q=foo');
    const res = await middleware(req);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('next')).toBe('/servers?q=foo');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/middleware.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement middleware**

Create `src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import { COOKIE_NAME, getSessionOptions, type SessionData } from '@/lib/auth/session';

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const sealed = req.cookies.get(COOKIE_NAME)?.value;
  if (!sealed) return redirectToLogin(req);

  try {
    const data = await unsealData<SessionData>(sealed, { password: getSessionOptions().password });
    if (!data?.tokens) return redirectToLogin(req);
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

export const config = {
  matcher: ['/((?!api|_next|login|favicon.ico).*)'],
};
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/middleware.test.ts`

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts
git commit -m "feat(auth): edge middleware redirects unauthenticated requests"
```

---

## Phase C — API Codegen

### Task 15: Orval config + custom mutator + generate types

**Files:**
- Create: `orval.config.ts`
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/query-client.ts`
- Generate: `src/api/generated/**`

Background: Orval generates React Query hooks targeting `/api/proxy/...` (browser) using a custom mutator that unwraps the envelope. The mutator throws `ApiError` so React Query exposes error state cleanly.

- [ ] **Step 1: Verify backend OpenAPI is reachable**

Run: `curl -s http://localhost:8080/v3/api-docs | head -c 200`

Expected: prints JSON starting with `{"openapi":"3.1.0",...`. If not, start backend or skip generation step.

- [ ] **Step 2: Create lib/api/client.ts (custom mutator)**

Create `src/lib/api/client.ts`:
```ts
import { ApiError, unwrapEnvelope, type Envelope } from './envelope';

export interface MutatorRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const PROXY_BASE = '/api/proxy';

function buildQuery(params?: MutatorRequest['params']): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function mutator<T>({ url, method, params, data, headers, signal }: MutatorRequest): Promise<T> {
  const target = `${PROXY_BASE}${url.startsWith('/') ? url : `/${url}`}${buildQuery(params)}`;
  const res = await fetch(target, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  let json: Envelope<T>;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError('NETWORK_ERROR', `예상치 못한 응답 (HTTP ${res.status})`);
  }

  if (!res.ok && !json.error) {
    throw new ApiError('HTTP_ERROR', `HTTP ${res.status}`);
  }

  return unwrapEnvelope(json);
}

export default mutator;
```

- [ ] **Step 3: Create orval.config.ts**

Create `orval.config.ts`:
```ts
import { defineConfig } from 'orval';

export default defineConfig({
  cidApi: {
    input: {
      target: `${process.env.BACKEND_API_URL ?? 'http://localhost:8080'}/v3/api-docs`,
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/model',
      client: 'react-query',
      prettier: true,
      override: {
        mutator: {
          path: 'src/lib/api/client.ts',
          name: 'mutator',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
```

- [ ] **Step 4: Generate the API client**

Run: `pnpm gen:api`

Expected: writes files under `src/api/generated/`. Inspect a couple to confirm hooks like `useLogin` were generated.

If generation fails because Orval requires `@tanstack/query-core`/`axios`, install missing peer deps. With `client: 'react-query'`, no axios is needed; the `mutator` is our fetch wrapper.

- [ ] **Step 5: Create lib/api/query-client.ts**

Create `src/lib/api/query-client.ts`:
```ts
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './envelope';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry(failureCount, error) {
          if (error instanceof ApiError && error.code === 'NO_SESSION') return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
```

- [ ] **Step 6: Verify typecheck and tests pass**

Run: `pnpm typecheck && pnpm test`

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add orval.config.ts src/lib/api/client.ts src/lib/api/query-client.ts src/api/generated
git commit -m "feat(api): orval generation with envelope-aware mutator and query client"
```

---

## Phase D — Client UI

### Task 16: Providers (TanStack Query + Sonner) and root layout

**Files:**
- Create: `src/components/providers.tsx`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: Create Providers**

Create `src/components/providers.tsx`:
```tsx
'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createQueryClient } from '@/lib/api/query-client';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Create root layout**

Create `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'CMDB',
  description: 'Configuration Management Database',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/providers.tsx src/app/layout.tsx
git commit -m "feat(app): root layout with query and toast providers"
```

---

### Task 17: (auth) layout — gradient fullscreen

**Files:**
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Implement layout**

Create `src/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-login-gradient flex items-center justify-center p-6">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/(auth)/layout.tsx'
git commit -m "feat(ui): auth route group gradient layout"
```

---

### Task 18: Login form (schema, hook, component, page)

**Files:**
- Create: `src/components/features/auth/schema.ts`
- Create: `src/components/features/auth/use-login.ts`
- Create: `src/components/features/auth/login-form.tsx`
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create Zod schema**

Create `src/components/features/auth/schema.ts`:
```ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
  remember: z.boolean().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Create useLogin hook**

Create `src/components/features/auth/use-login.ts`:
```ts
'use client';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/envelope';
import type { LoginInput } from './schema';

interface LoginEnvelope {
  data: { ok: true } | null;
  error: { code: string; message: string; traceId?: string } | null;
}

async function postLogin(input: LoginInput): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as LoginEnvelope;
  if (json.error) throw new ApiError(json.error.code, json.error.message, json.error.traceId);
  if (!res.ok || !json.data) throw new ApiError('UNKNOWN', '로그인에 실패했습니다.');
}

export function useLogin() {
  return useMutation({ mutationFn: postLogin });
}
```

- [ ] **Step 3: Create login form component**

Create `src/components/features/auth/login-form.tsx`:
```tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/envelope';
import { loginSchema, type LoginInput } from './schema';
import { useLogin } from './use-login';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const login = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', remember: false },
  });

  async function onSubmit(values: LoginInput) {
    try {
      await login.mutateAsync(values);
      toast.success('로그인되었습니다.');
      router.replace(next);
      router.refresh();
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '로그인에 실패했습니다.';
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <Alert variant="info">
          회사 LDAP / Active Directory 계정으로 로그인합니다.
        </Alert>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>아이디 (사번 또는 이메일)</FormLabel>
              <Input placeholder="hong@company.com 또는 E12345" autoComplete="username" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>비밀번호</FormLabel>
              <Input type="password" placeholder="LDAP 비밀번호" autoComplete="current-password" {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <Checkbox
                id="remember"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(Boolean(v))}
              />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                로그인 상태 유지
              </label>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? '로그인 중...' : 'LDAP 로그인'}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 4: Create login page**

Create `src/app/(auth)/login/page.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/features/auth/login-form';

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔧</div>
        <h1 className="text-2xl font-bold text-white">CMDB</h1>
        <p className="text-sm text-white/60 mt-1">Configuration Management Database</p>
      </div>
      <Card className="rounded-lg shadow-modal">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <p className="text-center text-xs text-white/40 mt-6">© 2026 CMDB v1.0</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify typecheck**

Run: `pnpm typecheck`

Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/auth 'src/app/(auth)/login'
git commit -m "feat(auth): login page with form, schema, and useLogin hook"
```

---

### Task 19: (app) layout — AppShell, Sidebar, Header skeleton

**Files:**
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/page.tsx`

- [ ] **Step 1: Create Sidebar**

Create `src/components/layout/sidebar.tsx`:
```tsx
import Link from 'next/link';

interface MenuItem {
  href: string;
  label: string;
  icon: string;
}

const groups: { title: string; items: MenuItem[] }[] = [
  { title: '메인', items: [{ href: '/', label: '대시보드', icon: '📊' }] },
];

export function Sidebar() {
  return (
    <aside className="w-[220px] bg-sidebar text-sidebar-foreground overflow-y-auto flex-shrink-0">
      <div className="px-5 py-4 text-lg font-bold text-sidebar-primary border-b border-white/10">
        🔧 CMDB
      </div>
      {groups.map((g) => (
        <div key={g.title} className="py-2">
          <div className="px-5 py-2 text-[11px] uppercase tracking-wider text-white/50">
            {g.title}
          </div>
          {g.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-6 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: Create Header (placeholder for user info; populated in Task 20)**

Create `src/components/layout/header.tsx`:
```tsx
import { UserMenu } from './user-menu';

export function Header() {
  return (
    <header className="h-14 bg-background border-b flex items-center px-6 gap-4">
      <div className="text-base font-bold text-primary">CMDB</div>
      <div className="flex-1" />
      <UserMenu />
    </header>
  );
}
```

- [ ] **Step 3: Create UserMenu placeholder (filled in Task 20)**

Create `src/components/layout/user-menu.tsx`:
```tsx
export function UserMenu() {
  return <div className="text-sm text-muted-foreground">로딩 중...</div>;
}
```

- [ ] **Step 4: Create AppShell**

Create `src/components/layout/app-shell.tsx`:
```tsx
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/40 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire layout and placeholder dashboard**

Create `src/app/(app)/layout.tsx`:
```tsx
import { AppShell } from '@/components/layout/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

Create `src/app/(app)/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">대시보드</h1>
      <p className="text-sm text-muted-foreground">로그인 성공 시 보이는 보호된 페이지입니다.</p>
    </div>
  );
}
```

- [ ] **Step 6: Verify typecheck**

Run: `pnpm typecheck`

Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout 'src/app/(app)'
git commit -m "feat(ui): app shell with sidebar, header, dashboard placeholder"
```

---

### Task 20: /me hook + UserMenu with logout

**Files:**
- Create: `src/components/features/auth/use-me.ts`
- Create: `src/components/features/auth/use-logout.ts`
- Modify: `src/components/layout/user-menu.tsx`

Background: `/api/v1/me` is fetched through `/api/proxy/api/v1/me`. Use an Orval-generated hook if it exists; if generation produced `useMe()`, prefer it. Otherwise fall back to a hand-written hook using the mutator.

- [ ] **Step 1: Create use-me wrapper**

Create `src/components/features/auth/use-me.ts`:
```ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { mutator } from '@/lib/api/client';

export interface MyProfile {
  id: number;
  empNo: string;
  name: string;
  email: string;
  roles: string[];
  department: { id: number; code: string; name: string } | null;
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => mutator<MyProfile>({ url: '/api/v1/me', method: 'GET' }),
    staleTime: 60_000,
  });
}
```

> If Orval generated `useMe` (in `src/api/generated/me/me.ts`), import and re-export it from this file instead. Verify the generated hook signature matches before substituting; if it returns the envelope rather than `data`, the mutator already unwraps so it should be `MyProfile`.

- [ ] **Step 2: Create use-logout hook**

Create `src/components/features/auth/use-logout.ts`:
```ts
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export function useLogout() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      qc.clear();
      router.replace('/login');
      router.refresh();
    },
  });
}
```

- [ ] **Step 3: Replace UserMenu placeholder**

Replace `src/components/layout/user-menu.tsx` entirely:
```tsx
'use client';
import { Button } from '@/components/ui/button';
import { useMe } from '@/components/features/auth/use-me';
import { useLogout } from '@/components/features/auth/use-logout';

export function UserMenu() {
  const me = useMe();
  const logout = useLogout();

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">
        {me.isPending ? '로딩 중...' : me.data ? `${me.data.name} (${me.data.empNo})` : '게스트'}
      </span>
      <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
        {logout.isPending ? '로그아웃 중...' : '로그아웃'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck`

Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/auth/use-me.ts src/components/features/auth/use-logout.ts src/components/layout/user-menu.tsx
git commit -m "feat(auth): user menu shows /me profile with logout button"
```

---

## Phase E — E2E + Verification

### Task 21: Playwright smoke test

**Files:**
- Create: `tests/e2e/login.spec.ts`

Background: requires backend running at `BACKEND_API_URL` and a valid LDAP test account. Test is skipped automatically if `E2E_USERNAME` / `E2E_PASSWORD` env vars are absent — keeps CI green when credentials aren't configured.

- [ ] **Step 1: Generate a SESSION_SECRET for local .env.local**

Run:
```bash
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> .env.local
echo 'BACKEND_API_URL=http://localhost:8080' >> .env.local
echo 'NEXT_PUBLIC_APP_NAME=CMDB' >> .env.local
```

Verify: `cat .env.local` shows the three keys.

- [ ] **Step 2: Create the spec**

Create `tests/e2e/login.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;
const skip = !username || !password;

test.describe('login flow', () => {
  test.skip(skip, 'E2E_USERNAME and E2E_PASSWORD are required for this test');

  test('LDAP login redirects to dashboard then logs out', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('아이디').fill(username!);
    await page.getByLabel('비밀번호').fill(password!);
    await page.getByRole('button', { name: 'LDAP 로그인' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();

    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirect preserves the original path via ?next=', async ({ page }) => {
    await page.goto('/?someparam=1');
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
```

- [ ] **Step 3: Run the spec (smoke)**

Run: `E2E_USERNAME=<your-ldap-id> E2E_PASSWORD=<your-pw> pnpm test:e2e`

Expected: both tests pass. If they fail, check that the backend is running at `BACKEND_API_URL` and that the credentials work in Swagger UI.

If you don't have working credentials, run `pnpm test:e2e` without env vars and confirm the test is reported as skipped — that proves the test infra is functional.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/login.spec.ts
git commit -m "test(e2e): playwright smoke for login → dashboard → logout"
```

---

### Task 22: README, dev quickstart, lint+typecheck verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

Create `README.md`:
```markdown
# cid-web

Next.js 15 frontend for the CMDB (Configuration Management Database) backed by the Spring Boot `cid-api`.

See `claude.md` for project rules and `docs/architecture.md` for architecture decisions.

## Prerequisites

- Node.js 20 or 22
- pnpm 9+
- The Spring Boot `cid-api` running at `BACKEND_API_URL` (default `http://localhost:8080`)

## Setup

```bash
pnpm install
cp .env.example .env.local
# Generate a SESSION_SECRET (>= 32 chars):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the output as SESSION_SECRET in .env.local

pnpm gen:api      # regenerate the API client from /v3/api-docs
pnpm dev          # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest unit & integration tests |
| `pnpm test:e2e` | Playwright e2e (requires E2E_USERNAME and E2E_PASSWORD env vars) |
| `pnpm gen:api` | Regenerate `src/api/generated/` from the backend OpenAPI spec |
| `pnpm format` | Prettier |

## Architecture

This frontend implements a Full BFF — the browser only talks to Next.js Route Handlers under `/api/*`, never directly to the backend. Tokens live exclusively inside an `iron-session` encrypted httpOnly cookie. See `docs/architecture.md` for the full record.
```

- [ ] **Step 2: Run the full verification suite**

Run:
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all four commands exit 0. `pnpm build` will load `.env.local` — confirm it succeeds with the test session secret.

- [ ] **Step 3: Manual smoke in a browser**

Run: `pnpm dev` then open `http://localhost:3000`.

Expected behavior:
1. You are redirected to `/login` immediately.
2. The login screen renders the gradient background, white card, LDAP form.
3. Submit invalid credentials → toast shows the backend error message; cookie is not set.
4. Submit valid LDAP credentials → redirected to `/` (dashboard placeholder); the header user menu shows your name and employee number.
5. Clicking "로그아웃" returns you to `/login`.
6. Open DevTools → Application → Cookies → `cid_session` is `HttpOnly`, `Secure` (in production), `SameSite=Lax`. JS console: `document.cookie` does NOT contain `cid_session` → confirms HttpOnly is working.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: readme with setup and architecture overview"
```

---

## Done

After Task 22, the MVP milestone is complete:
- Empty repo → bootstrapped Next.js 15 app
- LDAP login through BFF; tokens never reach JS
- Protected `(app)` routes via Edge middleware
- Logout clears session both client- and server-side
- Single-flight refresh on 401 keeps long sessions alive
- All BFF logic covered by Vitest TDD; one Playwright smoke for the full flow

Outstanding items deferred to follow-up plans:
- Domain pages (servers, racks, IPs, etc. from prototype)
- /me-driven role/department gating in middleware
- Stale-API-codegen CI guard
- i18n / dark mode / accessibility audit
- Observability (logging, traceId surfacing)

The next plan should be brainstormed using `superpowers:brainstorming` once the team picks a domain area to start on.
