---
name: respond-coderabbit
description: CodeRabbit PR 리뷰 코멘트를 자동 분석하고 응답합니다. PR에 CodeRabbit 리뷰가 도착한 후 사용.
argument-hint: '[PR 번호]'
---

# CodeRabbit 리뷰 응답

## Purpose

CodeRabbit이 PR에 남긴 인라인 리뷰 코멘트를 자동으로 처리합니다:

1. **코멘트 수집** — CodeRabbit의 인라인 리뷰 코멘트를 GitHub API로 수집
2. **유효성 분석** — 코드베이스를 분석하여 각 제안의 타당성을 판단
3. **코드 수정** — 타당한 제안은 코드를 수정하고 빌드/테스트 검증 후 커밋
4. **응답 작성** — 각 코멘트에 수정 내용 또는 미수정 사유를 답글로 작성
5. **완료 알림** — 모든 코멘트 처리 후 PR 작성자에게 리뷰 요청 태그

## When to Run

- PR에 CodeRabbit 리뷰가 도착한 후
- 코드 수정 후 새로운 CodeRabbit 코멘트가 추가된 후

## Related Files

| File | Purpose |
| ---- | ------- |
| `CLAUDE.md` | 프로젝트 아키텍처 규칙 (코멘트 분석 시 참조) |
| `docs/GUIDE.md` | Clean Architecture + Feature-Based 가이드 (분류 근거) |
| `.claude/settings.local.json` | 허용된 명령어 확인 (gh api, git 등) |
| `.claude/skills/commit/SKILL.md` | 커밋 스킬 (커밋 메시지 규칙 참조) |
| `docs/coderabbit-review-automation.md` | 자동화 기획 문서 |

## Workflow

### Step 1: PR 정보 확인

**도구:** Bash

인수로 PR 번호가 제공된 경우 해당 PR을 사용합니다. 제공되지 않은 경우 현재 브랜치에서 PR을 자동 감지합니다.

```bash
gh pr view --json number,author,title,url,headRefName
gh repo view --json nameWithOwner --jq '.nameWithOwner'
```

**종료 조건:** 현재 브랜치에 연결된 PR이 없으면 워크플로우를 종료합니다.

---

### Step 2: CodeRabbit 코멘트 수집

**도구:** Bash

CodeRabbit 봇의 인라인 리뷰 코멘트를 수집합니다.

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/{pr_number}/comments" \
  --jq '[.[] | select(.user.login == "coderabbitai[bot]" or .user.login == "coderabbit[bot]")
             | select(.in_reply_to_id == null)
             | {id, path, line, original_line, side, body, created_at, html_url}]'
```

**필터링 조건:**
- `user.login` — `coderabbitai[bot]` 또는 `coderabbit[bot]`
- `in_reply_to_id == null` — 최상위 코멘트만 (답글 제외)

**종료 조건:** 코멘트가 0개이면 워크플로우를 종료합니다.

---

### Step 3: 이미 처리된 코멘트 제외

**도구:** Bash

이미 응답한 코멘트를 제외합니다. 자동 응답에는 `<!-- claude-code-response -->` HTML 마커를 포함하므로, 이 마커가 있는 답글이 존재하는 코멘트는 건너뜁니다.

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/{pr_number}/comments" \
  --jq '[.[] | select(.in_reply_to_id != null) | {id, user: .user.login, body, in_reply_to_id}]'
```

**처리 로직:**

1. Step 2에서 수집한 CodeRabbit 코멘트 ID 목록을 확보
2. 전체 리뷰 코멘트 중 `in_reply_to_id`가 해당 ID와 일치하는 답글을 검색
3. 답글의 `body`에 `<!-- claude-code-response -->` 마커가 포함 → **이미 처리됨**
4. PR 작성자가 수동으로 답글한 코멘트 → **이미 처리됨**

**종료 조건:** 모든 코멘트가 이미 처리되었으면 Step 10으로 이동합니다.

---

### Step 4: 코드베이스 분석 및 분류

**도구:** Read, Grep, Glob

처리되지 않은 각 CodeRabbit 코멘트에 대해:

