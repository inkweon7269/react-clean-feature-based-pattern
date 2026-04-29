# Google OAuth 로그인 — 프론트엔드 PRD

> 백엔드(`56-nest-repository-pattern`)의 Google OAuth 5개 엔드포인트가 머지된 상태에서, 본 프론트(`60-react-clean-feature-based-pattern`)에 로그인/연결/해제 UX를 추가한다.
> 단계별 체크리스트는 [`google-oauth-todo.md`](./google-oauth-todo.md) 참고.

---

## 1. 개요

### 1.1 배경

현재 프론트는 이메일/비밀번호 로그인만 지원한다. 가입 마찰을 줄이기 위해 Google OAuth 로그인을 추가하고, 인증 사용자가 본인 계정에 Google 계정을 연결/해제할 수 있는 UI를 제공한다.

### 1.2 목표

- 신규 가입자: Google 동의 한 번으로 가입 + 로그인 완료
- 기존 비번 사용자: 프로필 페이지에서 본인 계정에 Google 연결/해제
- 동일 이메일 충돌, 미검증 이메일 등 에러를 사용자에게 명확히 안내
- 기존 axios 인터셉터(401 자동 refresh, 토큰 주입), zustand auth store, TanStack Router 가드 패턴은 **그대로 재사용**

### 1.3 백엔드 계약 (코드로 확인 완료)

| Method | Path | 인증 | 응답 형태 |
|---|---|---|---|
| GET | `/v1/auth/google` | 무인증 (Throttle) | 302 → Google 동의 화면 |
| GET | `/v1/auth/google/callback` | 무인증 | 302 → `${GOOGLE_FRONTEND_REDIRECT_URL}#...` |
| POST | `/v1/auth/google/link` | `JwtAuthGuard` | 200 JSON `{ authorizationUrl }` |
| GET | `/v1/auth/google/link/callback` | state 토큰 검증 | 302 → `${GOOGLE_FRONTEND_REDIRECT_URL}#...` |
| DELETE | `/v1/auth/google/unlink` | `JwtAuthGuard` | 204 / 404 |

> Link 시작이 `POST + JSON` 패턴인 이유: 브라우저 top-level navigation은 `Authorization` 헤더를 붙일 수 없어 GET + Bearer 조합은 불가. fetch로 Bearer를 보내고 받은 `authorizationUrl`로 `window.location.href` 이동하는 방식.

### 1.4 콜백 fragment 명세

| Fragment | 발생 시점 |
|---|---|
| `#accessToken=<encoded>&refreshToken=<encoded>` | 로그인 성공 (신규/재로그인) |
| `#linked=true` | 연결 성공 |
| `#error=email_already_exists&email=<encoded>` | 로그인: 동일 이메일 비번 사용자 충돌 |
| `#error=email_not_verified` | 로그인 또는 연결: Google 미검증 이메일 |
| `#error=link_conflict` | 연결: 다른 사용자에 이미 연결됐거나 본인이 이미 연결됨 |

> 백엔드가 모든 값에 `encodeURIComponent`를 적용해 전달 (`google-auth.controller.ts:80, 85`). 프론트는 `URLSearchParams`로 자동 디코딩한다.

> `email_not_verified`는 로그인/연결 양쪽에서 올 수 있으므로 `useAuthStore.getState().isAuthenticated`로 컨텍스트를 판별해 라우팅한다.

---

## 2. 사용자 플로우

### 2.1 신규 가입 / 재로그인

```
[/login] "Google로 계속" 클릭
  → window.location.href = `${VITE_API_BASE_URL}/v1/auth/google`
[백엔드 → Google 동의 → 백엔드 callback]
  → /oauth/callback#accessToken=...&refreshToken=...
[/oauth/callback]
  1. URLSearchParams로 hash 파싱
  2. history.replaceState로 hash 즉시 제거 (URL/북마크 노출 방지)
  3. authStore.setTokens(...)
  4. router.navigate({ to: '/' })
```

### 2.2 로그인 에러

| Fragment | UX |
|---|---|
| `email_already_exists&email=...` | `/login?error=email_already_exists&email=...` 이동, 폼 상단 알림 + 이메일 prefill |
| `email_not_verified` (미인증 컨텍스트) | `/login?error=email_not_verified` 이동, 안내 |
| `unknown` / 비정상 hash | `/login?error=unknown` 이동, 일반 안내 |

### 2.3 Google 연결

```
[/profile] "Google 계정 연결" 클릭
  → axios.post('/v1/auth/google/link') (Bearer 자동 주입)
  → 응답 { authorizationUrl: 'https://accounts.google.com/...&state=...' }
  → window.location.href = authorizationUrl
[백엔드 callback → state 검증 → LinkGoogleAccountCommand → fragment redirect]
  → /oauth/callback#linked=true | #error=link_conflict | #error=email_not_verified
[/oauth/callback]
  - linked=true → /profile?linked=1
  - link_conflict → /profile?error=link_conflict
  - email_not_verified (인증 컨텍스트) → /profile?error=email_not_verified
```

