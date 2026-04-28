---
name: feature-development
description: "Clean Architecture + Feature-Based 패턴으로 React 기능을 구현하는 워크플로우 스킬. 새 기능 추가, 페이지 생성, API 연동, CRUD 구현 요청 시 반드시 이 스킬을 사용할 것. domain → infrastructure → features 순서로 레이어를 구현하고 테스트를 작성한다."
---

# Feature Development Workflow

Clean Architecture + Feature-Based 패턴으로 새 기능을 구현하는 워크플로우.

## 구현 순서 (의존성 방향에 따라)

### Step 1: Domain 레이어 (순수 TypeScript)

1. **Entity 정의** -- `src/domain/entities/{Name}.ts`
   - 타입/인터페이스 정의
   - 비즈니스 로직 순수 함수 (validate, filter, transform)
   - React, fetch 등 외부 의존성 금지

2. **Repository Port** -- `src/domain/repositories/{Name}Repository.ts`
   - 인터페이스만 정의 (구현체는 infrastructure에)
   - CRUD 메서드 시그니처

3. **Use Case** -- `src/domain/usecases/{ActionName}.ts`
   - 단일 책임: 하나의 비즈니스 액션
   - 생성자에서 Repository 인터페이스 주입
   - execute() 메서드로 실행

4. **Domain 테스트** -- `src/test/domain/{name}.test.ts`
   - Entity 순수 함수 테스트
   - Use Case 테스트 (mock repository 주입)

### Step 2: Infrastructure 레이어 (어댑터)

1. **API Repository** -- `src/infrastructure/api/{Name}ApiRepository.ts`
   - Repository 인터페이스 구현
   - fetch/axios로 HTTP 통신

2. **Query Keys** -- `src/infrastructure/query/{name}QueryKeys.ts`
   - React Query 키 팩토리
   - 일관된 키 구조

3. **Store (필요시)** -- `src/infrastructure/store/{name}UIStore.ts`
   - Zustand UI 상태만 (서버 상태는 React Query)
   - 필터, 정렬, UI 토글 등

### Step 3: Feature 레이어 (React 컴포넌트 + 훅)

1. **커스텀 훅** -- `src/features/{feature}/use{Action}.ts`
   - Use Case + Repository 조합
   - React Query의 useQuery/useMutation 래핑
   - `new UseCase(new ApiRepository())` (react-compiler가 자동 메모이제이션)

2. **컴포넌트** -- `src/features/{feature}/{Name}.tsx`
   - shadcn/ui 기반
   - ErrorBoundary 적용
   - 플랫 구조 (하위 폴더 없음)

3. **Feature 테스트** -- `src/features/{feature}/__tests__/{Name}.test.tsx`
   - @testing-library/react로 사용자 관점 테스트
   - MSW로 API 모킹

### Step 4: 라우팅 연결

1. `src/router.tsx`에 새 라우트 추가
2. TanStack Router의 createRoute/createFileRoute 사용

### Step 5: 검증

1. `pnpm run build` -- 빌드 성공
2. `pnpm run test` -- 테스트 통과
3. domain/ 내 외부 import 0건 확인
4. features/ 플랫 구조 확인

## 의존성 방향 규칙

```
domain (순수) <-- infrastructure (어댑터)
     ^                    ^
     |                    |
features/{name}/ (훅이 usecase + repository 조합)
     |
shared/ui (프레젠테이션)
```

**금지 방향:**
- domain → infrastructure (domain은 어댑터를 모름)
- domain → features (domain은 React를 모름)
- shared/ui → features (shared는 feature에 의존하지 않음)

## 상세 패턴 가이드

상세한 코드 예시와 패턴은 [references/clean-feature-pattern.md](references/clean-feature-pattern.md)를 참조한다.
