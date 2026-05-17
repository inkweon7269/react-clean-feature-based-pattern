# Google OAuth 로그인 — 프론트엔드 구현 체크리스트

> 설계 배경, 흐름, 분기 로직은 [`google-oauth-prd.md`](./google-oauth-prd.md) 참고.
> 4단계 의존성: Phase 1(domain/infra) → Phase 2(콜백/로그인) → Phase 3(프로필 link/unlink) → Phase 4(테스트). Phase 4 일부는 각 Phase와 병행 가능.

---

## 진행 현황

| Phase | 상태 |
|---|---|
| 1. Domain types + infra helpers | ⏳ |
| 2. Callback route + login button | ⏳ |
| 3. ProfileCard link/unlink | ⏳ |
| 4. Tests (단위/컴포넌트/Repository/E2E) | ⏳ |
| 최종 QA (lint/typecheck/test/build) | ⏳ |
| 수동 검증 (백엔드 실연동) | ⏳ 사용자 작업 |

---

## Phase 1: Domain types + Infrastructure helpers

> **이 단계에서 하는 일**: 콜백 결과 타입과 Repository 계약을 먼저 확정해 후속 단계가 타입 안전하게 작업하도록 한다.

### 1.1 Domain

- [ ] `src/domain/auth/entities.ts` — `OAuthCallbackResult` discriminated union 추가
  - `kind: 'login_success'` (tokens 포함)
  - `kind: 'link_success'`
  - `kind: 'error'` × 4 (`email_already_exists` + email / `email_not_verified` / `link_conflict` / `unknown`)
- [ ] `src/domain/auth/repository.ts` — `AuthCommands` 확장
  - `unlinkGoogle(): Promise<void>`
  - `startGoogleLink(): Promise<{ authorizationUrl: string }>`

### 1.2 Infrastructure

- [ ] `src/domain/auth/oauthFragment.ts` 신규 (도메인 레이어 — 외부 의존 없는 순수 TS)
  - `parseOAuthFragment(hash: string): OAuthCallbackResult` Pure 함수
  - `URLSearchParams`로 자동 디코딩 (백엔드가 `encodeURIComponent` 적용)
  - 우선순위: `linked=true` → `error=...` → `accessToken+refreshToken` → `unknown`
- [ ] `src/infrastructure/api/auth/oauthStartUrl.ts` 신규
  - `getGoogleOAuthStartUrl()` — `${VITE_API_BASE_URL}/v1/auth/google` 반환
- [ ] `src/infrastructure/api/auth/AuthApiRepository.ts` 수정
  - `unlinkGoogle()` — `apiClient.delete('/v1/auth/google/unlink')`
  - `startGoogleLink()` — `apiClient.post<{ authorizationUrl: string }>('/v1/auth/google/link')` 후 `data` 반환

### 1.3 MSW 핸들러 추가

- [ ] `src/test/mocks/handlers.ts` 수정
  - `http.delete('*/v1/auth/google/unlink', ...)` — Bearer 검증 후 204 (테스트별 404 override 가능)
  - `http.post('*/v1/auth/google/link', ...)` — Bearer 검증 후 `{ authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...' }`

---

## Phase 2: OAuth Callback route + Login button

> **이 단계에서 하는 일**: 백엔드가 보낸 fragment를 처리해 토큰 저장/라우팅, 그리고 로그인 시작 진입점을 만든다.

### 2.1 features/oauth/

- [ ] `src/features/oauth/useOAuthCallback.ts` 신규
  - `useEffect` + `useRef` 1회 가드
  - `parseOAuthFragment(window.location.hash)`
  - `window.history.replaceState(null, '', window.location.pathname)`로 hash 제거
  - 6분기 라우팅 (PRD §4 참고). `email_not_verified`는 `useAuthStore.getState().isAuthenticated`로 컨텍스트 분기
- [ ] `src/features/oauth/OAuthCallbackHandler.tsx` 신규
  - 처리 중 스피너 (간단한 `<div>처리 중...</div>` 또는 shadcn Spinner)
  - `useOAuthCallback()` 호출

### 2.2 Pages & Router

- [ ] `src/pages/OAuthCallbackPage.tsx` 신규
  - 화면 중앙에 `OAuthCallbackHandler` 마운트
- [ ] `src/router/oauthRoutes.ts` 신규
  - `oauthCallbackRoute`: path `/oauth/callback`, **beforeLoad 없음** (인증 무관)
  - `export const oauthRoutes = [oauthCallbackRoute];`
- [ ] `src/router/index.ts` 수정
  - `routeTree`에 `...oauthRoutes` 등록
