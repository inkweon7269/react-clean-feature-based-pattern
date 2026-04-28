---
name: create-pr
description: 작업 브랜치에서 PR을 생성한다. dev 브랜치가 있으면 feat/* → dev → main 흐름, 없으면 feat/* → main으로 폴백한다.
---

# Create PR Skill

작업 브랜치의 변경분을 PR로 올린다. 머지 전략 안내 코멘트는 워크플로우(`.github/workflows/merge-strategy-guide.yml`)가 PR 생성 시 자동으로 달아주므로 PR 본문에는 포함하지 않는다.

## Workflow

1. **현재 브랜치 확인** — `git branch --show-current`
   - `main` / `master` / `dev` → **중단**. 작업 브랜치를 먼저 만들어달라고 안내 (예: `git checkout -b feat/<name>`)

2. **PR 대상 브랜치 결정** — origin의 dev 브랜치 존재 여부로 분기:
   ```bash
   git ls-remote --heads origin dev   # 결과 줄 수로 판단
   ```
   - **dev 존재 + 현재 `feat/*`/`fix/*`/`chore/*`/`refactor/*`/`test/*`/`docs/*`** → base `dev`
   - **dev 존재 + 현재 `dev`가 base와 같지 않은 release 브랜치 등** → 사용자에게 확인
   - **dev 미존재 (현재 정책)** → base `main`으로 폴백
   - 그 외/모호 → 사용자에게 base 브랜치 확인 (AskUserQuestion)

3. **푸시 상태 확인 + 푸시**
   ```bash
   git status                             # working tree clean 확인 (untracked 무관)
   git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null   # upstream 존재 여부
   ```
   - upstream 없음 → `git push -u origin <branch>`
   - upstream 있고 ahead → `git push`
   - 변경 없음 → 그대로 진행

4. **PR 제목/본문 작성** (한국어):
   - **제목**: 70자 이내 conventional 형식. 브랜치명/최근 커밋을 단서로 요약.
     예) `feat(posts): add CRUD UI`, `fix(apiClient): refresh interceptor 단일 큐 보강`
   - **본문 템플릿**:
     ```md
     ## Summary
     - 핵심 변경 1
     - 핵심 변경 2

     ## Test plan
     - [ ] pnpm typecheck
     - [ ] pnpm test
     - [ ] pnpm build
     - [ ] (UI/Repository 변경 시) pnpm test:e2e — 백엔드 localhost:3000 필요

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     ```
   - PR 본문에는 머지 전략 안내를 **넣지 않는다**. `.github/workflows/merge-strategy-guide.yml`이 PR 열릴 때 자동으로 코멘트한다 (dev 대상=Squash, main 대상=Merge commit).

5. **PR 생성** — `gh pr create`. base는 Step 2에서 결정한 값.
   ```bash
   gh pr create --base <target> --title "<title>" --body "$(cat <<'EOF'
   ## Summary
   ...
   EOF
   )"
   ```

6. **결과 보고** — 생성된 PR URL을 사용자에게 반환. PR 등록 직후 자동으로 트리거되는 워크플로우(라벨 자동 부착, merge-strategy 안내, coverage 리포트 등)도 함께 안내.

## 예외 / 가드

- **이미 PR이 존재** — `gh pr view --json url`로 기존 PR URL을 반환하고 종료 (중복 생성 금지)
- **dev 브랜치 정책** — `dev` 자체에서 `main`으로 가는 PR은 작업 브랜치가 아니라 release 흐름. 사용자가 명시 요청한 경우에만 base=`main`으로 진행
- **drafts** — 사용자가 명시 요청하면 `--draft` 플래그 추가
