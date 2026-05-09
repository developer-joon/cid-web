# CLAUDE.md (Next.js 프로젝트)

이 파일의 위치: `<project-root>/CLAUDE.md`
적용 범위: **이 프로젝트 한정**

## 0. 문서 우선순위

1. `~/.claude/CLAUDE.md` — 글로벌 베이스라인 (사고 원칙, 일반 행동 규칙)
2. **이 파일** — 프로젝트 특화 규칙
3. `docs/architecture.md` — ADR (구체 결정사항)

충돌 시 더 구체적인 쪽이 우선 (3 > 2 > 1).
글로벌에 이미 있는 일반 원칙(추측 금지, 수술적 변경, 단순함 우선, 현재 파일 확인 등)은 여기서 반복하지 않는다.

---

## 1. 프로젝트 개요

Spring Boot 기반 사내 API 서버와 연동되는 **Next.js 15 프론트엔드**.
인증은 **LDAP 기반 로그인**, 최초 마일스톤은 "로그인 → 보호된 라우트 접근".

- **백엔드**: Spring Boot @ `http://localhost:8080` (별도 리포지토리, 수정 금지)
- **프론트엔드**: 이 리포지토리
- **API 명세**: `http://localhost:8080/v3/api-docs` (OpenAPI 3)
- **Swagger UI**: `http://localhost:8080/swagger-ui/index.html` (사람이 볼 때만)

---

## 2. 기술 스택

| 영역           | 선택                        | 비고                                |
| -------------- | --------------------------- | ----------------------------------- |
| 프레임워크     | Next.js 15 (App Router)     | Server Components 우선              |
| 언어           | TypeScript (strict)         | `any` 금지                          |
| 스타일         | Tailwind CSS + shadcn/ui    | 프로토타입 디자인에 맞춰 theme 조정 |
| API 클라이언트 | Orval (React Query 훅 생성) | OpenAPI → 자동 생성                 |
| 서버 상태      | TanStack Query              | Orval이 함께 사용                   |
| 폼             | React Hook Form + Zod       |                                     |
| 런타임 검증    | Zod                         | 외부 데이터는 모두 검증             |
| 패키지 매니저  | pnpm                        | lockfile 커밋                       |

스택 변경이 필요하다고 판단되면 글로벌 원칙에 따라 먼저 제안하고 승인받을 것.

---

## 3. 디렉토리 구조

```
frontend/
├── CLAUDE.md                  # 이 파일
├── docs/
│   ├── prototype/             # ⚠️ UI 프로토타입 HTML. UI 작업 시 반드시 먼저 읽을 것 (§4)
│   ├── architecture.md        # ADR
│   └── api-spec.md            # 백엔드 연동 메모
├── src/
│   ├── app/
│   │   ├── (auth)/            # 비인증 라우트 그룹
│   │   ├── (app)/             # 인증 필요 라우트 그룹
│   │   └── api/               # Next.js Route Handlers (BFF 계층)
│   ├── api/
│   │   └── generated/         # ⛔ Orval 자동 생성. 직접 수정 금지
│   ├── components/
│   │   ├── ui/                # shadcn/ui 원본 (가능한 한 유지)
│   │   └── features/          # 도메인별 컴포넌트 (예: features/auth)
│   ├── lib/
│   │   ├── api-client.ts      # fetch 인스턴스 + 인터셉터
│   │   ├── auth.ts            # 인증 상태/토큰 헬퍼
│   │   └── utils.ts           # cn(), 공용 유틸
│   ├── hooks/                 # 공용 커스텀 훅
│   ├── types/                 # 도메인 타입 (생성 타입은 api/generated)
│   └── middleware.ts          # 인증 가드
├── orval.config.ts
└── next.config.mjs
```

새 폴더를 만들기 전에 위 구조에서 위치를 찾을 수 있는지 먼저 확인. 못 찾으면 제안 후 승인.

---

## 4. UI 작업 — 프로토타입이 진실 공급원

UI 관련 작업을 시작하기 전에 반드시:

1. `docs/prototype/` 디렉토리를 먼저 확인
2. 작업 대상 화면에 해당하는 HTML 파일을 **전체** 읽기 (일부만 보지 말 것)
3. 다음을 추출해서 작업에 반영:
   - 레이아웃 구조 (그리드/플렉스, 여백)
   - 색상 팔레트 (hex 값)
   - 타이포그래피 (폰트 패밀리, 크기, weight)
   - 인터랙션 힌트 (hover, focus, disabled 상태 클래스)
   - 아이콘/이미지 에셋 위치

프로토타입과 **다르게 구현**해야 한다고 판단되면, 이유와 함께 사용자에게 확인 요청 후 승인되면 `docs/architecture.md`에 결정사항 기록.

프로토타입은 **비주얼/레이아웃의 진실 공급원**이지만, 코드 품질은 Next.js/React 관용구를 따름 (인라인 스타일 → Tailwind, jQuery 이벤트 → React 핸들러 등).

---

## 5. API 연동 규칙

### 5.1 자동 생성 우선

- 모든 API 호출은 `src/api/generated/`의 Orval 생성 코드를 통해서만.
- 직접 `fetch('/api/...')` 호출 금지 (Next.js Route Handler 내부 제외).
- 엔드포인트가 없거나 스펙이 부실하면 사용자에게 백엔드 업데이트 요청.

### 5.2 타입 재생성

- 백엔드 API가 변경되면: `pnpm gen:api` 실행
- 생성 코드 커밋 여부는 `docs/architecture.md` 기준 따름
- 생성 코드에 `// @ts-ignore` 추가하거나 수동 수정 **금지**