- [ ] `src/router/authRoutes.ts` 수정 — `loginRoute.validateSearch`(zod)
  - `error: enum('email_already_exists', 'email_not_verified', 'unknown').optional()`
  - `email: string().email().optional()`

### 2.3 features/login/

- [ ] `src/features/login/GoogleLoginButton.tsx` 신규
  - shadcn Button(variant=outline) `onClick={() => { window.location.href = getGoogleOAuthStartUrl(); }}`
- [ ] `src/features/login/LoginForm.tsx` 수정
  - `useSearch({ from: loginRoute.id })`로 OAuth 에러 알림 카드 렌더 (폼 상단)
    - `email_already_exists` → 안내 + `defaultValues.email = search.email`
    - `email_not_verified` → 안내
    - `unknown` → 일반 안내
  - 폼 하단(또는 OR 구분선 위)에 `<GoogleLoginButton />`
- [ ] `src/features/register/RegisterForm.tsx` 수정 (있으면)
  - `<GoogleLoginButton />` 동일 배치 (백엔드의 신규 가입 분기가 처리)

---

## Phase 3: ProfileCard — Google 계정 연결 / 연결 해제

> **이 단계에서 하는 일**: 인증된 사용자가 본인 프로필에서 Google 계정을 연결/해제할 수 있는 UI를 추가한다.

### 3.1 훅

- [ ] `src/features/profile/useUnlinkGoogle.ts` 신규
  - `useMutation`, `mutationFn: () => repo.unlinkGoogle()`
  - `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['auth'] })`
- [ ] `src/features/profile/useStartGoogleLink.ts` 신규
  - `useMutation`, `mutationFn: () => repo.startGoogleLink()`
  - `onSuccess: ({ authorizationUrl }) => { window.location.href = authorizationUrl; }`

### 3.2 ProfileCard

- [ ] `src/features/profile/ProfileCard.tsx` 수정
  - 기존 사용자 정보 카드 하단에 "Google 계정 관리" 섹션 추가
  - "Google 계정 연결" 버튼 — `useStartGoogleLink()` 호출
  - "Google 계정 연결 해제" 버튼 — `useUnlinkGoogle()` 호출
  - `useSearch({ from: profileRoute.id })` 결과로 알림 표시:
    - `linked === '1'` → 성공 안내
    - `error === 'link_conflict'` → "이미 연결된 계정이거나 본인이 이미 연결됨"
    - `error === 'email_not_verified'` → "Google 이메일이 검증되지 않았습니다"
  - mutation pending/error 상태도 인라인 표시 (404는 unlink, 그 외는 일반 에러)

### 3.3 Router

- [ ] `src/router/authRoutes.ts` 수정 — `profileRoute.validateSearch`(zod)
  - `linked: z.literal('1').optional()`
  - `error: z.enum(['link_conflict', 'email_not_verified']).optional()`

---

## Phase 4: Tests

> **이 단계에서 하는 일**: 자동화 테스트로 회귀 가능성을 줄인다. Phase 1~3과 병행 작성 가능.

### 4.1 단위 테스트

- [ ] `src/features/oauth/__tests__/parseOAuthFragment.test.ts`
  - 정상 토큰 (디코딩 검증)
  - encodeURIComponent된 토큰 (`%3D` padding)
  - `error=email_already_exists&email=user%40example.com` (이메일 디코딩)
  - `error=email_not_verified`
  - `error=link_conflict`
  - `linked=true`
  - 빈 hash / 부분 토큰 / 알 수 없는 키 → `unknown`

### 4.2 컴포넌트/훅 테스트

- [ ] `src/features/oauth/__tests__/useOAuthCallback.test.tsx`
  - 6분기 각각:
    - `setTokens` 호출/미호출 검증
    - `router.navigate` 인자 검증
    - `history.replaceState` 호출 검증
  - `email_not_verified`에서 `isAuthenticated` true/false 분기 검증
  - StrictMode 더블 mount에서 effect 1회만 실행되는지 가드 검증

### 4.3 Repository/MSW 테스트

- [ ] `src/infrastructure/api/auth/__tests__/AuthApiRepository.test.ts` 케이스 추가
  - `unlinkGoogle()` 204 → resolve
  - `unlinkGoogle()` 404 → reject
  - `startGoogleLink()` 200 응답 형태 검증
  - 401 후 자동 refresh 후 재시도 (인터셉터 동작)

### 4.4 E2E (Playwright, serial 모드)

