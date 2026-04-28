# React Clean Architecture + Feature-Based 패턴 가이드

NestJS 백엔드의 `/v1/auth` API와 연동하여 회원가입·로그인·프로필·로그아웃 기능을 처음부터 구현하며 배우는 실전 아키텍처 가이드.

---

## 목차

- [0. 이 문서의 목적과 사용법](#0-이-문서의-목적과-사용법)
- [1. 아키텍처 개요: 왜 이렇게 나누는가](#1-아키텍처-개요-왜-이렇게-나누는가)
- [2. 프로젝트 초기 설정](#2-프로젝트-초기-설정)
- [3. Step 1 — Domain 레이어](#3-step-1--domain-레이어)
- [4. Step 2 — Infrastructure 레이어](#4-step-2--infrastructure-레이어)
- [5. Step 3 — Features 레이어](#5-step-3--features-레이어)
- [6. Step 4 — Pages와 Router](#6-step-4--pages와-router)
- [7. Step 5 — Providers와 앱 진입점](#7-step-5--providers와-앱-진입점)
- [8. Step 6 — 테스트 전략](#8-step-6--테스트-전략)
- [9. 의존성 흐름 총정리](#9-의존성-흐름-총정리)
- [10. 새 기능 추가 시 체크리스트](#10-새-기능-추가-시-체크리스트)
- [11. FAQ: 자주 하는 실수와 해결법](#11-faq-자주-하는-실수와-해결법)

---

## 0. 이 문서의 목적과 사용법

### 이 문서가 다루는 것

이 문서는 **Clean Architecture + Feature-Based 패턴**으로 React 프로젝트를 구성하는 방법을 설명합니다. NestJS 백엔드의 `/v1/auth` API와 연동하여 다음 4가지 기능을 처음부터 만들면서 각 단계에서 "왜 이렇게 하는지"를 함께 설명합니다.

- **회원가입** (`POST /v1/auth/register`)
- **로그인** (`POST /v1/auth/login`) — JWT Access/Refresh 이중 토큰 발급
- **프로필 조회** (`GET /v1/auth/profile`) — Bearer 인증 필요
- **로그아웃** (`POST /v1/auth/logout`) — 서버측 Refresh Token 무효화

문서를 순서대로 따라가면 동작하는 앱이 완성됩니다.

### 사전 요구사항

- Node.js 20 이상
- pnpm (패키지 매니저)
- React와 TypeScript 기본 문법
- NestJS 백엔드 서버가 `http://localhost:3000`에서 실행 중

Clean Architecture나 Feature-Based 패턴은 몰라도 됩니다.

### 기술 스택

| 범주 | 도구 | 역할 |
|------|------|------|
| 빌드 | Vite 8 | 개발 서버 + 프로덕션 빌드 |
| 언어 | TypeScript 6 (strict) | 타입 안전성 |
| UI | React 19 + shadcn/ui | 컴포넌트 렌더링 + 디자인 시스템 |
| 서버 상태 | @tanstack/react-query | API 데이터 캐싱/동기화 |
| 클라이언트 상태 | zustand | 인증 토큰 등 UI 상태 |
| 라우팅 | @tanstack/react-router | 페이지 네비게이션 |
| 폼 검증 | react-hook-form + zod | 폼 상태 관리 + 입력 검증 |
| HTTP | axios | API 호출 |
| 에러 처리 | react-error-boundary | 컴포넌트 에러 격리 |
| 최적화 | React Compiler | 자동 메모이제이션 |
| 단위/통합 테스트 | Vitest + Testing Library + MSW | 컴포넌트/훅/Repository 테스트 |
| E2E 테스트 | Playwright | 브라우저 자동화 테스트 |

---

## 1. 아키텍처 개요: 왜 이렇게 나누는가

### 파일을 아무 데나 두면 어떤 문제가 생기는가

작은 프로젝트에서는 `src/components/LoginForm.tsx` 안에 API 호출, 상태 관리, 타입 정의, UI 렌더링을 모두 넣어도 동작합니다. 하지만 기능이 50개, 100개로 늘어나면:

- API 라이브러리를 `fetch`에서 `axios`로 바꾸려면 모든 컴포넌트를 수정해야 합니다
- 비즈니스 로직을 테스트하려면 React 컴포넌트를 렌더링해야 합니다
- 같은 타입 정의가 여러 파일에 중복됩니다
- 어떤 파일이 어디에 영향을 미치는지 파악하기 어렵습니다

이 문제를 해결하는 방법이 **레이어 분리**입니다.

### 핵심 아이디어: 의존성은 안쪽으로만

Clean Architecture의 핵심 규칙은 하나입니다:

> **바깥쪽 레이어는 안쪽 레이어에 의존할 수 있지만, 안쪽 레이어는 바깥쪽 레이어를 모른다.**

```
┌──────────────────────────────────────────────┐
│  Pages / Router  (가장 바깥)                   │
│  ┌──────────────────────────────────────────┐ │
│  │  Features  (UI 컴포넌트 + 훅)             │ │
│  │  ┌──────────────────────────────────────┐ │ │
│  │  │  Infrastructure  (API, Store, Query) │ │ │
│  │  │  ┌──────────────────────────────────┐ │ │ │
│  │  │  │  Domain  (가장 안쪽, 순수 TS)     │ │ │ │
│  │  │  └──────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

의존성 방향: 바깥 → 안쪽만 허용
```

이 규칙을 지키면:
- `axios`를 `fetch`로 바꿔도 domain 코드는 수정할 필요 없음
- 비즈니스 로직을 React 없이 테스트 가능
- 각 레이어의 책임이 명확해서 코드를 찾기 쉬움

### 4개 레이어의 역할

| 레이어 | 한 줄 요약 | 알 수 있는 것 | 모르는 것 |
|--------|-----------|-------------|----------|
| **Domain** | 비즈니스 규칙 | 자기 자신만 | React, axios, zustand 등 모든 외부 도구 |
| **Infrastructure** | 외부 세계와 연결 | Domain의 인터페이스 | Features, Pages |
| **Features** | 사용자가 보는 기능 | Domain + Infrastructure | 다른 Feature |
| **Pages/Router** | 화면 조합 + 네비게이션 | Features | - |

추가로 **Shared** 레이어가 있습니다. 여러 Feature에서 공유하는 UI 컴포넌트(shadcn)와 유틸리티를 담습니다.

### 최종 디렉토리 구조

```
src/
├── domain/                   ← 순수 TypeScript (외부 import 금지)
│   ├── common/               ← 도메인 횡단 공통 타입
│   │   └── pagination.ts     ← PaginationParams, PaginationMeta, PaginatedResult<T>
│   └── auth/                 ← 도메인별 폴더
│       ├── entities.ts       ← 타입 + 순수 함수
│       └── repository.ts     ← Commands / Queries 인터페이스
│       (UseCase는 비즈니스 로직이 추가될 때 usecases/ 하위에 생성)
│
├── infrastructure/           ← 외부 도구 사용 (axios, zustand 등)
│   ├── api/apiClient.ts      ← 토큰 주입 + 401 자동 refresh
│   ├── api/auth/AuthApiRepository.ts
│   ├── query/auth/authQueryKeys.ts
│   └── store/auth/authStore.ts
│
├── features/                 ← 기능 단위 (React 컴포넌트 + 훅)
│   ├── login/                ← LoginForm, useLogin, loginSchema
│   ├── register/             ← RegisterForm, useRegister, registerSchema
│   └── profile/              ← ProfileCard, useProfile, useLogout
│
├── pages/                    ← 페이지 레이아웃
├── router/                   ← 라우트 정의 + 가드
├── shared/                   ← 공용 UI(shadcn) + 유틸
├── providers/                ← 앱 프로바이더 설정
└── test/                     ← 테스트 인프라
```

---

## 2. 프로젝트 초기 설정

### 프로젝트 생성

```bash
pnpm create vite@latest my-project -- --template react-ts
cd my-project
```

### 의존성 설치

```bash
# 핵심 의존성
pnpm add @tanstack/react-query @tanstack/react-router zustand react-error-boundary
pnpm add axios react-hook-form zod @hookform/resolvers js-cookie

# 개발 의존성
pnpm add -D @tanstack/react-router-devtools @types/js-cookie
pnpm add -D @rolldown/plugin-babel babel-plugin-react-compiler
pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom msw
pnpm add -D @playwright/test
```

### TypeScript 설정

```jsonc
// tsconfig.app.json
{
  "compilerOptions": {
    "strict": true,                 // 엄격한 타입 체크
    "erasableSyntaxOnly": true,     // JS 표준 문법만 허용 (아래 설명)
    "paths": { "@/*": ["./src/*"] } // 경로 별칭
  }
}
```

**`erasableSyntaxOnly`란?** TypeScript 6에서 도입된 옵션으로, "타입을 지우기만 하면 바로 유효한 JavaScript가 되는 코드만 허용"합니다. 이 때문에 `private readonly` 대신 JavaScript 표준인 `#` private field를 사용합니다:

```typescript
// ❌ erasableSyntaxOnly에서 사용 불가
class SomeUseCase {
  private readonly repository: AuthRepository;
}

// ✅ JavaScript 표준 private field
class SomeUseCase {
  #repository: AuthRepository;
}
```

### Vite 설정

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }), // React Compiler 활성화
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**React Compiler가 활성화되면** `useMemo`, `useCallback`, `React.memo`를 수동으로 사용하지 않아도 됩니다. 컴파일러가 빌드 시 자동으로 메모이제이션을 적용합니다.

### 환경 변수

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000
```

```bash
# .env.production
VITE_API_BASE_URL=http://localhost:3000
```

```typescript
// src/vite-env.d.ts — 환경 변수 타입 선언
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 백엔드 명세 (NestJS `/v1/auth`)

이 가이드는 다음 백엔드 API를 전제로 합니다.

| 메서드 | 경로 | 설명 | 인증 | 응답 |
|---|---|---|---|---|
| POST | `/v1/auth/register` | 회원가입 | ❌ | `{ id: number }` |
| POST | `/v1/auth/login` | 로그인 | ❌ | `{ accessToken, refreshToken }` |
| POST | `/v1/auth/refresh` | 토큰 갱신 | ❌ | `{ accessToken, refreshToken }` |
| GET | `/v1/auth/profile` | 프로필 조회 | ✅ Bearer | `{ id, email, name, createdAt, updatedAt }` |
| POST | `/v1/auth/logout` | 로그아웃 | ✅ Bearer | 204 No Content |

**핵심 특징:**
- 응답 본문이 그대로 데이터 (NestJS 표준 응답). Repository에서 `data` 그대로 반환
- Bearer Token(JWT) 인증. Access Token 기본 15분, Refresh Token 기본 7일
- Refresh Token은 SHA256 + bcrypt로 DB에 저장 → 서버측 무효화 가능
- 회원가입/로그인은 Throttler로 1초 2회, 60초 5회 제한

---

## 3. Step 1 — Domain 레이어

Domain은 이 프로젝트에서 **가장 중요한 레이어**입니다. 비즈니스 규칙을 담고 있으며, 다른 모든 레이어가 Domain에 의존합니다.

### 핵심 규칙

> **Domain 폴더 안에서는 React, axios, zustand 등 외부 라이브러리를 절대 import하지 않는다. 순수 TypeScript만 사용한다.**

왜? API 라이브러리가 `axios`에서 다른 것으로 바뀌어도, 상태 관리가 `zustand`에서 `jotai`로 바뀌어도, Domain 코드는 전혀 수정할 필요가 없습니다. 또한 React 환경 없이도 테스트할 수 있습니다.

### 3-1. Entity 정의

Entity는 비즈니스 데이터의 구조(타입)와 비즈니스 규칙(순수 함수)을 정의합니다. NestJS 백엔드의 응답 형태를 그대로 반영합니다.

```typescript
// src/domain/auth/entities.ts

// ─── 타입 정의 ───

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResult {
  id: number;
}

// ─── 비즈니스 규칙 (순수 함수) ───

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;  // 백엔드 RegisterRequestDto와 동일 규칙
}
```

**포인트:**
- `User`, `AuthTokens`, `LoginCredentials`, `RegisterCredentials`, `RegisterResult`는 NestJS 백엔드의 DTO를 그대로 반영합니다
- `isValidPassword`는 8자 이상 — 백엔드 `RegisterRequestDto.password`의 `@MinLength(8)`과 일치시킵니다. 프론트와 백엔드가 같은 규칙을 가지면 사용자가 백엔드 검증에 걸리지 않고 프론트에서 미리 막을 수 있습니다
- `isValidEmail`, `isValidPassword`는 **순수 함수**입니다 — 같은 입력에 항상 같은 결과를 반환하고, 외부 상태를 변경하지 않습니다
- `import` 문이 없습니다. 외부 의존성 0개

### 3-2. Repository 인터페이스

Repository는 "데이터를 어떻게 가져오고 저장하는가"의 **계약(인터페이스)**을 정의합니다. 구현은 하지 않습니다.

```typescript
// src/domain/auth/repository.ts
import type {
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  RegisterResult,
  User,
} from './entities';

export interface AuthCommands {
  register(credentials: RegisterCredentials): Promise<RegisterResult>;
  login(credentials: LoginCredentials): Promise<AuthTokens>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(): Promise<void>;
}

export interface AuthQueries {
  getProfile(): Promise<User>;
}

export type AuthRepository = AuthCommands & AuthQueries;
```

**왜 Commands와 Queries를 분리하는가?**

미래에 UseCase를 만들 때 "필요한 것만" 의존하기 위해서입니다. 예를 들어 "로그인 시도 횟수 제한" UseCase를 만든다면 `AuthCommands`만 받으면 되지, `getProfile`까지 알 필요는 없습니다.

```typescript
// ✅ 필요한 것만 의존
class LoginWithRateLimit {
  constructor(repository: AuthCommands) {} // login/register/refresh/logout만
}

// ❌ 불필요한 것까지 노출
class LoginWithRateLimit {
  constructor(repository: AuthRepository) {} // getProfile도 보임 — 불필요
}
```

### 3-3. UseCase는 언제 만드는가

UseCase는 "사용자가 시스템으로 할 수 있는 하나의 행동"을 표현하는 클래스입니다. **이 프로젝트의 Auth 도메인에는 UseCase가 없습니다.** 왜?

```
이 기능에 UseCase가 필요한가?

질문: Repository 메서드를 호출하는 것 외에 추가 로직이 있는가?
├── Yes → UseCase 생성
│   예: 로그인 시도 횟수 제한, 이메일 정규화, 감사 로그, 여러 API 조합 등
│
└── No → UseCase 없이 훅에서 repository를 직접 사용 (현재 케이스)
    예: 회원가입, 로그인, 프로필 조회, 로그아웃 — 모두 단순 패스스루
```

**현재 5개 엔드포인트는 모두 "API 호출 → 결과 반환"의 단순 패스스루**라서, UseCase를 만들면 그저 한 줄짜리 wrapper가 될 뿐 가치가 없습니다. 패스스루 UseCase는 코드만 늘리고 추가하는 것이 없습니다.

추가 비즈니스 로직이 생기는 시점에 UseCase를 도입하면 됩니다. 예를 들어 주문 도메인에서 "주문 생성 시 재고를 검증하고, 사용 가능한 쿠폰을 조회해 할인을 적용한 뒤 주문 Repository에 저장한다" 같은 로직은 다음과 같이 UseCase로 분리합니다.

```typescript
// 예시: src/domain/orders/usecases/CreateOrder.ts
import type { Order, OrderDraft } from '../entities';
import type { OrderCommands, OrderQueries } from '../repository';
import type { InventoryQueries } from '@/domain/inventory/repository';
import type { CouponQueries } from '@/domain/coupon/repository';

export class CreateOrder {
  #orderCommands: OrderCommands;
  #orderQueries: OrderQueries;
  #inventory: InventoryQueries;
  #coupons: CouponQueries;

  constructor(
    orderCommands: OrderCommands,
    orderQueries: OrderQueries,
    inventory: InventoryQueries,
    coupons: CouponQueries,
  ) {
    this.#orderCommands = orderCommands;
    this.#orderQueries = orderQueries;
    this.#inventory = inventory;
    this.#coupons = coupons;
  }

  async execute(draft: OrderDraft): Promise<Order> {
    // 1) 재고 검증 (외부 도메인 의존)
    const stock = await this.#inventory.getStock(draft.productId);
    if (stock < draft.quantity) {
      throw new Error('재고가 부족합니다');
    }

    // 2) 쿠폰 적용 — 비즈니스 정책
    const coupon = draft.couponCode
      ? await this.#coupons.findByCode(draft.couponCode)
      : null;
    const finalPrice = coupon ? draft.price * (1 - coupon.discountRate) : draft.price;

    // 3) 저장
    return this.#orderCommands.create({ ...draft, price: finalPrice });
  }
}
```

이런 UseCase는 **Repository를 단순 호출하는 것을 넘어** 여러 Repository를 조합하고 정책(재고 검증, 할인 적용)을 담고 있어 가치가 있습니다.

`#repository`는 JavaScript의 **진짜 private**입니다. `private` 키워드는 `erasableSyntaxOnly` 모드에서 사용 불가이므로 항상 `#`을 사용합니다.

---

## 4. Step 2 — Infrastructure 레이어

Infrastructure는 Domain에서 정의한 인터페이스를 **구체적인 기술로 구현**하는 레이어입니다. axios, zustand, React Query 같은 외부 도구를 여기서 사용합니다.

### 4-1. axios 클라이언트 (토큰 주입 + 401 자동 refresh)

이 프로젝트에서 가장 중요한 인프라 코드입니다. 모든 API 호출이 공유하는 axios 인스턴스를 만들고, 두 가지 인터셉터를 둡니다.

1. **request 인터셉터**: 매 요청에 Bearer 토큰 주입
2. **response 인터셉터**: 401 응답이면 refresh 토큰으로 갱신 후 자동 재시도

```typescript
// src/infrastructure/api/apiClient.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;       // 401 재시도 중복 방지
  _skipAuth?: boolean;    // refresh 호출 자체에는 토큰 주입 생략
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── 1) 매 요청에 Bearer 토큰 주입 ───
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  const cfg = config as RetriableRequestConfig;
  if (accessToken && !cfg._skipAuth) {
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  return cfg;
});

// ─── 2) 401 자동 refresh (단일 큐) ───
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();
  if (!refreshToken) {
    clearTokens();
    throw new Error('인증이 만료되었습니다');
  }

  try {
    const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
      '/v1/auth/refresh',
      { refreshToken },
      { _skipAuth: true } as RetriableRequestConfig,  // 만료된 access를 보내지 않음
    );
    setTokens(response.data);
    return response.data.accessToken;
  } catch (error) {
    clearTokens();
    throw error;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[] }>) => {
    const originalConfig = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = originalConfig?.url?.includes('/v1/auth/refresh');

    if (status === 401 && originalConfig && !originalConfig._retry && !isRefreshCall) {
      originalConfig._retry = true;
      try {
        // 동시에 401이 여러 번 떨어져도 refresh는 한 번만 호출됨
        refreshPromise ??= performRefresh().finally(() => {
          refreshPromise = null;
        });
        const newAccessToken = await refreshPromise;
        originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalConfig);  // 원본 요청 재시도
      } catch (refreshError) {
        return Promise.reject(refreshError instanceof Error ? refreshError : new Error('인증이 만료되었습니다'));
      }
    }

    // 그 외 에러는 일관된 Error 객체로 변환
    const data = error.response?.data;
    let message = '요청에 실패했습니다';
    if (data?.message) {
      message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return Promise.reject(new Error(message));
  },
);
```

**왜 이렇게 복잡한가요?** 단순히 "401이면 refresh"만 구현하면 다음과 같은 버그가 생깁니다.

| 시나리오 | 단순 구현의 문제 | 단일 큐 해결 |
|---|---|---|
| 페이지 진입 시 동시에 5개 API가 401 | refresh API가 5번 호출됨 — 마지막 한 번만 살아남음, 앞 4개의 새 토큰은 버려짐 | `refreshPromise ??=`로 첫 호출만 진행, 나머지는 같은 Promise를 await |
| refresh 호출 자체가 401 | 무한 루프 | `isRefreshCall` 체크 |
| refresh 후 다시 401 | 같은 요청을 영원히 재시도 | `_retry` 플래그로 1회만 |
| refresh 호출에 만료된 access를 같이 보냄 | 405 또는 검증 실패 | `_skipAuth: true`로 토큰 주입 건너뜀 |

**Idempotency-Key**: 백엔드는 게시글 생성처럼 멱등성이 필요한 엔드포인트에 `Idempotency-Key` 헤더(UUID v4)를 요구합니다. 해당 도메인을 추가할 때는 request 인터셉터에서 메서드/경로 기준으로 자동 주입하는 분기를 두면 깔끔합니다.

### 4-2. Repository 구현

Domain에서 정의한 `AuthRepository` 인터페이스를 실제 HTTP API로 구현합니다. NestJS는 응답에 별도 래퍼가 없으므로 `data`를 그대로 반환합니다.

```typescript
// src/infrastructure/api/auth/AuthApiRepository.ts
import type {
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  RegisterResult,
  User,
} from '@/domain/auth/entities';
import type { AuthRepository } from '@/domain/auth/repository';
import { apiClient } from '../apiClient';

export class AuthApiRepository implements AuthRepository {
  async register(credentials: RegisterCredentials): Promise<RegisterResult> {
    const { data } = await apiClient.post<RegisterResult>('/v1/auth/register', credentials);
    return data;
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/v1/auth/login', credentials);
    return data;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>('/v1/auth/refresh', { refreshToken });
    return data;
  }

  async logout(): Promise<void> {
    await apiClient.post<void>('/v1/auth/logout');
  }

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<User>('/v1/auth/profile');
    return data;
  }
}
```

**포인트:**
- 모든 메서드가 `data`를 그대로 반환합니다 (NestJS 표준 응답)
- 각 메서드에 try/catch가 없습니다 — 에러는 `apiClient`의 response interceptor가 일관된 `Error` 객체로 변환해 던집니다
- 각 메서드에 `Authorization` 헤더 설정이 없습니다 — request interceptor가 자동 주입합니다
- `import` 방향이 **Infrastructure → Domain**입니다. 반대 방향은 절대 없습니다

### 4-3. Query Key Factory

React Query의 캐시를 관리하는 키를 계층적으로 정의합니다.

```typescript
// src/infrastructure/query/auth/authQueryKeys.ts
export const authQueryKeys = {
  all: ['auth'] as const,                                    // auth 전체 무효화
  profile: () => [...authQueryKeys.all, 'profile'] as const, // 프로필만 무효화
};
```

**왜 계층적으로?** 나중에 `queryClient.invalidateQueries({ queryKey: authQueryKeys.all })`로 auth 관련 캐시를 한 번에 무효화할 수 있습니다. 프로필만 무효화하려면 `authQueryKeys.profile()`을 사용합니다.

상세 컨벤션은 `src/infrastructure/query/README.md`를 참고하세요.

### 4-4. 상태 관리 (zustand + 쿠키)

인증 토큰을 관리하는 전역 상태입니다. 브라우저를 새로고침해도 토큰이 유지되도록 쿠키에 저장합니다.

```typescript
// src/infrastructure/store/auth/authStore.ts
import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { AuthTokens } from '@/domain/auth/entities';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (tokens: AuthTokens) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),
      clearTokens: () =>
        set({ accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: (name): StorageValue<AuthState> | null => {
          const value = Cookies.get(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          Cookies.set(name, JSON.stringify(value), { expires: 7, sameSite: 'Lax' });
        },
        removeItem: (name) => {
          Cookies.remove(name);
        },
      },
    },
  ),
);
```

**포인트:**
- `AuthTokens` 타입을 Domain에서 import합니다 (Infrastructure → Domain 방향)
- `persist` 미들웨어로 상태가 변경될 때마다 자동으로 쿠키에 저장/로드
- 커스텀 storage로 `js-cookie`를 연결 — `localStorage` 대신 쿠키 사용. `sameSite: 'Lax'`로 CSRF 위험을 낮추고 7일 후 만료

---

## 5. Step 3 — Features 레이어

Features는 사용자가 실제로 보고 상호작용하는 기능을 담습니다. 각 기능은 독립적인 폴더로 분리합니다.

### 구조 규칙

- 기능 단위로 폴더를 나눕니다 (`login/`, `register/`, `profile/`)
- 각 폴더는 **플랫 구조**입니다 — 하위 폴더는 `__tests__/`만 허용
- `index.ts` 배럴 export를 만들지 않습니다 — tree-shaking 방해, 순환 참조 위험
- 여러 기능에서 공유하는 훅은 `shared/`로 이동합니다

### 5-1. 로그인 기능

#### Zod 스키마 (폼 검증)

```typescript
// src/features/login/loginSchema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

**Domain의 `isValidEmail`/`isValidPassword`와 뭐가 다른가?** 역할이 다릅니다.
- Domain: **비즈니스 규칙** 검증 (순수 함수, 에러 메시지 없음, 서버에서도 같은 규칙 적용 가능)
- Zod 스키마: **UI 폼** 검증 (사용자에게 보여줄 에러 메시지 포함)

로그인 시에는 길이 제약을 굳이 걸지 않아 백엔드 응답에 맡깁니다. 회원가입 폼은 8자 이상을 미리 검사합니다(아래 5-2).

#### 로그인 훅 (UseCase 없이 Repository 직접 사용)

```typescript
// src/features/login/useLogin.ts
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';
import type { LoginCredentials } from '@/domain/auth/entities';

export function useLogin() {
  const repo = new AuthApiRepository();
  const setTokens = useAuthStore((state) => state.setTokens);
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => repo.login(credentials),
    onSuccess: (tokens) => {
      setTokens(tokens);              // 1) 토큰을 쿠키에 저장
      router.navigate({ to: '/' });   // 2) 프로필 페이지로 이동
    },
  });
}
```

**흐름을 따라가 봅시다:**

```
useLogin().mutate({ email, password })
  → AuthApiRepository.login(credentials)        // Infrastructure
    → apiClient.post('/v1/auth/login')           // axios HTTP 호출
      → 서버 응답: { accessToken, refreshToken } // NestJS 표준 응답 (래퍼 없음)
    → return AuthTokens
  → onSuccess:
    → setTokens(tokens)                          // zustand → 쿠키에 저장
    → router.navigate('/')                        // 프로필 페이지로 이동
```

#### 로그인 폼 컴포넌트

```typescript
// src/features/login/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { loginSchema, type LoginFormValues } from './loginSchema';
import { useLogin } from './useLogin';

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useLogin();

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">로그인</CardTitle>
        <CardDescription>이메일과 비밀번호를 입력해주세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">이메일</label>
            <Input id="email" type="email" placeholder="user@example.com" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">비밀번호</label>
            <Input id="password" type="password" placeholder="비밀번호" {...register('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {loginMutation.isError && (
            <p className="text-sm text-destructive">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : '로그인에 실패했습니다'}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || loginMutation.isPending}>
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            아직 계정이 없으신가요?{' '}
            <Link to="/register" className="text-primary underline-offset-4 hover:underline">
              회원가입
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

**포인트:**
- `zodResolver(loginSchema)`: react-hook-form과 zod를 연결
- `errors.email.message`: zod 스키마에서 정의한 에러 메시지가 자동 표시
- `loginMutation.isPending`: 로그인 요청 중일 때 버튼 비활성화 + 텍스트 변경
- `error instanceof Error`: TypeScript strict 모드에서 error 타입은 `unknown`이므로 반드시 타입 체크
- `Link to="/register"`: 회원가입 페이지로 이동

### 5-2. 회원가입 기능

#### Zod 스키마 (백엔드 규칙과 일치)

```typescript
// src/features/register/registerSchema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다'),  // 백엔드 @MinLength(8)과 일치
  name: z.string().min(1, '이름을 입력해주세요'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
```

#### 회원가입 훅

```typescript
// src/features/register/useRegister.ts
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import type { RegisterCredentials } from '@/domain/auth/entities';

export function useRegister() {
  const repo = new AuthApiRepository();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: RegisterCredentials) => repo.register(credentials),
    onSuccess: () => {
      router.navigate({ to: '/login' });  // 회원가입 후 로그인 페이지로
    },
  });
}
```

회원가입 성공 후에는 토큰을 받지 않으므로 store 갱신이 없습니다. 사용자는 다시 로그인 페이지에서 로그인합니다.

#### 회원가입 폼 컴포넌트

```typescript
// src/features/register/RegisterForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { registerSchema, type RegisterFormValues } from './registerSchema';
import { useRegister } from './useRegister';

export function RegisterForm() {
  const {
    register: registerField,  // useForm의 register와 useRegister hook 이름 충돌 방지
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', name: '' },
  });

  const registerMutation = useRegister();
  const onSubmit = (data: RegisterFormValues) => registerMutation.mutate(data);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">회원가입</CardTitle>
        <CardDescription>새 계정을 만들어주세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 이메일 / 이름 / 비밀번호 입력 — 로그인 폼과 동일한 패턴 */}
          {/* 생략: errors.{field}.message 표시, registerField('email') 등 */}

          {registerMutation.isError && (
            <p className="text-sm text-destructive">
              {registerMutation.error instanceof Error
                ? registerMutation.error.message
                : '회원가입에 실패했습니다'}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || registerMutation.isPending}>
            {registerMutation.isPending ? '가입 중...' : '회원가입'}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

**충돌 회피 팁:** `useForm`의 `register`와 `useRegister` 훅 이름이 같으므로 `register: registerField`로 별칭을 줍니다.

### 5-3. 프로필 + 로그아웃 기능

#### 프로필 훅 (UseCase 없이 직접 사용)

```typescript
// src/features/profile/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import { authQueryKeys } from '@/infrastructure/query/auth/authQueryKeys';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

export function useProfile() {
  const repo = new AuthApiRepository();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: authQueryKeys.profile(),
    queryFn: () => repo.getProfile(),
    enabled: isAuthenticated,   // 로그인 상태에서만 호출
  });
}
```

#### 로그아웃 훅 (서버 호출 + 로컬 정리)

```typescript
// src/features/profile/useLogout.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { AuthApiRepository } from '@/infrastructure/api/auth/AuthApiRepository';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

export function useLogout() {
  const repo = new AuthApiRepository();
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => repo.logout(),
    onSettled: () => {
      // 서버 호출 성공/실패 무관하게 항상 로컬 정리
      clearTokens();
      queryClient.clear();
      router.navigate({ to: '/login' });
    },
  });
}
```

**`onSettled`를 쓰는 이유:** 로그아웃 API 호출이 네트워크 오류 등으로 실패해도 사용자 입장에서는 "로그아웃" 동작이 끝나야 합니다. 토큰이 이미 만료된 상태에서 로그아웃을 누르면 401이 떨어질 수 있는데, 그 경우에도 로컬 토큰은 비워야 일관성이 유지됩니다.

#### 프로필 카드 컴포넌트

```typescript
// src/features/profile/ProfileCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Button } from '@/shared/ui/button';
import { useProfile } from './useProfile';
import { useLogout } from './useLogout';

export function ProfileCard() {
  const { data: user, isLoading, error } = useProfile();
  const logoutMutation = useLogout();

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) throw error;       // ErrorBoundary에 위임
  if (!user) return null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">{user.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <span className="text-muted-foreground">이메일: </span>
          <span>{user.email}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">가입일: </span>
          <span>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
        </div>
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**`if (error) throw error`가 뭔가요?** React의 Error Boundary 패턴입니다. 컴포넌트에서 에러를 throw하면, 상위의 `ErrorBoundary` 컴포넌트가 이를 잡아서 에러 UI를 표시합니다. 각 컴포넌트에서 에러 UI를 직접 만들 필요가 없습니다.

### `useLogout`이 `features/profile/`에 있는 이유

로그아웃은 현재 프로필 카드의 한 동작으로만 사용되고, 다른 feature는 호출하지 않습니다. 단일 사용 지점이라면 해당 feature 내부에 두는 것이 응집도가 높습니다.

헤더, 설정 페이지 등 여러 곳에서 로그아웃을 호출하게 되면 그때 `shared/`로 옮깁니다 (YAGNI 원칙).

---

## 6. Step 4 — Pages와 Router

### Pages: 레이아웃만 담당

Page 컴포넌트는 Features의 컴포넌트를 감싸서 페이지 레이아웃을 구성합니다. 비즈니스 로직을 넣지 않습니다.

```typescript
// src/pages/LoginPage.tsx
import { LoginForm } from '@/features/login/LoginForm';

export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <LoginForm />
    </div>
  );
}
```

```typescript
// src/pages/RegisterPage.tsx
import { RegisterForm } from '@/features/register/RegisterForm';

export function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <RegisterForm />
    </div>
  );
}
```

```typescript
// src/pages/ProfilePage.tsx
import { ProfileCard } from '@/features/profile/ProfileCard';

export function ProfilePage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <ProfileCard />
    </div>
  );
}
```

### Router: 도메인별 분리

라우트 정의를 도메인별 파일로 분리하면, 기능이 늘어나도 `router/index.ts`가 비대해지지 않습니다.

```typescript
// src/router/rootRoute.tsx — 루트 레이아웃
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from '@/shared/ErrorFallback';

export const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="container mx-auto py-8 px-4">
          <Outlet />   {/* 자식 라우트가 여기에 렌더링됨 */}
        </div>
      </ErrorBoundary>
    </div>
  ),
});
```

```typescript
// src/router/authRoutes.ts — 인증 관련 라우트
import { createRoute, redirect } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/' }); // 이미 로그인했으면 프로필로
    }
  },
  component: LoginPage,
});

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: RegisterPage,
});

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' }); // 미인증이면 로그인으로
    }
  },
  component: ProfilePage,
});

export const authRoutes = [loginRoute, registerRoute, profileRoute];
```

**`useAuthStore.getState()`란?** zustand의 `useAuthStore`는 React 훅이라서 React 컴포넌트 안에서만 쓸 수 있습니다. 하지만 `beforeLoad`는 React 컴포넌트가 아닙니다. `.getState()`를 쓰면 React 밖에서도 현재 상태를 읽을 수 있습니다.

```typescript
// src/router/index.ts — 라우트 트리 조합
import { createRouter } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { authRoutes } from './authRoutes';

const routeTree = rootRoute.addChildren([...authRoutes]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

**향후 확장:** 게시글 기능을 추가하면 `router/postsRoutes.ts`를 만들고 `index.ts`에서 합칩니다:

```typescript
const routeTree = rootRoute.addChildren([...authRoutes, ...postsRoutes]);
```

---

## 7. Step 5 — Providers와 앱 진입점

### AppProviders

```typescript
// src/providers/AppProviders.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from '@/shared/ErrorFallback';
import { router } from '@/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,  // 60초 동안 캐시 데이터를 "신선"하다고 판단
      retry: 1,               // 실패 시 1회 재시도
    },
  },
});