### 5.3 에러 처리

- Orval + React Query의 `onError` 또는 `error` 상태를 반드시 처리
- 사용자 노출 에러 메시지는 한국어, 토스트/인라인으로 일관되게
- 401 응답은 `api-client.ts` 인터셉터에서 전역 처리 (로그인 페이지로 리다이렉트)

---

## 6. 인증 처리

세부 방식은 `docs/architecture.md`에 정의됨. 이 섹션은 **불변 원칙**만 명시.

- 자격 증명(username/password)은 **절대** localStorage/sessionStorage에 저장 금지
- 토큰 저장은 **httpOnly 쿠키 우선**. 불가피할 때만 메모리 저장
- 로그인 요청/응답 DTO는 Orval 생성 타입을 사용 (수동 정의 금지)
- 보호된 라우트는 `middleware.ts`에서 **서버 사이드** 검증
- 클라이언트 사이드 리다이렉트만으로 인증을 강제하지 말 것 (우회 가능)

---

## 7. 코딩 규칙 (이 프로젝트 한정)

### 7.1 TypeScript

- `tsconfig.json`의 `strict: true` 유지
- `any`, `as any`, `@ts-ignore` 금지. 불가피하면 주석으로 이유 설명
- 외부 입력(URL params, localStorage, 사용자 입력 등)은 Zod로 파싱

### 7.2 React / Next.js

- **서버 컴포넌트 기본**, `"use client"`는 필요할 때만 (상태, 이벤트, 브라우저 API)
- `"use client"`는 리프 컴포넌트에 둘 것. 상위에 두면 트리 전체가 클라이언트가 됨
- 데이터 페칭은 서버 컴포넌트에서 직접, 또는 Route Handler 경유
- 클라이언트 컴포넌트 데이터는 TanStack Query로

### 7.3 스타일

- Tailwind 유틸리티 우선
- 긴 클래스 나열은 `clsx` + `tailwind-merge` (`cn()` 헬퍼) 사용
- 컴포넌트 variant는 `cva` (class-variance-authority)
- 임의 색상 값 금지 — `tailwind.config`의 theme 토큰 사용

### 7.4 폼

- React Hook Form + Zod resolver
- `zodResolver`에 넘기는 스키마는 재사용 가능하게 `features/*/schema.ts`로 분리
- 에러 메시지는 Zod 스키마 내부에 한국어로 정의

### 7.5 파일/변수 명명

- 파일: `kebab-case.tsx` (컴포넌트 파일도 동일)
- 컴포넌트: `PascalCase`
- 훅: `useCamelCase`
- 상수: `SCREAMING_SNAKE_CASE`
- 타입/인터페이스: `PascalCase` (접두사 `I` 붙이지 말 것)

---

## 8. 작업 진행 — 프로젝트 특화 분기

글로벌의 "작업 크기 분기"에 더해 이 프로젝트의 추가 규칙:

- **UI 작업이면** `docs/prototype/` 먼저 확인 (§4)
- **API 작업이면** `src/api/generated/` 또는 OpenAPI 스펙 먼저 확인 (§5)
- **파일 3개 이상 생성/수정**이 예상되면 phase로 쪼개서 phase마다 중간 확인 요청
- **의존성 추가 시** 이유 설명 후 설치
- **새 환경변수**가 필요하면 `.env.example`에도 즉시 반영

### 완료 시 체크리스트

- `pnpm lint && pnpm typecheck` 통과 확인 (실패 시 수정)
- 새로 만든 public API(훅, 컴포넌트)는 짧은 JSDoc 주석 추가
- 중요한 결정은 `docs/architecture.md`에 기록

### 이 프로젝트에서 명시적으로 금지

- ❌ 프로토타입 디자인과 임의로 다르게 구현 (§4 절차 없이)
- ❌ `console.log` 잔여물 커밋 (디버그용이면 제거)
- ❌ 생성 파일(`src/api/generated/`) 수동 수정
- ❌ `git push`, 브랜치 강제 조작 (명시적 요청이 없다면)

---

## 9. 로컬 개발 환경

```bash
pnpm install          # 의존성 설치
pnpm gen:api          # API 타입 생성 (백엔드 실행 중이어야 함)
pnpm dev              # 개발 서버 (http://localhost:3000)
pnpm lint
pnpm typecheck
pnpm build            # 프로덕션 빌드 확인
```

**선결 조건**: 백엔드 서버가 `http://localhost:8080`에서 실행 중이어야 함.
CORS는 Next.js `rewrites`로 프록시 처리 (`next.config.mjs` 참조) — 브라우저에서는 동일 출처로 보임.

### 환경변수

- `.env.local` — 로컬 개발용 (커밋 금지)
- `.env.example` — 키 목록만 (커밋 대상, 실제 값 금지)
- `NEXT_PUBLIC_*` 접두사는 **클라이언트 번들에 포함**됨 → 민감 정보 절대 금지

---

## 10. 커뮤니케이션 — 프로젝트 특화

- **한국어**로 응답
- 기술 용어는 원어 유지 (예: "서버 컴포넌트", "미들웨어")

(추측 금지, 옵션·트레이드오프 제시, 작업 전후 요약 등 일반 원칙은 글로벌 참조)

---

## 11. 참고 문서

- `docs/architecture.md` — ADR. 이 파일과 충돌 시 ADR 우선 (§0 순서 참조)
- `docs/prototype/` — UI 프로토타입 원본
- `docs/api-spec.md` — 백엔드 연동 메모 (엔드포인트 특이사항 등)