- [ ] `e2e/google-oauth.spec.ts` 신규
  - **로그인 콜백 성공**: `/oauth/callback#accessToken=fake&refreshToken=fake` 직접 navigate → `/`로 redirect, 쿠키 검증, ProfilePage 렌더
  - **로그인 콜백 — email_already_exists**: → `/login?error=...&email=...` + 알림 + prefill
  - **로그인 콜백 — email_not_verified** (미인증) → `/login?error=email_not_verified`
  - **연결 콜백 — linked=true** (인증 컨텍스트) → `/profile?linked=1`
  - **연결 콜백 — link_conflict** → `/profile?error=link_conflict`
  - **연결 콜백 — email_not_verified** (인증 컨텍스트) → `/profile?error=email_not_verified`
  - **시작 버튼**: `/login` → "Google로 계속" 클릭 → `${VITE_API_BASE_URL}/v1/auth/google`로 navigate (외부 차단 후 URL 검증)
  - **연결 해제 — 204**: 인증 상태 → 클릭 → 성공 안내
  - **연결 해제 — 404**: MSW가 404 반환 → 미연결 안내

---

## 최종 QA

- [ ] `pnpm run lint`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run test`
- [ ] `pnpm run test:e2e`
- [ ] `pnpm run build`

---

## 수동 검증 (사용자 작업)

- [ ] 백엔드 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` 발급 + `.env.local` 입력
- [ ] 백엔드 `GOOGLE_FRONTEND_REDIRECT_URL=http://localhost:5173/oauth/callback` 확인
- [ ] 백엔드 `pnpm start:service:local` + 프론트 `pnpm run dev`
- [ ] 케이스 1: `/login` → "Google로 계속" → 신규 가입 → `/`
- [ ] 케이스 2: 동일 Google 계정 재진입 → 즉시 로그인
- [ ] 케이스 3: 다른 이메일로 비번 가입 후 동일 이메일 Google 시도 → 충돌 안내
- [ ] 케이스 4: 인증 상태에서 "Google 연결" → `/profile?linked=1`
- [ ] 케이스 5: 인증 상태에서 "Google 연결 해제" → 204 안내, 한 번 더 → 404 안내

---

## 파일 변경 요약

### 신규 (12개)

| 경로 | 역할 |
|---|---|
| `src/domain/auth/oauthFragment.ts` | hash 파서 (순수 함수) |
| `src/infrastructure/api/auth/oauthStartUrl.ts` | OAuth 시작 URL 빌더 |
| `src/features/login/GoogleLoginButton.tsx` | 로그인 시작 버튼 |
| `src/features/oauth/useOAuthCallback.ts` | 콜백 분기 훅 |
| `src/features/oauth/OAuthCallbackHandler.tsx` | 콜백 페이지 콘텐츠 |
| `src/features/oauth/__tests__/useOAuthCallback.test.tsx` | 6분기 테스트 |
| `src/features/oauth/__tests__/parseOAuthFragment.test.ts` | 파서 단위 테스트 |
| `src/features/profile/useUnlinkGoogle.ts` | 연결 해제 mutation |
| `src/features/profile/useStartGoogleLink.ts` | 연결 시작 mutation |
| `src/pages/OAuthCallbackPage.tsx` | 콜백 라우트 페이지 |
| `src/router/oauthRoutes.ts` | `/oauth/callback` 라우트 |
| `e2e/google-oauth.spec.ts` | Playwright E2E |

### 수정 (8개)

| 경로 | 변경 |
|---|---|
| `src/domain/auth/entities.ts` | `OAuthCallbackResult` 추가 |
| `src/domain/auth/repository.ts` | `unlinkGoogle()`, `startGoogleLink()` 추가 |
| `src/infrastructure/api/auth/AuthApiRepository.ts` | 두 메서드 구현 |
| `src/features/login/LoginForm.tsx` | 에러 알림 + email prefill + GoogleLoginButton |
| `src/features/profile/ProfileCard.tsx` | Google 계정 관리 섹션 |
| `src/router/authRoutes.ts` | `loginRoute`/`profileRoute`의 `validateSearch` |
| `src/router/index.ts` | `oauthRoutes` 등록 |
| `src/test/mocks/handlers.ts` | unlink/link 핸들러 추가 |

### 추가 수정

- `src/infrastructure/api/apiClient.ts` — `ApiError(message, status?)` 클래스 도입, 응답 인터셉터가 모든 에러를 `ApiError`로 reject (status 기반 분기 가능). 토큰 주입/401 refresh/멱등성 동작은 그대로 유지.

### 변경 없음

- `src/infrastructure/store/auth/authStore.ts`
- `src/features/login/useLogin.ts`, `src/features/profile/useLogout.ts`, `src/features/profile/useProfile.ts`