export function AppProviders() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**중첩 순서가 왜 이런가요?**
1. `ErrorBoundary`: 가장 바깥 — 어디서 에러가 나도 잡을 수 있도록
2. `QueryClientProvider`: React Query가 먼저 준비되어야 훅에서 사용 가능
3. `RouterProvider`: 라우트 컴포넌트 안에서 React Query를 사용하므로 안쪽

### 앱 진입점

```typescript
// src/App.tsx
import { AppProviders } from '@/providers/AppProviders';

export default function App() {
  return <AppProviders />;
}
```

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

---

## 8. Step 6 — 테스트 전략

### 테스트 피라미드

```
         /    E2E    \         ← Playwright (핵심 흐름만, 적은 수)
        /--------------\
       /   Feature 통합  \     ← Testing Library + MSW (중간 수)
      /--------------------\
     /   Domain 단위 테스트   \  ← Vitest (많은 수, 가장 빠름)
    /________________________\
```

| 레이어 | 위치 | 도구 | React 환경 필요 | 속도 |
|--------|------|------|:---:|:---:|
| Domain | `src/test/domain/` | Vitest | 불필요 | 매우 빠름 |
| Feature/Infra | `src/features/*/__tests__/`, `src/infrastructure/**/__tests__/` | Vitest + Testing Library + MSW | 필요 | 보통 |
| E2E | `e2e/` | Playwright | 브라우저 | 느림 |

