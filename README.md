# React Clean Architecture + Feature-Based Design Pattern

Clean Architecture와 Feature-Based 패턴을 조합한 React CSR 프로젝트 템플릿.

## 기술 스택

| 범주 | 도구 |
|------|------|
| 런타임 | Node.js 20+ |
| 패키지 매니저 | pnpm |
| 빌드 도구 | Vite 8 |
| 언어 | TypeScript 6 (strict mode) |
| UI 프레임워크 | React 19 |
| 스타일링 | Tailwind CSS v4 + shadcn/ui |
| 서버 상태 | @tanstack/react-query |
| 클라이언트 상태 | zustand (쿠키 persist) |
| 라우팅 | @tanstack/react-router (코드 기반) |
| 폼 검증 | react-hook-form + zod |
| HTTP 클라이언트 | axios |
| 에러 처리 | react-error-boundary |
| 최적화 | React Compiler (자동 메모이제이션) |
| 단위/통합 테스트 | Vitest + Testing Library + MSW |
| E2E 테스트 | Playwright |

## 시작하기

### 사전 요구사항

- Node.js 20 이상
- pnpm (`corepack enable`로 활성화)

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm run dev
```

http://localhost:5173 에서 확인 가능합니다.

### 환경 변수

`.env.development`과 `.env.production`에서 API 서버 URL을 관리합니다.

| 변수 | 설명 | 예시 |
|------|------|------|
| `VITE_API_BASE_URL` | API 서버 기본 URL | `http://localhost:3000` |

## 스크립트

```bash
pnpm run dev            # 개발 서버
pnpm run build          # TypeScript 체크 + Vite 프로덕션 빌드
pnpm run typecheck      # TypeScript 타입 체크만
pnpm run lint           # ESLint 검사
pnpm run test           # 단위/통합 테스트 실행
pnpm run test:watch     # 테스트 watch 모드
pnpm run test:coverage  # 테스트 커버리지 리포트
pnpm run test:e2e       # E2E 테스트 (Playwright)
pnpm run test:e2e:ui    # E2E 테스트 UI 모드
```

단일 파일 테스트:

```bash
pnpm vitest run src/test/domain/entities.test.ts
pnpm playwright test e2e/auth.spec.ts
```

## 아키텍처

### 의존성 방향

```
domain (순수 TS) ← infrastructure (어댑터) ← features (훅+컴포넌트) → shared/ui
                                              ↓
                                           pages (페이지 레이아웃)
                                              ↓
                                           router (라우트 정의)
```

### 폴더 구조

```
src/
├── domain/{도메인}/          # 순수 TypeScript — 외부 라이브러리 import 금지
│   ├── entities.ts          # 타입 정의 + 비즈니스 로직 순수 함수
│   ├── repository.ts        # 역할별 인터페이스 (Commands / Queries)
│   └── usecases/            # 비즈니스 로직이 있는 UseCase만
│
├── infrastructure/           # 어댑터 — 도메인별 그룹핑
│   ├── api/
│   │   ├── apiClient.ts     # 공용 axios (baseURL, 인증 interceptor, 에러 처리)
│   │   └── {도메인}/        # Repository 구현체
│   ├── query/{도메인}/       # React Query 키 팩토리
│   └── store/{도메인}/       # Zustand UI 상태
│
├── features/{기능}/          # 기능 단위 분리 — 플랫 구조
│   ├── {Component}.tsx      # UI 컴포넌트
│   ├── use{Action}.ts       # 커스텀 훅
│   └── __tests__/           # 테스트 (유일한 하위 폴더)
│
├── pages/                    # 페이지 레이아웃 컴포넌트
│   └── {Name}Page.tsx       # features 컴포넌트를 조합
│
├── router/                   # 라우팅 — 도메인별 분리
│   ├── index.ts             # routeTree 조합 + createRouter
│   ├── rootRoute.tsx        # 루트 레이아웃
│   └── {도메인}Routes.ts    # 도메인별 라우트 정의 + 가드
│
├── shared/                   # 공용 코드
│   ├── ui/                  # shadcn 컴포넌트
│   ├── lib/                 # 유틸리티
│   └── {공유훅}.ts          # 여러 feature에서 사용하는 훅
│
├── providers/                # React 프로바이더 (QueryClient, Router, ErrorBoundary)
└── test/                     # 테스트 인프라
    ├── domain/              # Domain 단위 테스트
    ├── mocks/               # MSW 핸들러 + 서버 설정
    └── setup.ts             # 테스트 환경 설정
```

