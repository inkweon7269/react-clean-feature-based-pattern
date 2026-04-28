---
name: react-project-setup
description: "React CSR 프로젝트 초기 구성을 수행하는 오케스트레이터. pnpm + Vite + TypeScript + shadcn + TanStack Query/Router + zustand + react-error-boundary + react-compiler 스택으로 Clean Architecture + Feature-Based 조합 패턴 프로젝트를 생성한다. '프로젝트 생성', '프로젝트 셋업', '초기 설정', 'React 프로젝트 만들어줘' 요청 시 반드시 이 스킬을 사용할 것."
---

# React Project Setup Orchestrator

React CSR 프로젝트를 Clean Architecture + Feature-Based 조합 패턴으로 초기 구성하는 통합 스킬.

## 실행 모드: 서브 에이전트

## 에이전트 구성

| 에이전트 | subagent_type | 역할 | 출력 |
|---------|--------------|------|------|
| scaffolder | scaffolder | 프로젝트 생성 + 의존성 설치 + 도구 설정 | 실행 가능한 프로젝트 |
| test-engineer | test-engineer | 테스트 인프라 설정 | 테스트 환경 |
| qa-inspector | qa-inspector | 최종 검증 | 검증 리포트 |

## 기술 스택

| 범주 | 도구 | 용도 |
|------|------|------|
| 패키지 매니저 | pnpm | 의존성 관리 |
| 빌드 도구 | Vite | 개발 서버 + 빌드 |
| 언어 | TypeScript (strict) | 타입 안전성 |
| UI 프레임워크 | React 19 | CSR 렌더링 |
| 디자인 시스템 | shadcn/ui (latest) | UI 컴포넌트 |
| 서버 상태 | @tanstack/react-query | 데이터 페칭/캐싱 |
| 라우팅 | @tanstack/react-router | 클라이언트 라우팅 |
| 클라이언트 상태 | zustand | UI 상태 관리 |
| 에러 처리 | react-error-boundary | 에러 경계 |
| 최적화 | react-compiler (babel plugin) | 자동 메모이제이션 |
| 테스트 러너 | vitest | 단위/통합 테스트 |
| 컴포넌트 테스트 | @testing-library/react | 사용자 관점 테스트 |
| API 모킹 | msw | 네트워크 레벨 모킹 |
| 검증 | react-doctor | React 모범 사례 진단 |

## 워크플로우

### Phase 1: 준비
1. 작업 디렉토리 확인
2. pnpm 사용 가능 여부 확인 (없으면 corepack enable)
3. Node.js 버전 확인 (>=18 필요)

### Phase 2: 프로젝트 스캐폴딩

scaffolder 에이전트 실행:

```
Agent(
  description: "React 프로젝트 스캐폴딩",
  subagent_type: "scaffolder",
  model: "opus",
  prompt: "다음 사양으로 React 프로젝트를 생성하라:
    - 경로: {프로젝트 경로}
    - pnpm create vite@latest로 React + TypeScript 템플릿 생성
    - 핵심 의존성 설치 (react-query, react-router, zustand, react-error-boundary)
    - shadcn/ui 최신 버전 초기화
    - react-compiler babel plugin 설정
    - Clean Architecture + Feature-Based 폴더 구조 생성
    - 기본 설정 파일 구성 (tsconfig, vite.config, tailwind 등)
    - 기본 AppProviders, router, App, main 파일 작성"
)
```

**scaffolder 산출물:**
- 프로젝트 디렉토리 + 의존성 설치 완료
- 폴더 구조 + 설정 파일 + 기본 소스 파일

### Phase 3: 테스트 인프라 설정

test-engineer 에이전트 실행:

```
Agent(
  description: "테스트 인프라 설정",
  subagent_type: "test-engineer",
  model: "opus",
  prompt: "프로젝트에 테스트 인프라를 설정하라:
    - vitest + jsdom 환경 설정
    - @testing-library/react, @testing-library/user-event, @testing-library/jest-dom 설치
    - msw 설치 및 핸들러 기본 구조 생성
    - src/test/setup.ts 작성 (Testing Library + MSW 설정)
    - vitest.config.ts 또는 vite.config.ts에 테스트 설정 추가
    - 샘플 테스트 파일 작성 (프로젝트 구조 검증용)"
)
```

### Phase 4: 최종 검증

qa-inspector 에이전트 실행:

```
Agent(
  description: "프로젝트 설정 검증",
  subagent_type: "qa-inspector",
  model: "opus",
  prompt: "프로젝트 초기 설정을 검증하라:
    1. pnpm run build -- 빌드 성공 확인
    2. pnpm run test -- 테스트 통과 확인
    3. Clean Architecture 폴더 구조 검증
    4. domain/ 내 외부 의존성 import 0건 확인
    5. features/ 플랫 구조 확인
    6. TypeScript strict mode 활성화 확인
    7. react-doctor 진단 실행
    8. 검증 결과 리포트 작성"
)
```

## 데이터 흐름

```
[scaffolder] → 프로젝트 구조 + 의존성
      ↓
[test-engineer] → 테스트 인프라 추가
      ↓
[qa-inspector] → 검증 리포트
      ↓
사용자에게 결과 보고
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| pnpm 미설치 | corepack enable 실행 후 재시도 |
| Vite 프로젝트 생성 실패 | 에러 로그 확인, Node.js 버전 점검 |
| shadcn 초기화 실패 | 수동으로 tailwindcss 설정 후 shadcn init 재시도 |
| 빌드 실패 | TypeScript 에러 분석 후 수정 |
| react-doctor 실행 실패 | npx react-doctor@latest로 재시도 |

## 테스트 시나리오

### 정상 흐름
1. 빈 디렉토리에서 시작
2. Phase 2에서 프로젝트 생성 + 의존성 설치
3. Phase 3에서 테스트 인프라 설정
4. Phase 4에서 빌드/테스트/검증 모두 통과
5. 사용자에게 성공 리포트 + 테스트 전략 추천

### 에러 흐름
1. Phase 2에서 shadcn 초기화 실패
2. scaffolder가 tailwindcss 수동 설정 후 재시도
3. 재시도 성공 시 Phase 3 진행
4. Phase 4에서 빌드 실패 시 에러 분석 리포트와 함께 수정 제안
