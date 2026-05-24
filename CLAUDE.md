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

**`src/domain/common/`** — 도메인 횡단 공통 타입 (예: `PaginationParams`/`PaginationMeta`/`PaginatedResult<T>`). 특정 도메인에 속하지 않는 순수 타입만 둔다.

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

## 폼(Form) 처리

react-hook-form + zod(`zodResolver`)로 작성한다. 필드 바인딩은 한 가지 방식으로 통일한다.

- **네이티브 input/textarea** (텍스트·이메일·비밀번호·제목·내용 등) → `{...register('field')}`
- **체크박스·커스텀 컴포넌트** (shadcn `Checkbox`, 커스텀 멀티셀렉트 등) → `useWatch({ control, name })`로 읽고 `setValue('field', value)`로 쓴다
- **`Controller`는 사용하지 않는다** — `register` + `useWatch`/`setValue` 조합으로 통일 (코드베이스 일관성)
- 에러 표시는 `formState.errors.{field}?.message`

### base-ui Input 초기화 주의

shadcn `Input`(`@base-ui/react`)은 비제어 모드에서 RHF `reset()`/`setValue()`가 **DOM 표시값을 갱신하지 못한다** (react-compiler 조합 이슈). 대부분의 폼은 제출 성공 후 페이지를 이동(언마운트)하므로 무관하지만, **화면에 머무르며 입력란을 비워야 하는 폼**(예: 인라인 생성 폼)은 `reset()`과 함께 입력 요소에 증가하는 `key`를 주어 **remount**로 초기화한다.

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

## 브랜치 정책

### 결정 트리

```text
[1] 원격에 dev 브랜치가 존재하는가?
    ├─ NO  → base = main
    └─ YES → 작업 성격 분류:
              ├─ feat/refactor/chore/docs/test/style/fix(일반)  → base = dev
              └─ hotfix (운영 장애 / 보안 패치 / SLA)            → base = main
```

판정 자동화 명령:
```bash
git ls-remote --heads origin dev | wc -l
# 결과 0 = dev 없음(base=main), 1 = dev 있음(작업 성격으로 분류)
```

### 워크트리 표준 명령

워크트리 생성/정리는 **`start-worktree` / `finish-worktree` 스킬**로 수행한다 (env 복사·`pnpm install`·머지 검증까지 자동화). 수동으로 할 경우:

```bash
branch="feat/{기능명}"
name="$(echo "$branch" | tr '/' '-')"   # e.g. feat-auth-profile-edit
dir=".claude/worktrees/$name"
base="main"  # 또는 "dev" (결정 트리 참조)

git worktree add -b "$branch" "$dir" "origin/$base"
cd "$dir" && pnpm install
```

> **경로 컨벤션**: 워크트리는 레포 내부 **`.claude/worktrees/<name>`** 에 생성한다 (`<name>` = 브랜치명의 슬래시를 dash로 변환). 이 디렉토리는 `.gitignore`에 등록되어 메인 체크아웃의 `git status`를 더럽히지 않는다.

### git-ignored 필수 파일 복사 체크리스트

워크트리 생성 직후 아래 파일을 수동 복사해야 개발 서버가 정상 동작한다. (`start-worktree` 스킬은 자동 복사)

| 파일 | 필수 여부 | 비고 |
|---|---|---|
| `.env.development` | **필수** | Vite dev 서버 API baseURL |
| `.env.production` | **필수** | 프로덕션 빌드 API baseURL |
| `.claude/settings.local.json` | 선택 | Agent Teams 사용 시만 필요 |

```bash
cp .env.development "$dir/"
cp .env.production  "$dir/"
mkdir -p "$dir/.claude" && cp .claude/settings.local.json "$dir/.claude/" 2>/dev/null || true
```

### 단일 에이전트 vs 멀티 에이전트 팀 운영

| 상황 | 권장 패턴 |
|---|---|
| 소규모 수정 (1~2 파일) | 단일 에이전트 (리더 직접) |
| 신규 도메인 추가 | 멀티 에이전트 팀 (시나리오 A), **Phase별 단일 워크트리** 공유 |
| 대형 기능 (Phase 간 완전 독립) | Phase별 별도 워크트리 생성 고려 |

> **멀티 에이전트 팀의 기본 패턴**: 팀원들은 동일 워크트리(`feat/*`)에서 직렬 Phase로 작업.  
> Phase 간 의존성이 없는 대형 기능에서만 Phase별 별도 워크트리를 생성하되,  
> 워크트리 수는 최소화(컨텍스트 분산 방지).

## Agent Teams (실험)

[Claude Code Agent Teams](https://code.claude.com/docs/ko/agent-teams) 실험 기능이 활성화되어 있다. 설정은 개인 단위(`.claude/settings.local.json`)이며 `teammateMode: "tmux"`로 분할 창 모드 사용.

### 에이전트 풀 (8명)
| 에이전트 | 모델 | 역할 |
|---|---|---|
| `scaffolder` | sonnet | 프로젝트 초기 셋업 (1회성) |
| `feature-planner` | sonnet | PRD 작성 + Phase별 task 분해 + 의존성 그래프 |
| `domain-modeler` | opus | `src/domain/` 전담 (entities, repository ports, usecases) |
| `feature-builder` | opus | `infrastructure/` + `features/` + `pages/` + `router/` 구현 |
| `test-engineer` | opus | Vitest + Testing Library + MSW + Playwright |
| `qa-inspector` | sonnet | 빌드/타입/테스트/react-doctor 자동 게이트 |
| `quality-evaluator` | sonnet | Phase 경계 PRD 정합성 평가 (코드 수정 권한 없음) |
| `code-reviewer` | opus | diff 단위 fresh-perspective 리뷰 (자동 거부 패턴 14종 스캔) |

### 권장 팀 구성

**시나리오 A — 신규 도메인 추가 (5명)**
```
리더 (현재 세션)
├─ feature-planner       [Phase 0: PRD + TASKS → shutdown]
├─ domain-modeler        [Phase 1~3: src/domain/{도메인}/]
├─ feature-builder       [Phase 4~9: infra/features/pages/router] (Phase 1~3 의존)
├─ test-engineer         [Phase T: 레이어별 테스트] (각 구현 직후 점진)
└─ quality-evaluator     [각 Phase 경계 평가, 상주]
최종: qa-inspector → code-reviewer (직렬 호출)
```

**시나리오 B — PR/코드 리뷰 (3명)**
```
리더
├─ code-reviewer (Clean Architecture + react-compiler 안티패턴)
├─ code-reviewer (보안 + 입력 검증)
└─ qa-inspector (빌드/타입/테스트 자동 게이트)
```

**시나리오 C — 디버깅 (적대적 4명)**
```
리더
└─ Claude 4명 spawn: 서로 다른 가설 조사, 직접 메시지로 반박 (scientific debate)
```

### 정리 절차
1. 리더 세션에서 `Clean up the team` 요청
2. `tmux ls`로 고아 세션 확인
3. 남아있다면 `tmux kill-session -t <name>`

### 알려진 제한
- 세션당 1팀, 중첩 팀 불가, 리더 고정 (리더십 이전 불가)
- `/resume`·`/rewind`로 in-process 팀원 복원 불가
- 팀원 권한 요청은 리더로 버블업되므로 자주 쓰는 명령은 `permissions.allow`에 사전 등록 권장