### 새 도메인 추가 순서

1. `domain/{도메인}/entities.ts` — Entity 타입 + 순수 함수
2. `domain/{도메인}/repository.ts` — Repository 인터페이스 (Commands/Queries 분리)
3. `domain/{도메인}/usecases/` — 비즈니스 로직이 있는 UseCase만 (단순 CRUD는 생략)
4. `infrastructure/api/{도메인}/` — API Repository 구현체
5. `infrastructure/query/{도메인}/` — Query Key Factory
6. `infrastructure/store/{도메인}/` — Zustand 상태 (필요 시)
7. `features/{기능}/` — 훅 + 컴포넌트
8. `pages/{Name}Page.tsx` — 페이지 컴포넌트
9. `router/{도메인}Routes.ts` — 라우트 정의 후 `router/index.ts`에 등록

## 주요 설계 결정

### API 통신

- 모든 API 경로는 `/v1` 접두사 사용 (예: `/v1/auth/login`, `/v1/auth/profile`)
- 서버 응답은 NestJS 표준 응답을 그대로 사용 (래퍼 없음). Repository에서 `data` 그대로 반환
- 인증 토큰은 apiClient의 request interceptor가 쿠키에서 읽어 `Authorization: Bearer {token}` 헤더로 자동 주입
- **401 응답 시** apiClient의 response interceptor가 refresh token으로 자동 갱신 후 원본 요청을 재시도. 동시 요청은 단일 큐로 합쳐 한 번만 갱신. 갱신 실패 시 토큰 클리어
- 에러 처리는 apiClient의 response interceptor에서 공통 처리. Repository에서 수동 헤더 설정이나 try/catch 불필요
- 멱등성이 필요한 엔드포인트(예: 게시글 생성)는 `Idempotency-Key` 헤더(UUID v4) 자동 주입 필요

### UseCase 분리 기준

- **UseCase 클래스를 만드는 경우:** 입력 검증, 여러 Repository 조합, 계산/변환 등 비즈니스 로직이 있을 때
- **UseCase 없이 직접 사용하는 경우:** Repository 메서드를 그대로 호출하는 단순 CRUD

### React Compiler

react-compiler가 적용되어 있으므로 `useMemo`, `useCallback`, `React.memo`를 수동으로 사용하지 않습니다.

### TypeScript 6

- `erasableSyntaxOnly: true` — `private readonly` 대신 `#` private field 사용
- `strict: true` — error 타입은 `unknown`, 반드시 `instanceof` 체크
- `@/*` 경로 별칭 사용

### 인증

- JWT 이중 토큰 — Access Token(기본 15분) + Refresh Token(기본 7일). Refresh Token은 SHA256 + bcrypt로 백엔드 DB에 저장되어 무효화 가능
- 토큰은 쿠키에 저장 (zustand persist + js-cookie, 7일 만료)
- 라우트 가드는 `beforeLoad`에서 `useAuthStore.getState()`로 인증 상태 확인
- apiClient의 request interceptor가 매 요청에 `Authorization: Bearer {token}` 헤더 자동 주입
- 401 응답 시 response interceptor가 refresh 토큰으로 갱신 후 원본 요청을 자동 재시도 (단일 큐로 동시 갱신 방지)

## 테스트 전략

| 레이어 | 위치 | 도구 | 대상 |
|--------|------|------|------|
| Domain | `src/test/domain/` | Vitest | Entity 순수 함수 (UseCase 도입 시 mock repository 단위 테스트) |
| Feature/Infra | `src/features/{기능}/__tests__/`, `src/infrastructure/**/__tests__/` | Vitest + Testing Library + MSW | 컴포넌트, 훅, Store, Repository |
| E2E | `e2e/` | Playwright (Chromium) | 핵심 사용자 흐름. Throttler 회피를 위해 serial 모드 |

- MSW 핸들러: `src/test/mocks/handlers.ts` — URL은 `*/path` 패턴으로 baseURL에 독립적
- shadcn 컴포넌트(`src/shared/ui/`)는 커버리지 제외 대상
- Query Key 컨벤션: `src/infrastructure/query/README.md` 참조

## shadcn 컴포넌트 추가

```bash
pnpx shadcn@latest add [component-name]
```

`src/shared/ui/` 경로에 생성됩니다. `components.json`에서 경로 설정을 관리합니다.
