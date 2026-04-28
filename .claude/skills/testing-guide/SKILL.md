---
name: testing-guide
description: "Clean Architecture + Feature-Based React 프로젝트의 테스트 전략 가이드. 레이어별 테스트 방법, 도구 설정, 테스트 작성 패턴을 제공한다. '테스트 어떻게 해야 해', '테스트 전략', '테스트 설정', '커버리지' 요청 시 이 스킬을 사용할 것."
---

# Testing Strategy Guide

Clean Architecture + Feature-Based 패턴에 최적화된 테스트 전략.

## 테스트 피라미드 (이 아키텍처에 맞는)

```
         /  E2E  \          ← Playwright (선택적, 핵심 흐름만)
        /----------\
       / Integration \      ← Feature 테스트 (MSW + Testing Library)
      /----------------\
     /    Unit Tests     \   ← Domain 테스트 (순수 TypeScript)
    /____________________\
```

**핵심 전략: Domain 단위 테스트에 가장 많은 투자**

Clean Architecture의 domain 레이어가 순수 TypeScript이므로, 이 레이어의 테스트가 가장 빠르고 안정적이며 유지보수 비용이 낮다. 비즈니스 로직의 대부분이 여기에 있으므로 투자 대비 효과가 가장 크다.

## 레이어별 테스트 전략

### 1. Domain 단위 테스트 (필수, 최우선)

**대상:** Entity 순수 함수 + Use Case
**도구:** Vitest만 (React 불필요)
**위치:** `src/test/domain/`
**특징:** 외부 의존성 0, mock repository만 사용

| 테스트 대상 | 검증 내용 | 난이도 |
|------------|----------|--------|
| Entity 함수 | validate, filter, transform 동작 | 낮음 |
| Use Case | 비즈니스 로직, repository 호출, 에러 처리 | 낮음 |

**이점:**
- 실행 시간 <1ms/test
- 브라우저/DOM 환경 불필요
- 리팩토링에 강건 (인터페이스 기반)
- 가장 높은 ROI

### 2. Infrastructure 통합 테스트 (권장)

**대상:** API Repository, Zustand Store
**도구:** Vitest + MSW
**위치:** `src/features/{feature}/__tests__/` 또는 별도 infrastructure 테스트
**특징:** HTTP 통신을 MSW로 가로채어 테스트

| 테스트 대상 | 검증 내용 | 난이도 |
|------------|----------|--------|
| API Repository | HTTP 요청/응답 매핑 | 중간 |
| Zustand Store | 상태 변경 로직 | 낮음 |

### 3. Feature 컴포넌트 테스트 (권장)

**대상:** React 컴포넌트 + 커스텀 훅
**도구:** Vitest + Testing Library + MSW
**위치:** `src/features/{feature}/__tests__/`
**특징:** 사용자 관점의 인터랙션 테스트

| 테스트 대상 | 검증 내용 | 난이도 |
|------------|----------|--------|
| 컴포넌트 렌더링 | 올바른 UI 출력 | 중간 |
| 사용자 인터랙션 | 클릭, 입력, 폼 제출 | 중간 |
| 에러 상태 | ErrorBoundary 동작 | 중간 |
| 로딩 상태 | Skeleton/스피너 표시 | 낮음 |

### 4. E2E 테스트 (Playwright)

**대상:** 핵심 사용자 흐름 (로그인, 인증 리다이렉트 등)
**도구:** Playwright
**위치:** `e2e/`
**특징:** 실제 브라우저에서 전체 흐름을 검증

| 테스트 대상 | 검증 내용 | 난이도 |
|------------|----------|--------|
| 라우트 가드 | 비인증 사용자 리다이렉트 | 낮음 |
| 폼 유효성 | 브라우저에서 실제 유효성 에러 표시 | 낮음 |
| 로그인 흐름 | API 호출 → 토큰 저장 → 리다이렉트 | 중간 |
| 인증 상태 | 로컬 스토리지 기반 인증 유지 | 낮음 |

**테스트 분류:**
- **UI 검증:** API에 의존하지 않는 테스트 (리다이렉트, 폼 렌더링, 유효성)
- **API 연동:** 실제 API를 호출하는 테스트 (로그인 성공/실패)

**실행 명령:**
```bash
pnpm run test:e2e        # headless 실행
pnpm run test:e2e:ui     # UI 모드 (디버깅)
```

## 도구 스택 설정

```bash
# 테스트 의존성
pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom msw
```

### vitest 설정 (vite.config.ts 내)

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/features/**', 'src/infrastructure/**'],
      exclude: ['src/shared/ui/**'],  // shadcn 컴포넌트 제외
    },
  },
});
```

### test setup (src/test/setup.ts)

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

## MSW 설정 패턴

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/todos', () => {
    return HttpResponse.json([
      { id: '1', title: '테스트', completed: false },
    ]);
  }),
];

// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

## 커버리지 목표

| 레이어 | 목표 | 이유 |
|--------|------|------|
| domain/ | 90%+ | 순수 비즈니스 로직, 테스트 비용 낮음 |
| infrastructure/ | 70%+ | API 매핑 핵심 경로 |
| features/ | 60%+ | 주요 인터랙션 + 에러 상태 |
| shared/ | 선택적 | shadcn 컴포넌트는 이미 테스트됨 |

## 테스트 명명 규칙

```
{대상}.test.ts(x)
```

- Entity/UseCase: `todo-entity.test.ts`, `create-todo.test.ts`
- Infrastructure: `todoApiRepository.test.ts`, `todoUIStore.test.ts`
- Feature: `TodoList.test.tsx`, `TodoForm.test.tsx`
