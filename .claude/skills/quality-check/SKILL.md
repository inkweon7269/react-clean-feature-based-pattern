---
name: quality-check
description: "React 프로젝트의 품질을 종합 검증하는 스킬. 빌드 검증, 타입 체크, 테스트 실행, Clean Architecture 준수 확인, 통합 정합성 검증, react-doctor 진단을 수행한다. '검증해줘', '빌드 확인', '품질 체크', 'QA', 'react-doctor 실행', '코드 검수' 요청 시 반드시 이 스킬을 사용할 것."
---

# Quality Check

프로젝트 품질을 종합 검증하는 체크리스트 기반 스킬.

## 검증 체크리스트

### 1. 빌드 검증
```bash
pnpm run build
```
- [ ] 빌드 성공 (exit code 0)
- [ ] TypeScript 에러 없음
- [ ] 번들 크기 적정 (경고 없음)

### 2. 타입 체크
```bash
pnpm run typecheck  # 또는 pnpm tsc --noEmit
```
- [ ] strict mode 활성화 상태
- [ ] 타입 에러 0건

### 3. 테스트 실행
```bash
pnpm run test
```
- [ ] 모든 테스트 통과
- [ ] domain 테스트 존재 및 통과
- [ ] feature 테스트 존재 및 통과

### 4. Clean Architecture 준수 검증

#### domain/ 순수성 검증
```bash
# domain/ 내에서 외부 라이브러리 import 검색
grep -r "from 'react'" src/domain/ || echo "OK: no React imports"
grep -r "from '@tanstack'" src/domain/ || echo "OK: no TanStack imports"
grep -r "from 'zustand'" src/domain/ || echo "OK: no Zustand imports"
grep -rE "import.*fetch|from 'axios'" src/domain/ || echo "OK: no HTTP imports"
```
- [ ] domain/ 내 외부 라이브러리 import 0건

#### 의존성 방향 검증
- [ ] domain → infrastructure 참조 없음
- [ ] domain → features 참조 없음
- [ ] shared/ui → features 참조 없음

#### features/ 구조 검증
- [ ] features/ 내 하위 폴더는 __tests__만 존재
- [ ] features/ 내 index.ts 배럴 export 없음
- [ ] application/ 레이어 없음

### 5. 통합 정합성 검증

#### Repository Port ↔ Adapter
- [ ] Repository 인터페이스의 모든 메서드가 Adapter에 구현됨
- [ ] 메서드 시그니처 (매개변수 타입, 반환 타입)가 일치

#### Feature Hook ↔ Use Case
- [ ] 각 훅이 올바른 Use Case를 인스턴스화
- [ ] Repository 주입이 올바르게 수행됨
- [ ] React Query 키가 일관되게 사용됨

#### Router ↔ 컴포넌트
- [ ] 모든 라우트에 대응 컴포넌트 존재
- [ ] 라우트 경로와 실제 페이지 매핑 일치

### 6. react-doctor 진단
```bash
pnpx react-doctor@latest
```
- [ ] 불필요한 리렌더링 패턴 없음
- [ ] React Compiler 호환성 문제 없음
- [ ] 훅 규칙 위반 없음

## 검증 결과 리포트 형식

```markdown
# 품질 검증 리포트

## 요약
- 빌드: 통과/실패
- 타입 체크: 통과/실패
- 테스트: N/N 통과
- 아키텍처: 준수/위반
- react-doctor: 이슈 N건

## 상세 결과
### 통과 항목
- ...

### 실패 항목
- [파일:라인] 설명 + 수정 방안

### 미검증 항목
- ...
```

## 점진적 QA (Incremental QA)

전체 완성 후 1회가 아니라, 각 모듈 완성 직후에 검증한다:

1. Domain 레이어 완성 시: 4번(아키텍처 준수) 검증
2. Infrastructure 레이어 완성 시: 5번(통합 정합성) 중 Port↔Adapter 검증
3. Feature 레이어 완성 시: 5번(Hook↔UseCase, Router↔컴포넌트) 검증
4. 전체 완성 시: 1~6번 전체 검증 + react-doctor