1. **코멘트 본문 파싱** — 제안 내용, 코드 블록(`suggestion` 포함), 수정 이유를 추출
2. **참조 파일 읽기** — 코멘트의 `path` 필드로 파일을 읽고, `line` 필드로 해당 라인 주변 컨텍스트를 확인
3. **코드베이스 분석** — CLAUDE.md의 아키텍처 규칙, 기존 패턴, 관련 파일을 분석하여 제안의 타당성을 판단

**분류 기준:**

| 분류 | 조건 | 액션 |
|------|------|------|
| **ACCEPT** | 제안이 타당하고 프로젝트 규칙과 일치 | 코드 수정 |
| **PARTIAL** | 제안의 일부만 타당 | 타당한 부분만 수정, 나머지는 설명 |
| **REJECT** | 현재 코드가 의도적 설계이거나 프로젝트 규칙에 부합 | 설명 응답 |
| **SKIP** | 코멘트가 질문, 참고 사항, 또는 칭찬 | 간단한 답변 |

**분류 시 참조하는 프로젝트 규칙 (React Clean Architecture + Feature-Based):**

- **레이어 의존성 방향**: `domain ← infrastructure ← features → shared/ui`. 역방향(domain → infrastructure 등) 위반 제안은 REJECT
- **Domain 순수성**: `src/domain/`은 React/axios/zustand 등 외부 라이브러리 import 금지. 외부 의존 추가 제안은 REJECT
- **UseCase 의사결정**: 단순 Repository 패스스루는 UseCase 미생성. "패스스루 UseCase 추가" 제안은 REJECT
- **Repository ISP**: `Commands` / `Queries` 인터페이스 분리 유지. 통합 인터페이스 제안은 REJECT
- **API 통신**: `/v1` prefix, NestJS 응답 그대로 반환(래퍼 없음), Bearer 자동 주입, 401 자동 refresh, `IDEMPOTENT_ROUTES`로 멱등 헤더 자동 주입. 수동 헤더 설정 제안은 REJECT
- **TypeScript 6 erasableSyntaxOnly**: `private readonly` 대신 `#` private field. 제안에 `private` 사용 시 REJECT
- **React Compiler**: `useMemo`/`useCallback`/`React.memo` 수동 사용 금지. 메모이제이션 추가 제안은 REJECT
- **Features 분리**: 플랫 구조(`__tests__/`만 하위 허용), 배럴 export 금지, feature 간 직접 import 금지. 다른 feature import 제안은 REJECT
- **폼 검증**: react-hook-form + zod 사용. 다른 라이브러리 제안은 REJECT
- **테스트 전략**: Domain은 Vitest 단위, Feature/Infra는 Testing Library + MSW, e2e는 Playwright. shadcn(`src/shared/ui/`)은 커버리지 제외
- **shadcn 컴포넌트**: `src/shared/ui/`에 위치. 수동 변경보다 `pnpx shadcn@latest add` 권장

---

### Step 5: 분류 결과 표시 및 사용자 확인

분석 결과를 테이블로 표시합니다:

```markdown
## CodeRabbit 코멘트 분석 결과

**PR:** #{pr_number} — {title}
**처리 대상:** N개 코멘트 (전체 M개 중)

| # | 파일 | 라인 | 분류 | 요약 |
|---|------|------|------|------|
| 1 | `src/auth/auth.controller.ts` | 42 | ACCEPT | JWT 가드 데코레이터 순서 수정 |
| 2 | `src/auth/auth.service.ts` | 15 | REJECT | 프로젝트 CQRS 패턴에 따라 현재 구조 유지 |
| 3 | `src/auth/dto/login.dto.ts` | 8 | PARTIAL | @IsEmail 추가, @MaxLength는 불필요 |

**코드 수정 예정:** X건
**설명 응답 예정:** Y건
```

`AskUserQuestion`을 사용하여 사용자에게 확인합니다:

1. **전체 진행** — 모든 분류대로 수정 및 응답
2. **개별 확인** — 각 코멘트를 하나씩 검토 후 진행
3. **취소** — 변경 없이 종료

---

### Step 6: 코드 수정

**도구:** Edit, Read

ACCEPT 또는 PARTIAL로 분류된 코멘트에 대해 코드 수정을 적용합니다.

**규칙:**
- CLAUDE.md의 아키텍처 규칙을 준수하여 수정
- 기존 코드 패턴과 일관성 유지
- 수정 내용을 기록 (Step 9 답글 작성에 사용)

---

### Step 7: typecheck/build/test 검증

