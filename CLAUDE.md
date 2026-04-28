# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev            # 개발 서버 (http://localhost:5173)
pnpm run build          # TypeScript 체크 + Vite 프로덕션 빌드
pnpm run typecheck      # TypeScript 타입 체크만 (tsc -b --noEmit)
pnpm run lint           # ESLint
pnpm run test           # Vitest 단위/통합 테스트 전체 실행
pnpm run test:watch     # Vitest watch 모드
pnpm run test:coverage  # 커버리지 리포트
pnpm run test:e2e       # Playwright E2E 테스트
pnpm run test:e2e:ui    # Playwright UI 모드 (디버깅)
```

단일 테스트 파일 실행:
```bash
pnpm vitest run src/test/domain/entities.test.ts
pnpm playwright test e2e/auth.spec.ts
```

shadcn 컴포넌트 추가:
```bash
pnpx shadcn@latest add [component-name]  # src/shared/ui/에 생성됨
```

## Architecture

Clean Architecture + Feature-Based 조합 패턴. 의존성 방향: `domain ← infrastructure ← features → shared/ui`

### 레이어 규칙

**`src/domain/{도메인}/`** — 순수 TypeScript. React, axios, zustand 등 외부 라이브러리 import 금지.
- `entities.ts` — 타입 정의 + 비즈니스 로직 순수 함수
- `repository.ts` — 역할별 인터페이스 (Commands, Queries로 분리)
- `usecases/` — 비즈니스 로직이 있는 UseCase만 생성. 단순 CRUD 패스스루는 UseCase 없이 훅에서 repository 직접 사용

**`src/infrastructure/`** — 어댑터 (domain 인터페이스 구현), 도메인별 그룹핑
- `api/apiClient.ts` — 공용 axios 인스턴스 (환경 변수 baseURL, 인증 토큰 interceptor, 공통 에러 처리)
- `api/{도메인}/` — Repository 구현체
- `query/{도메인}/` — React Query 키 팩토리 (계층형 컨벤션, `src/infrastructure/query/README.md` 참조)
- `store/{도메인}/` — Zustand UI 상태 (서버 상태는 React Query)

**`src/features/{feature}/`** — 기능 단위로 분리. 플랫 구조 (하위 폴더는 `__tests__/`만 허용). `index.ts` 배럴 export 금지.
- 컴포넌트 + 커스텀 훅이 같은 레벨에 위치
- 비즈니스 로직이 있는 경우: UseCase를 통해 repository 사용
- 단순 CRUD: 훅에서 repository를 직접 사용
- 여러 feature에서 공유하는 훅은 `src/shared/`에 배치

**`src/pages/`** — 페이지 레이아웃 컴포넌트. features의 컴포넌트를 조합하여 페이지 구성.

**`src/shared/`** — shadcn 컴포넌트 (`ui/`), 유틸리티 (`lib/`), 공용 컴포넌트/훅

### 새 도메인 추가 순서

1. `domain/{도메인}/entities.ts` — Entity + 순수 함수
2. `domain/{도메인}/repository.ts` — Repository 인터페이스 (Commands/Queries 분리)
3. `domain/{도메인}/usecases/` — 비즈니스 로직이 있는 UseCase만
4. `infrastructure/api/{도메인}/` — API Repository 구현
5. `infrastructure/query/{도메인}/` — Query Key Factory (계층형 컨벤션)
6. `infrastructure/store/{도메인}/` — Zustand 상태 (필요 시)
7. `features/{feature}/` — 훅 + 컴포넌트
8. `pages/{Page}.tsx` — 페이지 컴포넌트
9. `router/{도메인}Routes.ts` — 라우트 정의 + `router/index.ts`에 등록

## API 통신

- API 경로 접두사: `/v1` (예: `/v1/auth/login`, `/v1/auth/profile`)
- 서버 응답은 NestJS 표준 응답을 그대로 사용 (래퍼 없음). Repository에서 `data` 그대로 반환
- 인증 토큰은 apiClient의 request interceptor가 쿠키에서 읽어 Bearer 헤더로 자동 주입. Repository에서 수동 헤더 설정 불필요
- 401 응답 시 apiClient의 response interceptor가 refresh token으로 자동 갱신 후 원본 요청을 재시도. 갱신 실패 시 토큰 클리어
- 에러 처리는 apiClient의 response interceptor에서 공통 처리. Repository에서 try/catch 불필요
- 멱등성이 필요한 엔드포인트(현재 `POST /v1/posts`)는 apiClient의 request interceptor가 `IDEMPOTENT_ROUTES` 매칭으로 `Idempotency-Key` 헤더(UUID v4)를 자동 주입. 새 멱등 엔드포인트 추가 시 `apiClient.ts`의 배열에 등록

## 환경 변수

`.env.development`와 `.env.production`에서 `VITE_API_BASE_URL`을 분리. 타입은 `src/vite-env.d.ts`에 정의.

## TypeScript 6 주의사항

- `erasableSyntaxOnly: true` — `private readonly` 사용 불가, `#` private field 사용
- `strict: true` — error 타입은 `unknown`, 반드시 `instanceof` 체크
- `@/*` 경로 별칭 사용 (tsconfig paths + vite alias)

## React Compiler

react-compiler가 적용되어 있으므로 `useMemo`, `useCallback`, `React.memo`를 수동으로 사용하지 않는다. 컴파일러가 자동으로 메모이제이션을 처리한다.

## 테스트 전략

- **Domain 테스트** (`src/test/domain/`) — Entity 순수 함수 테스트, React 환경 불필요. UseCase가 도입되면 mock repository로 단위 테스트 가능
- **Feature/Infra 테스트** (`src/features/{feature}/__tests__/`, `src/infrastructure/**/__tests__/`) — Testing Library + MSW로 컴포넌트/훅/store/repository 테스트
- **E2E 테스트** (`e2e/`) — Playwright (Chromium). 백엔드 Throttler(60초 5회) 회피를 위해 `test.describe.configure({ mode: 'serial' })` 사용
- MSW 핸들러: `src/test/mocks/handlers.ts` — URL은 `*/path` 패턴으로 baseURL 독립적 매칭. NestJS 표준 응답 형식(래퍼 없음)
- shadcn 컴포넌트(`src/shared/ui/`)는 커버리지 제외 대상

## 라우팅

TanStack Router 코드 기반 라우팅 (`src/router/`). 파일 기반 라우팅 아님.
- `router/rootRoute.tsx` — 루트 레이아웃 (ErrorBoundary + Outlet)
- `router/{도메인}Routes.ts` — 도메인별 라우트 정의 + 가드
- `router/index.ts` — routeTree 조합 + createRouter export
- 인증 가드는 `beforeLoad`에서 `useAuthStore.getState()`로 확인
- 인증 토큰은 쿠키에 저장 (zustand persist + js-cookie)