### 2.4 Google 연결 해제

```
[/profile] "Google 연결 해제" 클릭
  → DELETE /v1/auth/google/unlink (Bearer 자동 주입)
  → 204: 성공 안내 / 404: "연결된 Google 계정이 없습니다"
```

---

## 3. 아키텍처 설계

기존 Clean Architecture + Feature-Based 조합 패턴 유지. 의존성 방향: `domain ← infrastructure ← features → shared/ui`.

### 3.1 Domain — `src/domain/auth/`

#### `entities.ts`

```ts
export type OAuthCallbackResult =
  | { kind: 'login_success'; tokens: AuthTokens }
  | { kind: 'link_success' }
  | { kind: 'error'; code: 'email_already_exists'; email: string }
  | { kind: 'error'; code: 'email_not_verified' }
  | { kind: 'error'; code: 'link_conflict' }
  | { kind: 'error'; code: 'unknown' };
```

#### `repository.ts`

`AuthCommands`에 두 메서드 추가:

```ts
unlinkGoogle(): Promise<void>;
startGoogleLink(): Promise<{ authorizationUrl: string }>;
```

> Google 로그인 **시작/콜백**은 redirect라 Repository에 담지 않는다 (axios 호출이 아님). unlink와 link 시작은 일반 REST 호출이므로 Repository 인터페이스에 들어간다. 단순 패스스루이므로 UseCase 없이 훅에서 repository 직접 사용.

### 3.2 Infrastructure — `src/infrastructure/`

| 신규/수정 | 파일 | 역할 |
|---|---|---|
| 수정 | `api/auth/AuthApiRepository.ts` | `unlinkGoogle()`/`startGoogleLink()` 구현 |
| 신규 | `api/auth/oauthFragment.ts` | hash 파서 (Pure 함수, `URLSearchParams` + 디코딩) |
| 신규 | `api/auth/oauthStartUrl.ts` | OAuth 시작 URL 빌더 (`VITE_API_BASE_URL` 의존) |

`apiClient.ts` (토큰 주입/401 자동 refresh/멱등성) — **변경 없음**. Google 발급 토큰도 동일 JWT 구조라 그대로 동작.

### 3.3 Features

#### `src/features/login/`

| 파일 | 역할 |
|---|---|
| `GoogleLoginButton.tsx` (신규) | `window.location.href = getGoogleOAuthStartUrl()` 트리거 |
| `LoginForm.tsx` (수정) | `useSearch`로 OAuth 에러 알림 + 이메일 prefill + GoogleLoginButton 렌더 |

`RegisterForm`에도 동일 GoogleLoginButton 노출 — 백엔드의 "신규 가입 분기"가 자동 처리.

#### `src/features/oauth/` (신규 폴더, 플랫 구조)

| 파일 | 역할 |
|---|---|
| `useOAuthCallback.ts` | mount 시 1회 hash 파싱 → 6분기 라우팅 (effect, useRef 가드) |
| `OAuthCallbackHandler.tsx` | 처리 중 스피너 + 훅 호출 |

#### `src/features/profile/`

| 파일 | 역할 |
|---|---|
| `useUnlinkGoogle.ts` (신규) | `repo.unlinkGoogle()` mutation |
| `useStartGoogleLink.ts` (신규) | `repo.startGoogleLink()` mutation, 성공 시 `window.location.href = authorizationUrl` |
| `ProfileCard.tsx` (수정) | "Google 계정 관리" 섹션: 연결 시작 / 연결 해제 + search params 결과 표시 |

### 3.4 Pages & Router

| 파일 | 역할 |
|---|---|
| `pages/OAuthCallbackPage.tsx` (신규) | `OAuthCallbackHandler` 마운트 |
| `router/oauthRoutes.ts` (신규) | `/oauth/callback` 라우트 (가드 없음) |
| `router/index.ts` (수정) | `oauthRoutes` 등록 |
| `router/authRoutes.ts` (수정) | `loginRoute.validateSearch`(zod) — `error`/`email`, `profileRoute.validateSearch` — `linked`/`error` |

### 3.5 환경변수

`VITE_API_BASE_URL` 그대로 사용. 프론트 측 신규 env 없음 (Google client ID는 백엔드만 보유 — Authorization Code Flow 장점).

> 백엔드 `GOOGLE_FRONTEND_REDIRECT_URL=http://localhost:5173/oauth/callback`이 본 PRD의 라우트와 일치하는지 dev/prod 모두 확인.