### 테스트 환경 설정

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'; // DOM assertion 확장 (toBeInTheDocument 등)
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); // MSW 서버 시작
afterEach(() => {
  cleanup();              // React 컴포넌트 정리
  server.resetHandlers(); // MSW 핸들러 초기화
});
afterAll(() => server.close()); // MSW 서버 종료
```

### MSW 핸들러 (NestJS 응답 형식)

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const mockUser = {
  id: 1,
  email: 'user@example.com',
  name: '홍길동',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

export const handlers = [
  // '*/v1/auth/login'의 *는 baseURL 부분을 와일드카드로 매칭
  http.post('*/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'user@example.com' && body.password === 'password123') {
      return HttpResponse.json(mockTokens);  // 래퍼 없음
    }
    return HttpResponse.json(
      { statusCode: 401, message: '이메일 또는 비밀번호가 일치하지 않습니다', error: 'Unauthorized' },
      { status: 401 },
    );
  }),

  http.get('*/v1/auth/profile', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
        { status: 401 },
      );
    }
    return HttpResponse.json(mockUser);  // 래퍼 없음
  }),

  // /v1/auth/register, /v1/auth/refresh, /v1/auth/logout 핸들러는 같은 패턴으로 추가
];
```

### Domain 테스트 (Entity 순수 함수)