**도구:** Bash

```bash
pnpm typecheck
pnpm test
pnpm build
```

다음 경우에 한해 e2e도 실행 (NestJS 백엔드 `localhost:3000` 실행 중일 때):

- `src/features/`, `src/pages/`, `src/router/`, `src/infrastructure/api/` 변경
- 또는 사용자가 명시적으로 e2e 실행을 요청한 경우

```bash
pnpm test:e2e
```

**실패 시:** 코드를 되돌리지 않고, 실패 내용을 사용자에게 보고한 뒤 워크플로우를 중단합니다. 코멘트 답글은 작성하지 않습니다 (검증되지 않은 코드에 대해 "수정했습니다"라고 답글하는 것을 방지).

---

### Step 8: 커밋/푸시

**도구:** Bash

코드 수정이 있는 경우에만 실행합니다. 모든 코멘트가 REJECT/SKIP이면 이 단계를 건너뜁니다.

푸시 정책 — 현재 브랜치를 `git branch --show-current`로 확인:
- `main` / `dev` (보호 브랜치) → **푸시 중단**, 사용자에게 안내
- 그 외 작업 브랜치 → `git push`

```bash
git add {변경된 파일 목록}

git commit -m "$(cat <<'EOF'
refactor: CodeRabbit 리뷰 코멘트 반영

- {변경 요약 1}
- {변경 요약 2}

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push
```

---

### Step 9: 코멘트 답글 작성

**도구:** Bash

각 처리된 코멘트에 답글을 작성합니다. 모든 답글의 첫 줄에 `<!-- claude-code-response -->` 마커를 포함합니다.

**ACCEPT (코드 수정됨):**

```bash
gh api "repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies" \
  --method POST \
  -f body="<!-- claude-code-response -->
감사합니다! 제안을 반영했습니다.

**수정 내용:** {구체적인 변경 설명}
**커밋:** {commit_sha}"
```

**PARTIAL (일부 수정):**

```bash
gh api "repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies" \
  --method POST \
  -f body="<!-- claude-code-response -->
제안의 일부를 반영했습니다.

**반영:** {수정한 부분}
**미반영 사유:** {프로젝트 규칙 또는 설계 의도 기반 설명}
**커밋:** {commit_sha}"
```

**REJECT (수정 불필요):**

```bash
gh api "repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies" \
  --method POST \
  -f body="<!-- claude-code-response -->
검토 감사합니다. 현재 코드를 유지합니다.

**사유:** {프로젝트 규칙 또는 설계 의도에 기반한 설명}"
```

**SKIP (질문/참고):**

```bash
gh api "repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies" \
  --method POST \
  -f body="<!-- claude-code-response -->
{질문에 대한 답변 또는 참고 사항에 대한 확인}"
```

---

### Step 10: 반복 안내 또는 완료 알림

코드 수정이 있었고 푸시가 완료된 경우, CodeRabbit 재리뷰 대기 후 `/respond-coderabbit`을 다시 실행하도록 안내합니다.

미처리 코멘트가 0개인 경우, PR 작성자에게 최종 확인을 태그합니다:

```bash
gh pr view {pr_number} --json author --jq '.author.login'

gh api "repos/{owner}/{repo}/issues/{pr_number}/comments" \
  --method POST \
  -f body="<!-- claude-code-response:complete -->
@{author} 모든 CodeRabbit 리뷰 코멘트 처리가 완료되었습니다. 변경 사항을 확인해 주세요.

**처리 요약:**
- 코드 수정: X건
- 설명 응답: Y건
- 관련 커밋: {commit_sha}"
```

## Exceptions

다음은 **처리 대상이 아닙니다**:

1. **PR 요약 코멘트** — CodeRabbit이 PR 전체에 대해 작성하는 요약/워크스루 (issue comment)는 인라인 리뷰 코멘트가 아니므로 제외
2. **이미 답글이 달린 코멘트** — 사용자가 수동으로 답글했거나 `<!-- claude-code-response -->` 마커가 있는 코멘트
3. **Dependabot PR** — CodeRabbit 코멘트가 없는 의존성 업데이트 PR에서 실행하면 "코멘트 없음"으로 종료
4. **머지된 PR** — 이미 머지된 PR에서는 코드 수정/푸시가 불가능하므로 답글만 작성