---

## 4. 콜백 핸들러 6분기 라우팅

`useOAuthCallback`이 마운트 시 다음을 수행:

1. `parseOAuthFragment(window.location.hash)` 호출
2. `window.history.replaceState(null, '', window.location.pathname)` — hash 제거
3. 결과 분기:
   1. `login_success` → `setTokens(tokens)` → `navigate({ to: '/' })`
   2. `link_success` → `navigate({ to: '/profile', search: { linked: '1' } })`
   3. `error.email_already_exists` → `navigate({ to: '/login', search: { error, email } })`
   4. `error.email_not_verified` → `isAuthenticated`로 분기:
      - 인증됨 → `navigate({ to: '/profile', search: { error: 'email_not_verified' } })`
      - 미인증 → `navigate({ to: '/login', search: { error: 'email_not_verified' } })`
   5. `error.link_conflict` → `navigate({ to: '/profile', search: { error: 'link_conflict' } })`
   6. `error.unknown` → `navigate({ to: '/login', search: { error: 'unknown' } })`

`useRef`로 effect 1회 가드 (StrictMode 더블 mount 방어).

---

## 5. 보안 고려

| 항목 | 처리 |
|---|---|
| 토큰의 URL bar 노출 | `history.replaceState`로 fragment 즉시 제거 |
| CSRF | 백엔드 passport `state: true` + signed JWT state 토큰 처리. 프론트 추가 작업 없음 |
| Open redirect | `GOOGLE_FRONTEND_REDIRECT_URL` 단일 환경변수 고정 (백엔드 측) |
| XSS via fragment | `URLSearchParams`로 파싱 후 store에만 저장. innerHTML 등 직접 렌더 X |

---

## 6. 검증

### 6.1 자동화

- **단위 테스트**: `parseOAuthFragment` (7+ 케이스: 정상 / encodeURIComponent 토큰 / 모든 error / `linked=true` / unknown)
- **컴포넌트 테스트**: `useOAuthCallback` 6분기 시나리오 (Memory Router + mock authStore + history.replaceState 검증)
- **Repository 테스트**: `unlinkGoogle()` 204/404, `startGoogleLink()` 200 응답
- **MSW 핸들러**: `DELETE */v1/auth/google/unlink`, `POST */v1/auth/google/link`
- **E2E (Playwright, serial)**: 로그인 콜백 6분기 직접 navigate 검증, "Google로 계속" 버튼 navigate 검증, link/unlink 버튼 동작

### 6.2 수동 (백엔드 실연동)

1. 백엔드 `GOOGLE_CLIENT_ID/SECRET`/`GOOGLE_FRONTEND_REDIRECT_URL` 세팅 후 `pnpm start:service:local`
2. 프론트 `pnpm run dev`
3. 시나리오:
   - `/login` → "Google로 계속" → 신규 가입 진입 확인
   - 동일 Google 계정 재진입 → 즉시 로그인 (DB로 동일 user.id 확인)
   - 다른 이메일로 비번 가입 후 동일 이메일 Google 시도 → `/login`에 충돌 안내
   - 인증 상태에서 "Google 연결 해제" → 204 → 안내, 한 번 더 → 404 → 안내
   - 인증 상태에서 "Google 계정 연결" → 동의 화면 → `/profile?linked=1` 진입

### 6.3 검증 명령

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run build
```

---

## 7. 후속 작업 (본 PRD 범위 외)

- "내 OAuth 연결 상태" GET 엔드포인트가 백엔드에 추가되면 ProfileCard의 link/unlink 버튼을 연결 여부에 따라 조건부 렌더로 개선
- Kakao/Naver 등 멀티 프로바이더 — `getOAuthStartUrl(provider)` 일반화 + 동일 콜백 라우트 재사용
- 토스트 시스템(sonner 등) 도입 후 ProfileCard/LoginForm 알림을 토스트로 전환
- 신규 가입자 onboarding 분기 — 백엔드 응답에 `isNew` 플래그 추가 시 콜백 후 onboarding 페이지로 분기

---

## 8. 백엔드 참고 (코드 위치)

- `apps/service/src/auth/google-auth.controller.ts:42-153` — 5개 엔드포인트
- `apps/service/src/auth/google-link-initiator.service.ts` — `buildAuthorizationUrl(userId)`
- `apps/service/src/auth/dto/response/link-initiate.response.dto.ts` — `LinkInitiateResponseDto`
- `apps/service/src/auth/strategy/google-link.strategy.ts` — state 토큰 검증
- `apps/service/src/auth/command/google-login.handler.ts` — 4분기 분기
- 백엔드 PRD: `apps/56-nest-repository-pattern/docs/google-oauth-prd.md` (특히 §1.4, §1.5)