```typescript
// src/test/domain/entities.test.ts — React 환경 불필요
import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPassword } from '@/domain/auth/entities';

describe('isValidEmail', () => {
  it('올바른 이메일 형식을 유효하다고 판단한다', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('잘못된 이메일 형식을 유효하지 않다고 판단한다', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('8자 이상의 비밀번호를 유효하다고 판단한다', () => {
    expect(isValidPassword('password')).toBe(true);
  });

  it('8자 미만의 비밀번호를 유효하지 않다고 판단한다', () => {
    expect(isValidPassword('short')).toBe(false);
  });
});
```

**UseCase가 도입되면** mock repository로 단위 테스트를 추가합니다 (현재는 패스스루라 미작성):

```typescript
// 예시: UseCase 도입 시
function createMockRepository(): AuthRepository {
  return {
    register: vi.fn(), login: vi.fn(), refresh: vi.fn(),
    logout: vi.fn(), getProfile: vi.fn(),
  };
}
// const useCase = new SomeUseCase(mockRepo);
// vi.mocked(mockRepo.login).mockResolvedValue(...)
```

### Feature/Infra 테스트

#### Repository 테스트 (MSW로 HTTP 모킹)

```typescript
// src/infrastructure/api/auth/__tests__/AuthApiRepository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthApiRepository } from '../AuthApiRepository';
import { useAuthStore } from '@/infrastructure/store/auth/authStore';

describe('AuthApiRepository', () => {
  const repo = new AuthApiRepository();

  beforeEach(() => {
    useAuthStore.getState().clearTokens();
  });

  it('올바른 자격증명으로 로그인하면 토큰을 반환한다', async () => {
    const result = await repo.login({ email: 'user@example.com', password: 'password123' });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('잘못된 자격증명으로 로그인하면 에러를 던진다', async () => {
    await expect(
      repo.login({ email: 'wrong@email.com', password: 'wrong' }),
    ).rejects.toThrow();
  });

  it('인증된 상태에서 프로필을 조회한다', async () => {
    useAuthStore.getState().setTokens({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
    const user = await repo.getProfile();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
  });
});
```

#### Form 테스트 (TanStack Router memory history)

`Link to="/register"` 같은 라우터 의존성이 있으면 `QueryClientProvider`만으로는 부족합니다. 테스트 전용 메모리 라우터를 만들어 감싸야 합니다.

```typescript
// src/features/login/__tests__/LoginForm.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { LoginForm } from '../LoginForm';

function renderWithRouter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const rootRoute = createRootRoute();
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: LoginForm,
  });
  // 홈/회원가입 라우트도 더미로 등록 — Link to가 가리키는 곳이 없으면 라우터가 에러
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>home</div>,
  });
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/register',
    component: () => <div>register</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([loginRoute, homeRoute, registerRoute]),
    history: createMemoryHistory({ initialEntries: ['/login'] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('LoginForm', () => {
  it('빈 폼 제출 시 유효성 에러를 표시한다', async () => {
    const user = userEvent.setup();
    renderWithRouter();
    await user.click(await screen.findByRole('button', { name: '로그인' }));
    expect(await screen.findByText('이메일을 입력해주세요')).toBeInTheDocument();
  });
});
```

### E2E 테스트 (Playwright + 실제 백엔드)

E2E는 **실제 백엔드(`localhost:3000`)에 연결해 회원가입~로그아웃 흐름**을 검증합니다. Throttler 회피와 충돌 방지가 핵심입니다.

```typescript
// e2e/auth.spec.ts (발췌)
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });  // 같은 IP에서 병렬 호출 방지

const uniqueEmail = () => {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `e2e_${ts}_${rnd}@example.com`;
};

test('회원가입 → 로그인 → 프로필 → 로그아웃', async ({ page }) => {
  const email = uniqueEmail();
  const password = 'password123';

  // 1) 회원가입
  await page.goto('/register');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('이름').fill('홍길동');
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '회원가입' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // 2) 로그인
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/$/);

  // 3) 프로필 → 로그아웃
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
```

**핵심 포인트:**
- `test.describe.configure({ mode: 'serial' })`: 백엔드 Throttler(60초 5회)를 회피하기 위해 직렬 실행
- `uniqueEmail()`: 매 테스트마다 새 사용자를 생성해 충돌 회피
- `playwright.config.ts`의 `webServer`가 dev 서버(`pnpm run dev`)를 자동 시작하므로 별도 실행 불필요

---

## 9. 의존성 흐름 총정리

### 전체 import 그래프

```
main.tsx → App.tsx → AppProviders.tsx
                       ├── router/index.ts
                       │     ├── rootRoute.tsx → shared/ErrorFallback.tsx
                       │     └── authRoutes.ts
                       │           ├── pages/LoginPage.tsx → features/login/LoginForm.tsx
                       │           ├── pages/RegisterPage.tsx → features/register/RegisterForm.tsx
                       │           ├── pages/ProfilePage.tsx → features/profile/ProfileCard.tsx
                       │           └── infrastructure/store/auth/authStore.ts
                       └── @tanstack/react-query (QueryClientProvider)

features/login/useLogin.ts
  ├── infrastructure/api/auth/...        ← Repository (UseCase 없이 직접 사용)
  └── infrastructure/store/auth/...      ← 토큰 저장

features/register/useRegister.ts
  └── infrastructure/api/auth/...        ← Repository

features/profile/useProfile.ts
  ├── infrastructure/api/auth/...        ← Repository
  ├── infrastructure/query/auth/...      ← Query Key
  └── infrastructure/store/auth/...      ← 인증 상태 확인

features/profile/useLogout.ts
  ├── infrastructure/api/auth/...        ← Repository (logout 호출)
  └── infrastructure/store/auth/...      ← 토큰 클리어
```

### 핵심 규칙 재확인

```
✅ Domain은 아무것도 import하지 않는다 (자기 자신의 파일만)
✅ Infrastructure는 Domain을 import한다 (인터페이스/타입)
✅ Features는 Domain + Infrastructure를 import한다
✅ Pages는 Features를 import한다
✅ Router는 Pages + Infrastructure(authStore)를 import한다

❌ Domain → Infrastructure (절대 금지)
❌ Domain → Features (절대 금지)
❌ Feature A → Feature B (절대 금지, 공유는 shared/로)
```

### 로그인 데이터 흐름 (401 자동 refresh 포함)

```
[사용자] 이메일/비밀번호 입력 → 로그인 버튼
    ↓
[LoginForm] react-hook-form + zod 검증
    ↓ (검증 통과)
[useLogin] useMutation.mutate(credentials)
    ↓
[AuthApiRepository] apiClient.post('/v1/auth/login') — Infrastructure
    ↓
[apiClient] 서버 응답 { accessToken, refreshToken } (NestJS 표준, 래퍼 없음)
    ↓
[useLogin onSuccess] setTokens → 쿠키 저장, router.navigate('/')
    ↓
[authRoutes.profileRoute.beforeLoad] isAuthenticated === true → 통과
    ↓
[ProfilePage → ProfileCard → useProfile]
    ↓
[AuthApiRepository] apiClient.get('/v1/auth/profile')
                    (request interceptor가 Bearer 토큰 자동 주입)
    ↓
응답이 200 OK → 사용자 정보 렌더링
응답이 401 → response interceptor:
   ├── refresh 진행 중이면 같은 Promise를 await
   └── 아니면 refresh 호출 → 새 토큰 저장 → 원본 요청 재시도
```

---

## 10. 새 기능 추가 시 체크리스트

이 프로젝트에는 이미 **Posts 도메인**이 위 단계대로 구현되어 있습니다 (auth 도메인과 같은 구조). 새 도메인을 추가할 때는 동일한 순서로 진행하세요. 아래 예시는 실제 Posts 구현을 그대로 인용한 것입니다.

### 1단계: Domain

```
[x] domain/common/pagination.ts — PaginationParams, PaginationMeta,
    PaginatedResult<T> (도메인 횡단 공통 타입. 페이지네이션 필요한 도메인은 재사용)
[x] domain/posts/entities.ts — Post, CreatePostInput, UpdatePostInput,
    PostsPaginationParams (PaginationParams 확장 + 도메인별 필터)
[x] domain/posts/repository.ts — PostsQueries { findAllPaginated, getById }
                                  + PostsCommands { create, update, delete }
[ ] domain/posts/usecases/ — 비즈니스 로직이 있는 것만 생성
    Posts는 모두 패스스루이므로 UseCase 미생성
```

**규칙:** 여러 도메인이 공유하는 타입(페이지네이션 메타, 정렬 옵션 등)은
`domain/common/`에 두고 도메인 entities에서 `extends`로 확장한다. 같은 모양을
도메인마다 중복 정의하지 않는다.

### 2단계: Infrastructure

```
[x] infrastructure/api/posts/PostsApiRepository.ts — 5개 메서드 구현
[x] infrastructure/query/posts/postsQueryKeys.ts — 계층형 query key
    all / lists() / list(params) / details() / detail(id)
[ ] infrastructure/store/posts/ — UI 상태가 필요한 경우만 (필터, 정렬 등)

⚠️ 멱등성이 필요한 엔드포인트(POST /v1/posts)는 apiClient의 request 인터셉터에서
   Idempotency-Key 헤더(UUID v4)를 자동 주입.
   → src/infrastructure/api/apiClient.ts의 IDEMPOTENT_ROUTES 배열에 등록
```

### 3단계: Features + Pages + Router

```
[x] features/posts-list/ — PostsList.tsx, usePosts.ts (페이지네이션 컨트롤 포함)
[x] features/posts-detail/ — PostDetail.tsx, usePost.ts
[x] features/posts-create/ — CreatePostForm.tsx, useCreatePost.ts, createPostSchema.ts
[x] features/posts-edit/ — EditPostForm.tsx, useUpdatePost.ts, useDeletePost.ts,
                            editPostSchema.ts
[x] pages/{PostsList,PostDetail,PostCreate,PostEdit}Page.tsx
[x] router/postsRoutes.ts (4개 라우트, 모두 인증 가드)
[x] router/index.ts 에 postsRoutes 등록
[x] features/profile/ProfileCard.tsx 에 "내 게시글" 진입점 링크 추가
```

여러 feature가 같은 도메인의 데이터를 참조해야 한다면(예: posts-edit이 게시글 데이터를 미리 로드), feature 간 직접 import 대신 **Pages 레이어에서 두 feature를 조합**합니다. 본 프로젝트에서 `PostEditPage`가 `posts-detail/usePost`로 데이터를 가져와 `posts-edit/EditPostForm`에 props로 주입하는 패턴이 그 예시입니다.

### UseCase 의사결정 트리

```
이 기능에 UseCase가 필요한가?

Q: API를 호출하는 것 외에 추가 로직이 있는가?
├── "주문 생성 시 재고를 검증해야 해" → ✅ UseCase 생성
├── "주문 목록을 가져와서 그대로 보여줘" → ❌ 훅에서 직접 repository 사용
├── "주문 금액에 할인을 적용해야 해" → ✅ UseCase 생성
└── "주문 상세를 ID로 조회해" → ❌ 훅에서 직접 repository 사용
```

---

## 11. FAQ: 자주 하는 실수와 해결법

### Q1. Domain에서 zod를 import해서 검증하면 안 되나요?

**안 됩니다.** Domain은 순수 TypeScript만 허용합니다.

- Domain의 `isValidEmail`/`isValidPassword`: **비즈니스 규칙** 검증 (예: 서버에서도 같은 규칙 적용)
- Features의 `loginSchema`/`registerSchema` (zod): **UI 폼** 검증 (에러 메시지 포함, 사용자에게 표시)

같은 "이메일 검증"처럼 보이지만 목적이 다릅니다. 동일한 규칙을 두 곳에 두면 검증이 중복되는 것 같지만, 실제로는 "백엔드가 거부하기 전에 프론트에서 미리 막아주는 안전망" 역할입니다.

### Q2. UseCase를 언제 만들고 언제 안 만드나요?

Repository 메서드를 호출하는 것 **외에** 추가 로직(검증, 변환, 조합, 정책)이 있으면 UseCase를 만듭니다. "API 호출하고 결과 반환"만 하면 UseCase가 패스스루가 되므로 불필요합니다.

이 프로젝트의 Auth 5개 엔드포인트가 모두 패스스루라서 UseCase가 없습니다. 만약 "로그인 시 마지막 접속 시간 기록", "회원가입 후 환영 이메일 트리거" 같은 로직이 추가되면 그때 UseCase를 도입합니다.

### Q3. `#` private field는 왜 쓰나요? `private`을 쓰면 안 되나요?

`tsconfig.app.json`의 `erasableSyntaxOnly: true` 설정 때문입니다. `private`은 TypeScript 전용 문법이라 이 옵션이 켜져 있으면 사용할 수 없습니다. `#`은 JavaScript 표준이므로 허용됩니다.

### Q4. `index.ts` 배럴 export를 만들면 import가 깔끔해지지 않나요?

배럴 export는 tree-shaking(사용하지 않는 코드 제거)을 방해하고, 순환 참조의 원인이 됩니다. import 경로가 조금 길어지더라도 직접 파일을 가리키는 것이 안전합니다:

```typescript
// ✅ 직접 import
import { LoginForm } from '@/features/login/LoginForm';

// ❌ 배럴 export (사용하지 않음)
import { LoginForm } from '@/features/login';
```

### Q5. MSW 핸들러의 `*/v1/auth/login`에서 `*`는 뭔가요?

`*`는 baseURL 부분을 와일드카드로 매칭합니다. 환경(개발/테스트)마다 baseURL이 다를 수 있으므로, 경로(`/v1/auth/login`)만 매칭하면 환경별로 핸들러를 작성할 필요가 없습니다.

### Q6. React Compiler가 있는데 `useMemo`를 쓰면 안 되나요?

React Compiler가 자동으로 메모이제이션을 처리합니다. 수동으로 추가하면 컴파일러의 최적화와 충돌할 수 있고, 코드만 복잡해집니다. 이 프로젝트에서는 `useMemo`, `useCallback`, `React.memo` 모두 사용하지 않습니다.

### Q7. 한 Feature에서 다른 Feature를 import하면 안 되나요?

안 됩니다. Feature 간 직접 의존은 결합도를 높입니다. 공유해야 하는 로직은 `shared/`로 올리거나, Pages 레이어에서 조합하세요:

```typescript
// ❌ Feature → Feature 직접 의존
import { useLogin } from '@/features/login/useLogin'; // profile에서 login을 import

// ✅ 공유 로직은 shared/로 (단, 실제로 여러 곳에서 쓰일 때만)
```

### Q8. 401 자동 refresh는 왜 단일 큐로 만들어야 하나요?

페이지 진입 시 동시에 여러 API가 호출되는 경우가 흔합니다. 모두 같은 access token을 쓰고 있으므로, access token이 만료되었다면 **모두가 동시에 401을 받습니다**. 이때 각자 refresh를 호출하면:

- refresh API가 동시 5번 호출됨
- 마지막 refresh 응답만 store에 저장됨
- 앞서 저장된 새 토큰들은 곧바로 덮어쓰여 무효화됨
- 결국 첫 4개 요청은 무효화된 토큰으로 재시도하다가 다시 401

`refreshPromise`를 모듈 변수에 보관하고 `??=`로 첫 호출만 진행시키면, 동시에 401을 받은 모든 요청이 **같은 Promise를 await**하게 됩니다. refresh는 한 번만 일어나고, 그 결과 토큰으로 모든 요청이 일관되게 재시도됩니다.

### Q9. `useLogout`은 왜 features/profile/에 있나요?

로그아웃이 현재 프로필 카드에서만 호출되기 때문입니다. 단일 사용 지점이라면 해당 feature 내부가 응집도 측면에서 적절합니다.

YAGNI 원칙: 헤더, 설정 페이지 등 여러 곳에서 호출하게 되면 그때 `shared/`로 옮깁니다. 미리 공유 위치에 두지 않습니다.

### Q10. 로그아웃 mutation에 `onSuccess` 대신 `onSettled`를 쓰는 이유는?

서버 호출이 실패해도(예: 토큰이 이미 만료되어 401) 사용자 입장에서는 "로그아웃" 동작이 끝나야 합니다. `onSettled`는 성공/실패 무관하게 항상 실행되므로, 토큰 클리어와 라우팅을 보장합니다.
